from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import shutil
import zlib
import time
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
BOOTSTRAP_SYNC_FILES = ['ig_download.py', 'xhs_download.py', 'flat_convert.py', 'hhcat_convert.py', 'VERSION']
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
    # Always overwrite to avoid stale nested exe after launcher upgrades.
    try:
        if getattr(sys, 'frozen', False):
            src_exe = Path(sys.executable).resolve()
            dst_exe = root / LOCAL_IG_OPENER_EXE_NAME
            dst_exe.write_bytes(src_exe.read_bytes())
    except Exception:
        pass

    # Sync bundled helper scripts into 本地IG so one-click actions can run there.
    for name in BOOTSTRAP_SYNC_FILES:
        src = ROOT / name
        dst = root / name
        try:
            if src.exists() and src.is_file():
                dst.write_bytes(src.read_bytes())
        except Exception:
            pass

    return root, created_roles


def sync_runtime_files_to_dir(target_dir: Path) -> None:
    """Always sync bundled helper scripts to target_dir (best effort)."""
    for name in BOOTSTRAP_SYNC_FILES:
        src = ROOT / name
        dst = target_dir / name
        try:
            if src.exists() and src.is_file():
                dst.write_bytes(src.read_bytes())
        except Exception:
            pass


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
def default_instance_lock_port() -> int:
    base = 38000
    span = 2000
    launch_dir = str(resolve_launch_dir()).lower()
    offset = zlib.crc32(launch_dir.encode('utf-8')) % span
    return base + offset


INSTANCE_LOCK_PORT = int(os.environ.get('LOCAL_IG_INSTANCE_LOCK_PORT', str(default_instance_lock_port())))
INSTANCE_LOCK_SOCKET: socket.socket | None = None
IG_TASKS: dict[int, dict[str, Any]] = {}


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
        if self.path not in ('/__open_folder__', '/__run_ig_download__', '/__ig_download_status__', '/__run_add_task__'):
            self._send_json({'ok': False, 'error': 'not_found'}, status=404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length).decode('utf-8') if length else '{}'
            data = json.loads(raw)
            if self.path == '/__open_folder__':
                path = str(data.get('path') or '').strip()
                result = open_folder_in_explorer(path)
            elif self.path == '/__ig_download_status__':
                pid = int(data.get('pid') or 0)
                result = get_ig_download_status(pid)
            elif self.path == '/__run_add_task__':
                result = run_add_task(data)
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


def _resolve_script(name: str) -> Path | None:
    candidates = [
        ROOT / name,
        resolve_launch_dir() / name,
        Path.cwd() / name,
    ]
    for path in candidates:
        if path.exists() and path.is_file():
            return path
    return None


def _start_background_task(cmd: list[str], cwd: Path, log_path: Path) -> dict[str, Any]:
    with log_path.open('a', encoding='utf-8', errors='ignore') as logf:
        logf.write(f'\n=== launch {time.strftime("%Y-%m-%d %H:%M:%S")} ===\n')
        logf.flush()
        creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        startupinfo = None
        if hasattr(subprocess, 'STARTUPINFO'):
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= getattr(subprocess, 'STARTF_USESHOWWINDOW', 0)
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            stdout=logf,
            stderr=logf,
            creationflags=creationflags,
            startupinfo=startupinfo,
        )
    IG_TASKS[proc.pid] = {'proc': proc, 'log': str(log_path)}
    return {'ok': True, 'pid': proc.pid, 'cmd': cmd, 'log': str(log_path)}


