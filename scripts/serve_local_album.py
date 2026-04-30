from __future__ import annotations

import json
import os
import socket
import subprocess
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

DEFAULT_PORT = int(os.environ.get('LOCAL_IG_PORT', '8765'))
DEFAULT_PORT_ATTEMPTS = int(os.environ.get('LOCAL_IG_PORT_ATTEMPTS', '100'))
HOST = os.environ.get('LOCAL_IG_HOST', '127.0.0.1')
ROOT = Path(__file__).resolve().parents[1]
STATUS_FILE = os.environ.get('LOCAL_IG_STATUS_FILE', '').strip()
NO_BROWSER = os.environ.get('LOCAL_IG_NO_BROWSER', '').strip() == '1'


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
        if self.path != '/__open_folder__':
            self._send_json({'ok': False, 'error': 'not_found'}, status=404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length).decode('utf-8') if length else '{}'
            data = json.loads(raw)
            path = str(data.get('path') or '').strip()
            result = open_folder_in_explorer(path)
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
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


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


def main() -> int:
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
