from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import shutil
import urllib.error
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

DEFAULT_PORT = int(os.environ.get('LOCAL_IG_PORT', '8765'))
DEFAULT_PORT_ATTEMPTS = int(os.environ.get('LOCAL_IG_PORT_ATTEMPTS', '100'))
HOST = os.environ.get('LOCAL_IG_HOST', '127.0.0.1')
LOCAL_IG_BOOTSTRAP_DIR = os.environ.get('LOCAL_IG_BOOTSTRAP_DIR', '本地IG')
LOCAL_IG_ROLE_DIRS = ['角色1', '角色2']
LOCAL_IG_OPENER_EXE_NAME = os.environ.get('LOCAL_IG_OPENER_EXE_NAME', '打开本地IG.exe')
STANDARD_SECOND_LEVEL_FOLDERS = [
    '人-合照', '人-摆拍', '人-自拍',
    '住-家', '住-旅店',
    '吃喝', '吃喝-下午茶', '吃喝-办公室', '吃喝-午', '吃喝-宵夜', '吃喝-家', '吃喝-早', '吃喝-早午', '吃喝-晚',
    '备忘-IG', '备忘-客户',
    '工作-出差', '工作-办公室', '工作-饭局',
    '未分类',
    '玩乐', '玩乐-山林', '玩乐-市区', '玩乐-海边',
    '行-出海', '行-地铁', '行-自驾', '行-航班',
]


def has_required_assets(base: Path) -> bool:
    return (base / 'local-ig.html').exists()


def resolve_launch_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def ensure_bootstrap_local_ig(base: Path) -> tuple[Path, list[Path]]:
    root = base / LOCAL_IG_BOOTSTRAP_DIR
    root.mkdir(parents=True, exist_ok=True)

    created_roles: list[Path] = []
    for role in LOCAL_IG_ROLE_DIRS:
        role_dir = root / role
        role_dir.mkdir(parents=True, exist_ok=True)
        for name in STANDARD_SECOND_LEVEL_FOLDERS:
            (role_dir / name).mkdir(parents=True, exist_ok=True)
        created_roles.append(role_dir)

    # Keep a copy of launcher in 本地IG for one-folder usage.
    try:
        if getattr(sys, 'frozen', False):
            src_exe = Path(sys.executable).resolve()
            dst_exe = root / LOCAL_IG_OPENER_EXE_NAME
            if not dst_exe.exists():
                dst_exe.write_bytes(src_exe.read_bytes())
    except Exception:
        pass

    return root, created_roles


def resolve_root() -> Path:
    env_root = os.environ.get('LOCAL_IG_ROOT', '').strip()
    if env_root:
        p = Path(env_root).expanduser()
        if p.exists() and has_required_assets(p):
            return p

    candidates: list[Path] = []

    # In a frozen one-file exe, try bundled extraction dir first.
    if getattr(sys, 'frozen', False):
        mei = getattr(sys, '_MEIPASS', None)
        if mei:
            candidates.append(Path(mei).resolve())
        candidates.append(Path(sys.executable).resolve().parent)

    candidates.append(Path(__file__).resolve().parents[1])
    candidates.append(Path.cwd().resolve())

    for candidate in candidates:
        if has_required_assets(candidate):
            return candidate

    # Last fallback to keep behavior predictable, even when assets are missing.
    return candidates[0]


ROOT = resolve_root()
STATUS_FILE = os.environ.get('LOCAL_IG_STATUS_FILE', '').strip()
NO_BROWSER = os.environ.get('LOCAL_IG_NO_BROWSER', '').strip() == '1'
INSTANCE_LOCK_PORT = int(os.environ.get('LOCAL_IG_INSTANCE_LOCK_PORT', '38765'))
INSTANCE_LOCK_SOCKET: socket.socket | None = None


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        pass

    def _send_json(self, data: dict[str, Any], status: int = 200) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:
        if self.path not in ('/__open_folder__', '/__run_ig_download__'):
            self._send_json({'ok': False, 'error': 'not_found'}, status=404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length).decode('utf-8') if length else '{}'
            data = json.loads(raw)
            if self.path == '/__open_folder__':
                path = str(data.get('path') or '').strip()
                result = open_folder_in_explorer(path)
            else:
                result = run_ig_download(data)
            self._send_json(result, status=200 if result.get('ok') else 400)
        except Exception as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=500)


def make_url(port: int) -> str:
    return f'http://{HOST}:{port}/local-ig.html'


def write_status(state: str, **extra: Any) -> None:
    if not STATUS_FILE:
        return
    payload = {'state': state, **extra}
    try:
        Path(STATUS_FILE).write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    except Exception:
        pass


def is_port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def acquire_instance_lock() -> bool:
    """Prevent duplicate launches by binding a dedicated local lock port."""
    global INSTANCE_LOCK_SOCKET
    lock_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock_sock.bind((HOST, INSTANCE_LOCK_PORT))
        lock_sock.listen(1)
    except OSError:
        try:
            lock_sock.close()
        except Exception:
            pass
        return False
    INSTANCE_LOCK_SOCKET = lock_sock
    return True


def open_existing_server_page() -> bool:
    url = make_url(DEFAULT_PORT)
    if not is_server_healthy(url):
        return False
    try:
        webbrowser.open(url)
        return True
    except Exception:
        return False