def run_add_task(payload: dict[str, Any]) -> dict[str, Any]:
    platform = str(payload.get('platform') or '').strip().lower()
    py_cmd = _resolve_python_cmd()
    if py_cmd is None:
        return {'ok': False, 'error': 'python_not_found'}
    launch_dir = resolve_launch_dir()

    try:
        if platform == 'xhs':
            user = str(payload.get('user') or '').strip()
            output = str(payload.get('output') or '').strip()
            count = int(payload.get('count') or 0)
            cookie = str(payload.get('cookie') or '').strip()
            if not user:
                return {'ok': False, 'error': 'missing_user'}
            if not output:
                return {'ok': False, 'error': 'missing_output'}
            out_path = Path(output)
            if not out_path.is_absolute():
                out_path = (launch_dir / out_path).resolve()
            out_path.mkdir(parents=True, exist_ok=True)
            script = _resolve_script('xhs_download.py')
            if script is None:
                return {'ok': False, 'error': 'xhs_script_not_found'}
            cmd = [*py_cmd, str(script), user, '--output', str(out_path)]
            if count > 0:
                cmd.extend(['--count', str(count)])
            if cookie:
                cmd.extend(['--cookie', cookie])
            log_path = out_path / f'xhs_download_{int(time.time())}.log'
            return _start_background_task(cmd, script.parent, log_path)

        if platform in ('flat', 'hhcat'):
            folder = str(payload.get('path') or '').strip()
            dry_run = bool(payload.get('dry_run'))
            if not folder:
                return {'ok': False, 'error': 'missing_path'}
            target = Path(folder)
            if not target.is_absolute():
                target = (launch_dir / target).resolve()
            if not target.exists() or not target.is_dir():
                return {'ok': False, 'error': 'path_not_found', 'path': str(target)}
            script_name = 'flat_convert.py' if platform == 'flat' else 'hhcat_convert.py'
            script = _resolve_script(script_name)
            if script is None:
                return {'ok': False, 'error': f'{platform}_script_not_found'}
            cmd = [*py_cmd, str(script), str(target)]
            if dry_run:
                cmd.append('--dry-run')
            log_path = target / f'{platform}_convert_{int(time.time())}.log'
            return _start_background_task(cmd, script.parent, log_path)

        if platform == 'trans':
            folder = str(payload.get('path') or '').strip()
            lang = str(payload.get('lang') or 'en').strip() or 'en'
            script = _resolve_script('APP - deep-translator.py')
            if script is None:
                return {'ok': False, 'error': 'trans_script_not_found'}
            cmd = [*py_cmd, str(script), '--lang', lang]
            log_dir = resolve_launch_dir()
            if folder:
                target = Path(folder)
                if not target.is_absolute():
                    target = (launch_dir / target).resolve()
                if not target.exists() or not target.is_dir():
                    return {'ok': False, 'error': 'path_not_found', 'path': str(target)}
                cmd.extend(['--folder', str(target)])
                log_dir = target
            log_path = log_dir / f'translate_{int(time.time())}.log'
            return _start_background_task(cmd, script.parent, log_path)

        return {'ok': False, 'error': 'unsupported_platform'}
    except Exception as exc:
        return {'ok': False, 'error': f'start_failed: {exc}'}


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
    if not out_path.is_absolute():
        out_path = (resolve_launch_dir() / out_path).resolve()
    # Output must be an existing directory; avoid accidental file path usage.
    if out_path.exists() and out_path.is_file():
        return {'ok': False, 'error': 'output_is_file', 'output': str(out_path)}
    try:
        out_path.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        return {'ok': False, 'error': f'cannot_create_output: {exc}'}

    # Ensure profile folder and template subfolders exist before downloader starts.
    try:
        profile_dir = out_path / username
        profile_dir.mkdir(parents=True, exist_ok=True)
        role1_candidates = [
            out_path / '角色1',
            out_path.parent / '角色1',
            resolve_launch_dir() / '角色1',
        ]
        role1_dir = next((p for p in role1_candidates if p.exists() and p.is_dir()), None)
        if role1_dir is not None:
            for child in role1_dir.iterdir():
                if child.is_dir():
                    (profile_dir / child.name).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

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
        log_path = out_path / f'ig_download_{username}.log'
        with log_path.open('a', encoding='utf-8', errors='ignore') as logf:
            logf.write(f'\n=== launch {time.strftime("%Y-%m-%d %H:%M:%S")} ===\n')
            logf.flush()
            creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
            startupinfo = None
            if hasattr(subprocess, 'STARTUPINFO'):
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= getattr(subprocess, 'STARTF_USESHOWWINDOW', 0)
            proc = subprocess.Popen(
                cmd,
                cwd=str(script.parent),
                stdout=logf,
                stderr=logf,
                creationflags=creationflags,
                startupinfo=startupinfo,
            )
        IG_TASKS[proc.pid] = {'proc': proc, 'log': str(log_path)}
        time.sleep(0.8)
        ret = proc.poll()
        if ret is not None:
            tail = ''
            try:
                text = log_path.read_text(encoding='utf-8', errors='ignore')
                tail = '\n'.join(text.splitlines()[-6:]).strip()
            except Exception:
                pass
            msg = f'ig_process_exited_immediately(code={ret})'
            if tail:
                msg = f'{msg}: {tail}'
            return {'ok': False, 'error': msg, 'cmd': cmd, 'log': str(log_path)}
        return {
            'ok': True,
            'pid': proc.pid,
            'cmd': cmd,
            'script': str(script),
            'log': str(log_path),
        }
    except Exception as exc:
        return {'ok': False, 'error': f'start_failed: {exc}', 'cmd': cmd}


def get_ig_download_status(pid: int) -> dict[str, Any]:
    task = IG_TASKS.get(pid)
    if not task:
        return {'ok': False, 'error': 'pid_not_found', 'pid': pid}
    proc: subprocess.Popen[Any] = task['proc']
    log_path = Path(task['log'])
    code = proc.poll()
    tail = ''
    try:
        if log_path.exists():
            text = log_path.read_text(encoding='utf-8', errors='ignore')
            tail = '\n'.join(text.splitlines()[-20:])
    except Exception:
        tail = ''
    return {
        'ok': True,
        'pid': pid,
        'running': code is None,
        'exit_code': None if code is None else int(code),
        'log': str(log_path),
        'tail': tail,
    }


def main() -> int:
    launch_dir = resolve_launch_dir()
    exe_name = Path(sys.executable).name if getattr(sys, 'frozen', False) else ''
    is_installer_mode = exe_name == '安装本地IG.exe'
    # Keep runtime helper scripts up to date even when running secondary exe in 本地IG.
    if launch_dir.name == LOCAL_IG_BOOTSTRAP_DIR:
        sync_runtime_files_to_dir(launch_dir)

    # If launched from inside "本地IG", do not generate another nested template.
    if launch_dir.name != LOCAL_IG_BOOTSTRAP_DIR:
        try:
            bootstrap_root, role_dirs = ensure_bootstrap_local_ig(launch_dir)
            print(f'[信息] 已确保目录模板: {bootstrap_root}')
            for role_dir in role_dirs:
                print(f'[信息] 已确保角色目录: {role_dir}')
            if is_installer_mode:
                print('[完成] 安装器模式：仅生成本地IG目录，不自动打开UI。')
                return 0
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
