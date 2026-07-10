from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import shutil
import zlib
import time
import threading
import urllib.error
import urllib.request
import webbrowser
import multiprocessing
from collections import deque
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
BOOTSTRAP_SYNC_FILES = ['ig_download.py', 'xhs_download.py', 'flat_convert.py', 'hhcat_convert.py', 'APP - deep-translator.py', '_common.py', 'VERSION']
STANDARD_SECOND_LEVEL_FOLDERS = [
    '人', '人-合照', '人-自拍', '人-摆拍',
    '工作', '工作-办公室', '工作-出差', '工作-饭局',
    '吃喝', '吃喝-下午茶', '吃喝-办公室', '吃喝-午', '吃喝-早', '吃喝-早午', '吃喝-宵夜', '吃喝-家', '吃喝-晚',
    '行', '行-出海', '行-自驾', '行-航班',
    '住', '住-家', '住-旅店',
    '玩乐', '玩乐-山林', '玩乐-市区', '玩乐-旅行', '玩乐-海边',
    '未分类',
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

    # 💡 外部文件優先：允許用戶在 exe 同級或工作目錄下直接更換 local-ig.html 進行網頁熱更新，而無需重新編譯打包 EXE
    candidates.append(Path(sys.executable).resolve().parent)
    candidates.append(Path.cwd().resolve())
    candidates.append(Path(__file__).resolve().parents[1])

    # 如果外部沒有，才使用 PyInstaller 內置打包的默認資源
    if getattr(sys, 'frozen', False):
        mei = getattr(sys, '_MEIPASS', None)
        if mei:
            candidates.append(Path(mei).resolve())

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

    def end_headers(self) -> None:
        # Avoid stale frontend JS/HTML from browser cache during frequent local updates.
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def _send_json(self, data: dict[str, Any], status: int = 200) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:
        if self.path not in ('/__open_folder__', '/__run_ig_download__', '/__ig_download_status__', '/__run_add_task__', '/__get_server_info__', '/__video_screenshot__', '/__video_clip__'):
            self._send_json({'ok': False, 'error': 'not_found'}, status=404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length).decode('utf-8') if length else '{}'
            data = json.loads(raw)
            if self.path == '/__open_folder__':
                path = str(data.get('path') or '').strip()
                result = open_folder_in_explorer(path)
            elif self.path == '/__get_server_info__':
                result = {'ok': True, 'root': str(resolve_launch_dir()), 'bootstrap_dir': LOCAL_IG_BOOTSTRAP_DIR, 'version': '1.0.0'}
            elif self.path == '/__ig_download_status__':
                pid = int(data.get('pid') or 0)
                result = get_ig_download_status(pid)
            elif self.path == '/__run_add_task__':
                result = run_add_task(data)
            elif self.path == '/__video_screenshot__':
                result = run_video_screenshot(data)
            elif self.path == '/__video_clip__':
                result = run_video_clip(data)
            else:
                result = run_ig_download(data)
            self._send_json(result, status=200 if result.get('ok') else 400)
        except Exception as exc:
            self._send_json({'ok': False, 'error': str(exc)}, status=500)


def run_video_screenshot(payload: dict[str, Any]) -> dict[str, Any]:
    video_path_str = str(payload.get('path') or '').strip()
    time_offset = str(payload.get('time') or '').strip()

    if not video_path_str:
        return {'ok': False, 'error': '视频路径不能为空'}
    if not time_offset:
        return {'ok': False, 'error': '截图时间不能为空'}

    try:
        video_path = Path(video_path_str)
    except Exception:
        return {'ok': False, 'error': '无效的视频路径'}

    if not video_path.exists() or not video_path.is_file():
        return {'ok': False, 'error': f'未找到视频文件: {video_path_str}'}

    # 1. 查找 ffmpeg 可执行文件
    ffmpeg_cmd = None

    # 1.1 查找打包环境释放目录中的 ffmpeg.exe
    if getattr(sys, 'frozen', False):
        mei = getattr(sys, '_MEIPASS', None)
        if mei:
            bundled = Path(mei) / 'ffmpeg.exe'
            if bundled.exists():
                ffmpeg_cmd = str(bundled)

    # 1.2 查找当前执行目录或视频同级目录下是否有 ffmpeg.exe
    if not ffmpeg_cmd:
        candidates = [
            resolve_launch_dir() / 'ffmpeg.exe',
            video_path.parent / 'ffmpeg.exe',
            ROOT / 'ffmpeg.exe'
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                ffmpeg_cmd = str(candidate)
                break

    # 1.3 查找系统环境变量中的 ffmpeg
    if not ffmpeg_cmd:
        sys_ffmpeg = shutil.which('ffmpeg')
        if sys_ffmpeg:
            ffmpeg_cmd = sys_ffmpeg

    if not ffmpeg_cmd:
        return {
            'ok': False,
            'error': '未在安装包或系统中检测到 ffmpeg。请确保系统已安装 ffmpeg 并配置到环境变量中。'
        }

    # 2. 生成截图文件名与目标路径
    cleaned_time = time_offset.replace(':', '_').replace('/', '_').replace('\\', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
    video_dir = video_path.parent
    video_stem = video_path.stem
    output_filename = f"{video_stem}_shot_{cleaned_time}.png"
    output_path = video_dir / output_filename

    # 3. 组装 FFmpeg 命令并执行
    cmd = [
        ffmpeg_cmd,
        '-y',
        '-ss', time_offset,
        '-i', str(video_path),
        '-frames:v', '1',
        '-pix_fmt', 'rgb24',
        str(output_path)
    ]

    creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    startupinfo = None
    if hasattr(subprocess, 'STARTUPINFO'):
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= getattr(subprocess, 'STARTF_USESHOWWINDOW', 0)

    try:
        proc = subprocess.run(
            cmd,
            creationflags=creationflags,
            startupinfo=startupinfo,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=15
        )
        if proc.returncode == 0:
            return {'ok': True, 'filename': output_filename, 'path': str(output_path)}
        else:
            err_msg = proc.stderr or proc.stdout or '未知错误'
            return {'ok': False, 'error': f'FFmpeg 截图失败: {err_msg.strip()}'}
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': 'FFmpeg 截图执行超时'}
    except Exception as e:
        return {'ok': False, 'error': f'截图过程发生异常: {str(e)}'}


def run_video_clip(payload: dict[str, Any]) -> dict[str, Any]:
    video_path_str = str(payload.get('path') or '').strip()
    start_time = str(payload.get('start') or '').strip()
    end_time = str(payload.get('end') or '').strip()
    reencode = bool(payload.get('reencode'))

    if not video_path_str:
        return {'ok': False, 'error': '视频路径不能为空'}
    if not start_time or not end_time:
        return {'ok': False, 'error': '开始时间与结束时间不能为空'}

    try:
        video_path = Path(video_path_str)
    except Exception:
        return {'ok': False, 'error': '无效的视频路径'}

    if not video_path.exists() or not video_path.is_file():
        return {'ok': False, 'error': f'未找到视频文件: {video_path_str}'}

    # 1. 查找 ffmpeg 可执行文件
    ffmpeg_cmd = None

    # 1.1 查找打包环境释放目录中的 ffmpeg.exe
    if getattr(sys, 'frozen', False):
        mei = getattr(sys, '_MEIPASS', None)
        if mei:
            bundled = Path(mei) / 'ffmpeg.exe'
            if bundled.exists():
                ffmpeg_cmd = str(bundled)

    # 1.2 查找当前执行目录或视频同级目录下是否有 ffmpeg.exe
    if not ffmpeg_cmd:
        candidates = [
            resolve_launch_dir() / 'ffmpeg.exe',
            video_path.parent / 'ffmpeg.exe',
            ROOT / 'ffmpeg.exe'
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                ffmpeg_cmd = str(candidate)
                break

    # 1.3 查找系统环境变量中的 ffmpeg
    if not ffmpeg_cmd:
        sys_ffmpeg = shutil.which('ffmpeg')
        if sys_ffmpeg:
            ffmpeg_cmd = sys_ffmpeg

    if not ffmpeg_cmd:
        return {
            'ok': False,
            'error': '未在安装包或系统中检测到 ffmpeg。'
        }

    # 2. 生成合法的裁剪短视频文件名与目标路径
    cleaned_start = start_time.replace(':', '_').replace('.', '_')
    cleaned_end = end_time.replace(':', '_').replace('.', '_')
    video_dir = video_path.parent
    video_stem = video_path.stem
    output_filename = f"{video_stem}_clip_{cleaned_start}_to_{cleaned_end}.mp4"
    output_path = video_dir / output_filename

    # 3. 组装 FFmpeg 命令并执行
    if not reencode:
        cmd = [
            ffmpeg_cmd,
            '-y',
            '-ss', start_time,
            '-to', end_time,
            '-i', str(video_path),
            '-c', 'copy',
            str(output_path)
        ]
    else:
        cmd = [
            ffmpeg_cmd,
            '-y',
            '-ss', start_time,
            '-to', end_time,
            '-i', str(video_path),
            '-c:v', 'libx264',
            '-preset', 'superfast',
            '-crf', '22',
            '-c:a', 'aac',
            str(output_path)
        ]

    creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    startupinfo = None
    if hasattr(subprocess, 'STARTUPINFO'):
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= getattr(subprocess, 'STARTF_USESHOWWINDOW', 0)

    try:
        proc = subprocess.run(
            cmd,
            creationflags=creationflags,
            startupinfo=startupinfo,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=35
        )
        if proc.returncode == 0:
            return {'ok': True, 'filename': output_filename, 'path': str(output_path)}
        else:
            err_msg = proc.stderr or proc.stdout or '未知错误'
            return {'ok': False, 'error': f'FFmpeg 裁剪失败: {err_msg.strip()}'}
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': 'FFmpeg 裁剪执行超时'}
    except Exception as e:
        return {'ok': False, 'error': f'裁剪过程发生异常: {str(e)}'}


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
    """
    通过绑定专用本地端口（INSTANCE_LOCK_PORT）实现多进程锁。
    防止用户重复双击启动多个后台服务实例导致端口冲突或文件句柄争抢。
    """
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
    """
    如果检测到后台服务已健康运行，直接在系统默认浏览器中打开已有网页，防止重复启动。
    """
    url = make_url(DEFAULT_PORT)
    if not is_server_healthy(url):
        return False
    try:
        webbrowser.open(url)
        return True
    except Exception:
        return False


def is_server_healthy(url: str) -> bool:
    """
    通过发起轻量级 HTTP GET 请求，检测特定服务页面是否正常响应（包含相册特征标志符），判断服务健康状态。
    """
    try:
        with urllib.request.urlopen(url, timeout=1.5) as resp:
            if resp.status != 200:
                return False
            content = resp.read(4096).decode('utf-8', errors='ignore')
            return 'btnWelcomeOpen' in content or '<!DOCTYPE html' in content
    except (OSError, urllib.error.URLError, TimeoutError):
        return False


def find_available_port(start_port: int, attempts: int = 30) -> int:
    """
    自适应端口查找：如果默认端口被占用，在指定尝试次数内自动递增寻找可用端口。
    """
    for port in range(start_port, start_port + attempts):
        if is_port_free(HOST, port):
            return port
    raise OSError(f'找不到可用端口（已尝试 {start_port} ~ {start_port + attempts - 1}）')


def open_folder_in_explorer(path: str) -> dict[str, Any]:
    """
    在 Windows 资源管理器中打开指定目录（安全拼接校准后的绝对路径）。
    """
    if not path:
        return {'ok': False, 'error': 'empty_path'}
    try:
        target = Path(path)
    except Exception:
        return {'ok': False, 'error': 'invalid_path'}
    if not target.exists():
        return {'ok': False, 'error': 'not_found', 'path': path}
    try:
        # 调用 explorer.exe 打开选定的文件夹
        subprocess.Popen(['explorer.exe', str(target)])
        return {'ok': True, 'path': str(target)}
    except Exception as exc:
        return {'ok': False, 'error': str(exc), 'path': str(target)}


def _resolve_python_cmd() -> list[str] | None:
    """
    解析系统可用的 Python 解释器执行路径（以 `-u` 无缓冲模式运行）。
    打包后 exe 并非标准的 python 解释器本身，故在 fallback 脚本模式时优先从系统 PATH 中搜寻。
    """
    py = shutil.which('python')
    if py:
        return [py, '-u']
    py_launcher = shutil.which('py')
    if py_launcher:
        return [py_launcher, '-3', '-u']
    return None


def get_clean_env() -> dict[str, str]:
    """获取清除 PyInstaller 隔离干扰后的干净环境变量，供系统 Python 子进程使用"""
    env = os.environ.copy()
    for var in ["PYTHONPATH", "PYTHONHOME", "PYTHONNOUSERSITE"]:
        env.pop(var, None)
    mei = getattr(sys, '_MEIPASS', None)
    if mei and "PATH" in env:
        paths = env["PATH"].split(os.pathsep)
        cleaned_paths = [p for p in paths if mei.lower() not in p.lower()]
        env["PATH"] = os.pathsep.join(cleaned_paths)
    return env


def _resolve_script(name: str) -> Path | None:
    """
    通用脚本路径定位器，用于查找依赖的翻译、转换或下载 Python 源码文件。
    优先查找磁盘上的物理文件，避开 PyInstaller 的临时解压目录（_MEIPASS），防止 DLL 冲突。
    """
    launch_dir = resolve_launch_dir()
    candidates = [
        launch_dir / LOCAL_IG_BOOTSTRAP_DIR / name,
        launch_dir / name,
        Path.cwd() / name,
        ROOT / name,
    ]
    mei = getattr(sys, '_MEIPASS', None)
    for path in candidates:
        if mei and mei in str(path):
            continue
        if path.exists() and path.is_file():
            return path
    for path in candidates:
        if path.exists() and path.is_file():
            return path
    return None


def _resolve_ig_script() -> Path | None:
    """
    寻找本地下载脚本 ig_download.py 的具体物理路径（兼容源码运行与解压后运行）。
    """
    return _resolve_script('ig_download.py')


def _resolve_binary_or_script(name: str) -> tuple[list[str], Path] | None:
    """
    自适应可执行命令解析：
    1. 打包模式（frozen）：优先加载打包进去的同名二进制 EXE 进程组件（如 ig_download.exe）。
    2. 开发源码模式：自动退回使用系统 Python 运行对应的 .py 脚本。
    """
    # 1) 打包环境下，优先使用同目录（临时解压路径 ROOT）下的预编译二进制 EXE 文件
    if getattr(sys, 'frozen', False):
        exe_name = name.replace('.py', '.exe')
        exe_path = ROOT / exe_name
        if exe_path.exists():
            return [str(exe_path)], ROOT

    # 2) 非打包模式下，回退为 Python 解释器 + 脚本形式运行
    script = _resolve_script(name)
    py_cmd = _resolve_python_cmd()
    if script and py_cmd:
        return [*py_cmd, str(script)], script.parent

    return None



def run_python_script_in_process(script_name: str, args: list[str], log_path: Path) -> None:
    """
    在 multiprocessing.Process 子进程中执行对应的 Python 脚本。
    """
    import sys
    import time
    import importlib
    
    script_dir = Path(__file__).resolve().parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    mei = getattr(sys, '_MEIPASS', None)
    if mei and str(mei) not in sys.path:
        sys.path.insert(0, str(mei))
        
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, 'a', encoding='utf-8', errors='ignore') as logf:
        logf.write(f'\n=== launch process {time.strftime("%Y-%m-%d %H:%M:%S")} ===\n')
        logf.write(f'script: {script_name} {" ".join(args)}\n')
        logf.flush()
        
        # 重定向 stdio 进日志文件
        sys.stdout = logf
        sys.stderr = logf
        
        sys.argv = [script_name] + args
        
        try:
            module_name = script_name.replace('.py', '')
            mod = importlib.import_module(module_name)
            
            exit_code = 0
            if hasattr(mod, 'main'):
                res = mod.main()
                if isinstance(res, int):
                    exit_code = res
            sys.exit(exit_code)
        except SystemExit as se:
            sys.exit(se.code)
        except Exception as exc:
            import traceback
            traceback.print_exc(file=logf)
            sys.exit(1)


def _start_background_process_task(script_name: str, args: list[str], log_path: Path) -> dict[str, Any]:
    script_path = _resolve_script(script_name)
    if not script_path:
        return {'ok': False, 'error': f'script_not_found: {script_name}'}

    py_cmd = _resolve_python_cmd()
    if not py_cmd:
        py_cmd = [get_python_executable(), '-u']

    log_path.parent.mkdir(parents=True, exist_ok=True)
    logf = open(log_path, 'a', encoding='utf-8', errors='ignore')
    logf.write(f'\n=== launch process {time.strftime("%Y-%m-%d %H:%M:%S")} ===\n')
    logf.write(f'script: {script_name} {" ".join(args)}\n')
    logf.flush()

    try:
        p = subprocess.Popen(
            py_cmd + [str(script_path)] + args,
            stdout=logf,
            stderr=logf,
            env=get_clean_env(),
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        IG_TASKS[p.pid] = {
            'proc': p,
            'log': str(log_path),
            'log_file': logf
        }
        return {'ok': True, 'pid': p.pid, 'cmd': [script_name] + args, 'log': str(log_path)}
    except Exception as e:
        logf.write(f'Failed to start process: {e}\n')
        logf.close()
        return {'ok': False, 'error': f'start_failed: {e}'}


def run_add_task(payload: dict[str, Any]) -> dict[str, Any]:
    platform = str(payload.get('platform') or '').strip().lower()
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
            
            script_name = 'xhs_download.py'
            script = _resolve_script(script_name)
            if script is None:
                return {'ok': False, 'error': 'xhs_downloader_not_found'}
            
            args = [user, '--output', str(out_path)]
            if count > 0:
                args.extend(['--count', str(count)])
            if cookie:
                args.extend(['--cookie', cookie])
                
            log_path = out_path / f'xhs_download_{int(time.time())}.log'
            return _start_background_process_task(script_name, args, log_path)

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
                return {'ok': False, 'error': f'{platform}_converter_not_found'}
            
            args = [str(target)]
            if dry_run:
                args.append('--dry-run')
                
            log_path = target / f'{platform}_convert_{int(time.time())}.log'
            return _start_background_process_task(script_name, args, log_path)

        if platform == 'trans':
            folder = str(payload.get('path') or '').strip()
            lang = str(payload.get('lang') or 'en').strip() or 'en'
            script_name = 'APP - deep-translator.py'
            script = _resolve_script(script_name)
            if script is None:
                return {'ok': False, 'error': 'translator_not_found'}
                
            args = ['--lang', lang]
            log_dir = resolve_launch_dir()
            if folder:
                target = Path(folder)
                if not target.is_absolute():
                    target = (launch_dir / target).resolve()
                if not target.exists() or not target.is_dir():
                    return {'ok': False, 'error': 'path_not_found', 'path': str(target)}
                args.extend(['--folder', str(target)])
                log_dir = target
            log_path = log_dir / f'translate_{int(time.time())}.log'
            return _start_background_process_task(script_name, args, log_path)

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
    if out_path.exists() and out_path.is_file():
        return {'ok': False, 'error': 'output_is_file', 'output': str(out_path)}
    try:
        out_path.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        return {'ok': False, 'error': f'cannot_create_output: {exc}'}

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
            import _common
            for child in role1_dir.iterdir():
                if child.is_dir():
                    parts = child.name.split('-')
                    first_part_clean = _common.clean_emoji_and_trim(parts[0].strip())
                    if first_part_clean in _common.VALID_CORES:
                        (profile_dir / child.name).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    script_name = 'ig_download.py'
    script = _resolve_script(script_name)
    if script is None:
        return {'ok': False, 'error': 'ig_downloader_not_found'}

    args = [username, '--output', str(out_path)]
    if count > 0:
        args.extend(['--count', str(count)])
    if sessionid:
        args.extend(['--sessionid', sessionid])
    elif use_cookies:
        args.extend(['--cookies-from-browser', 'chrome'])

    try:
        log_path = out_path / f'ig_download_{username}.log'
        started = _start_background_process_task(script_name, args, log_path)
        if not started.get('ok'):
            return started
        proc = IG_TASKS[int(started['pid'])]['proc']
        time.sleep(0.8)
        
        # 兼容 Popen 的退出检测
        if proc.poll() is not None:
            tail = ''
            try:
                text = log_path.read_text(encoding='utf-8', errors='ignore')
                tail = '\n'.join(text.splitlines()[-6:]).strip()
            except Exception:
                pass
            msg = f'ig_process_exited_immediately(code={proc.returncode})'
            if tail:
                msg = f'{msg}: {tail}'
            if IG_TASKS[int(started['pid'])].get('log_file'):
                try:
                    IG_TASKS[int(started['pid'])]['log_file'].close()
                except Exception:
                    pass
            return {'ok': False, 'error': msg, 'cmd': args, 'log': str(log_path)}
            
        return {
            'ok': True,
            'pid': int(started['pid']),
            'cmd': args,
            'script': script_name,
            'log': str(log_path),
        }
    except Exception as exc:
        return {'ok': False, 'error': f'start_failed: {exc}', 'cmd': args}


def get_ig_download_status(pid: int) -> dict[str, Any]:
    task = IG_TASKS.get(pid)
    if not task:
        return {'ok': False, 'error': 'pid_not_found', 'pid': pid}
    proc = task['proc']
    log_path = Path(task['log'])
    
    # 兼容 Popen 的状态检测
    running = proc.poll() is None
    exit_code = proc.returncode if not running else None

    # 结束时释放句柄
    if not running and task.get('log_file'):
        try:
            task['log_file'].close()
            task['log_file'] = None
        except Exception:
            pass
    
    tail = ''
    try:
        if log_path.exists():
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                tail = '\n'.join(f.read().splitlines()[-20:])
    except Exception:
        tail = ''
    return {
        'ok': True,
        'pid': pid,
        'running': running,
        'exit_code': exit_code,
        'log': str(log_path),
        'tail': tail,
    }


def get_python_executable() -> str:
    """获取可用的系统 Python 解释器路径，打包模式下在系统 PATH 中寻找 python"""
    if not getattr(sys, 'frozen', False):
        return sys.executable
    import shutil
    for cmd in ["py", "python", "python3"]:
        path = shutil.which(cmd)
        if path:
            return path
    return "python"


def check_and_install_dependencies():
    """检测并自动安装必要的第三方Python依赖包"""
    required = {
        "requests": "requests",
        "instaloader": "instaloader",
        "browser_cookie3": "browser-cookie3",
        "deep_translator": "deep-translator",
        "playwright": "playwright",
    }
    missing = []
    for pkg_name, pip_name in required.items():
        try:
            __import__(pkg_name)
        except ImportError:
            missing.append(pip_name)
    if missing:
        print("====== 正在检查并自动安装缺失的依赖包 ======")
        print(f"检测到未安装的包: {', '.join(missing)}")
        print("这通常只需要在第一次运行或升级版本后执行一次，请耐心等待...")
        try:
            py_exe = get_python_executable()
            cmd = [py_exe, "-m", "pip", "install"] + missing
            print(f"执行命令: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            print("[OK] 依赖包安装成功！")
        except Exception as e:
            print(f"[错误] 自动安装依赖包失败: {e}")
            print(f"请尝试手动在终端运行: pip install {' '.join(missing)}")
            return

    # 特殊处理 playwright 浏览器内核
    try:
        import playwright
        flag_file = Path.home() / '.local-ig' / '.playwright_installed'
        if 'playwright' in missing or not flag_file.exists():
            print("====== 正在初始化 Playwright 浏览器内核 (用于小红书下载) ======")
            print("正在下载 Chromium 内核，这可能需要一两分钟，请耐心等待...")
            flag_file.parent.mkdir(parents=True, exist_ok=True)
            py_exe = get_python_executable()
            cmd = [py_exe, "-m", "playwright", "install", "chromium"]
            subprocess.run(cmd, check=True)
            flag_file.touch()
            print("[OK] Playwright 浏览器内核初始化成功！")
    except Exception as e:
        print(f"[警告] 初始化 Playwright 失败 (将影响小红书下载功能): {e}")


def cleanup_illegal_empty_folders(launch_dir: Path):
    """
    自动清理用户角色目录（如 jovy_irwin）下因历史 BUG 残留的非法物理空外壳文件夹
    （如 📸 角度、😍 愛好、🇲🇾 馬來西亞、备忘-客户）
    """
    import shutil
    import _common

    bootstrap_dir = launch_dir
    if launch_dir.name != LOCAL_IG_BOOTSTRAP_DIR:
        bootstrap_dir = launch_dir / LOCAL_IG_BOOTSTRAP_DIR
        
    if not bootstrap_dir.exists():
        return
        
    try:
        for role_dir in bootstrap_dir.iterdir():
            if not role_dir.is_dir() or role_dir.name in (LOCAL_IG_ROLE_DIRS + ['assets', 'build', 'dist', 'docs', 'release', 'tests', 'scripts', '_common']):
                continue
            
            for child in role_dir.iterdir():
                if not child.is_dir():
                    continue
                
                parts = child.name.split('-')
                first_part_clean = _common.clean_emoji_and_trim(parts[0].strip())
                
                if first_part_clean not in _common.VALID_CORES:
                    has_real_data = False
                    for root, dirs, files in os.walk(child):
                        for file in files:
                            ext = Path(file).suffix.lower()
                            if ext in ('.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov') or file in ('meta.json', 'notes.json'):
                                has_real_data = True
                                break
                        if has_real_data:
                            break
                    
                    if not has_real_data:
                        try:
                            shutil.rmtree(child)
                            print(f"[自动清理] 成功清除了残留非法空文件夹外壳: {role_dir.name}/{child.name}")
                        except Exception as e:
                            print(f"[警告] 自动清理遗留文件夹失败 {child.name}: {e}")
    except Exception as exc:
        print(f"[警告] 非法空壳目录清理扫描异常: {exc}")


def main() -> int:
    multiprocessing.freeze_support()
    # 0. 自动安装依赖
    check_and_install_dependencies()
    # 1. 查找当前服务的物理启动目录
    launch_dir = resolve_launch_dir()
    exe_name = Path(sys.executable).name if getattr(sys, 'frozen', False) else ''
    is_installer_mode = exe_name in ('安装本地IG.exe', 'IG.exe')
    
    # 2. 如果是从 "本地IG" 子目录直接启动的，则执行子脚本同步，防止子程序过时
    if launch_dir.name == LOCAL_IG_BOOTSTRAP_DIR:
        sync_runtime_files_to_dir(launch_dir)

    # 3. 如果是从外部启动（即“本地IG”的父级目录），自动在当前路径下初始化并同步标准物理结构
    if launch_dir.name != LOCAL_IG_BOOTSTRAP_DIR:
        try:
            bootstrap_root, role_dirs = ensure_bootstrap_local_ig(launch_dir)
            print(f'[信息] 已确保目录模板: {bootstrap_root}')
            for role_dir in role_dirs:
                print(f'[信息] 已确保角色目录: {role_dir}')
            # 安装器模式：只负责释放物理结构 and 必备脚本，不启动持久运行的 Web 服务器
            if is_installer_mode:
                print('[完成] 安装器模式：仅生成本地IG目录，不自动打开UI。')
                return 0
        except Exception as exc:
            print(f'[警告] 创建模板目录失败: {exc}')

    # 3.5 自动清除历史 BUG 残留下来的空非法分类文件夹
    cleanup_illegal_empty_folders(launch_dir)

    # 4. 加锁，确保同一时间内只有一台后台服务实例在侦听端口
    if not acquire_instance_lock():
        print('[信息] 检测到实例锁已存在，尝试复用已运行页面。')
        if open_existing_server_page():
            return 0
        print('[警告] 发现旧实例但页面不可用，将尝试启动新实例。')

    handler = partial(QuietHandler, directory=str(ROOT))

    # 5. 绑定并检测可用端口，支持自动退让重试
    try:
        port = find_available_port(DEFAULT_PORT, attempts=DEFAULT_PORT_ATTEMPTS)
    except OSError as exc:
        msg = f'[失败] 无法找到可用端口: {exc}'
        print(msg)
        write_status('error', message=msg, requested_port=DEFAULT_PORT)
        return 1

    url = make_url(port)

    # 6. 初始化并运行带线程支持的 HTTP 服务进程
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

    # 7. 自动打开浏览器页面引导用户访问前端 UI
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