def is_server_healthy(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=1.5) as resp:
            if resp.status != 200:
                return False
            content = resp.read(4096).decode('utf-8', errors='ignore')
            return 'btnWelcomeOpen' in content or '<!DOCTYPE html' in content
    except (OSError, urllib.error.URLError, TimeoutError):
        return False


def find_available_port(start_port: int, attempts: int = 30) -> int:
    for port in range(start_port, start_port + attempts):
        if is_port_free(HOST, port):
            return port
    raise OSError(f'找不到可用端口（已尝试 {start_port} ~ {start_port + attempts - 1}）')


def open_folder_in_explorer(path: str) -> dict[str, Any]:
    if not path:
        return {'ok': False, 'error': 'empty_path'}
    try:
        target = Path(path)
    except Exception:
        return {'ok': False, 'error': 'invalid_path'}
    if not target.exists():
        return {'ok': False, 'error': 'not_found', 'path': path}
    try:
        subprocess.Popen(['explorer.exe', str(target)])
        return {'ok': True, 'path': str(target)}
    except Exception as exc:
        return {'ok': False, 'error': str(exc), 'path': str(target)}


def _resolve_python_cmd() -> list[str] | None:
    # Frozen launcher exe is not Python interpreter; prefer system python.
    py = shutil.which('python')
    if py:
        return [py]
    py_launcher = shutil.which('py')
    if py_launcher:
        return [py_launcher, '-3']
    return None


def _resolve_ig_script() -> Path | None:
    candidates = [
        ROOT / 'ig_download.py',
        resolve_launch_dir() / 'ig_download.py',
        Path.cwd() / 'ig_download.py',
    ]
    for path in candidates:
        if path.exists() and path.is_file():
            return path
    return None


def run_ig_download(payload: dict[str, Any]) -> dict[str, Any]:
    username = str(payload.get('username') or '').strip().lstrip('@')
    output = str(payload.get('output') or '').strip()
    sessionid = str(payload.get('sessionid') or '').strip()
    count = int(payload.get('count') or 0)
    use_cookies = bool(payload.get('use_cookies_from_browser'))

    if not username:
        return {'ok': False, 'error': 'missing_username'}
    if not output:
        return {'ok': False, 'error': 'missing_output'}

    out_path = Path(output)
    # Output must be an existing directory; avoid accidental file path usage.
    if out_path.exists() and out_path.is_file():
        return {'ok': False, 'error': 'output_is_file', 'output': str(out_path)}
    try:
        out_path.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        return {'ok': False, 'error': f'cannot_create_output: {exc}'}

    script = _resolve_ig_script()
    if script is None:
        return {'ok': False, 'error': 'ig_script_not_found'}
    py_cmd = _resolve_python_cmd()
    if py_cmd is None:
        return {'ok': False, 'error': 'python_not_found'}

    cmd = [*py_cmd, str(script), username, '--output', str(out_path)]
    if count > 0:
        cmd.extend(['--count', str(count)])
    if sessionid:
        cmd.extend(['--sessionid', sessionid])
    elif use_cookies:
        cmd.extend(['--cookies-from-browser', 'chrome'])

    try:
        creationflags = getattr(subprocess, 'CREATE_NEW_CONSOLE', 0)
        proc = subprocess.Popen(cmd, cwd=str(script.parent), creationflags=creationflags)
        return {'ok': True, 'pid': proc.pid, 'cmd': cmd, 'script': str(script)}
    except Exception as exc:
        return {'ok': False, 'error': f'start_failed: {exc}', 'cmd': cmd}


def main() -> int:
    launch_dir = resolve_launch_dir()
    # If launched from inside "本地IG", do not generate another nested template.
    if launch_dir.name != LOCAL_IG_BOOTSTRAP_DIR:
        try:
            bootstrap_root, role_dirs = ensure_bootstrap_local_ig(launch_dir)
            print(f'[信息] 已确保目录模板: {bootstrap_root}')
            for role_dir in role_dirs:
                print(f'[信息] 已确保角色目录: {role_dir}')
        except Exception as exc:
            print(f'[警告] 创建模板目录失败: {exc}')

    if not acquire_instance_lock():
        print('[信息] 检测到实例锁已存在，尝试复用已运行页面。')
        if open_existing_server_page():
            return 0
        print('[警告] 发现旧实例但页面不可用，将尝试启动新实例。')

    handler = partial(QuietHandler, directory=str(ROOT))

    try:
        port = find_available_port(DEFAULT_PORT, attempts=DEFAULT_PORT_ATTEMPTS)
    except OSError as exc:
        msg = f'[失败] 无法找到可用端口: {exc}'
        print(msg)
        write_status('error', message=msg, requested_port=DEFAULT_PORT)
        return 1

    url = make_url(port)

    try:
        httpd = ThreadingHTTPServer((HOST, port), handler)
    except OSError as exc:
        msg = f'[失败] 无法启动服务器: {exc}'
        print(msg)
        print(f'[提示] 请检查端口 {port} 是否被系统策略或其他程序占用')
        write_status('error', message=msg, port=port, url=url)
        return 1

    print('====== 本地相册服务器 ======')
    print(f'目录: {ROOT}')
    if port != DEFAULT_PORT:
        print(f'端口 {DEFAULT_PORT} 已占用，自动改用: {port}')
    print(f'地址: {url}')
    print('按 Ctrl+C 可停止服务')
    write_status('ready', port=port, url=url)

    if not NO_BROWSER:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n[停止] 服务器已关闭')
    finally:
        httpd.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
