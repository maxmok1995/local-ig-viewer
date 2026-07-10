import json
import os
import sys
import time
import random
import platform
import subprocess
from pathlib import Path

# 全局版本号，方便统一读取
VERSION = "3.0.65"

# 合法的物理大类核心词（去 Emoji 后的干净名称）
VALID_CORES = {"人", "工作", "吃喝", "行", "住", "玩乐", "玩樂", "备忘", "備忘", "未分类", "未分類"}

def clean_emoji_and_trim(s: str) -> str:
    """移除非单词、非空格、非中文字符，剥离 emoji"""
    import re
    cleaned = re.sub(r'[^\w\s\-\/\u4e00-\u9fff]', '', s)
    return cleaned.strip()

def get_version() -> str:
    """获取程序版本号。"""
    try:
        ver_file = Path(__file__).resolve().parent / 'VERSION'
        if ver_file.exists():
            return ver_file.read_text(encoding='utf-8').strip()
    except Exception:
        pass
    return VERSION

def save_meta_json(dest_dir: Path, meta_dict: dict) -> None:
    """统一向目标目录写入标准的 meta.json 数据文件。"""
    dest_dir.mkdir(parents=True, exist_ok=True)
    meta_file = dest_dir / 'meta.json'
    meta_file.write_text(
        json.dumps(meta_dict, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

def open_folder(path: Path) -> None:
    """跨平台在系统文件管理器中安全打开目录。"""
    try:
        system = platform.system()
        if system == 'Windows':
            os.startfile(str(path))
        elif system == 'Darwin':
            subprocess.run(['open', str(path)], check=True)
        else:
            subprocess.run(['xdg-open', str(path)], check=True)
    except Exception as e:
        debug_log(f"打开文件夹失败: {path}", e)

def debug_log(message: str, exception: Exception | None = None) -> None:
    """记录详细的排障 Debug 日志，绝不默默吞掉错误。"""
    try:
        # 将日志写入到全局运行时临时目录下的 debug.log 文件中
        log_dir = Path.home() / '.local-ig'
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / 'debug.log'
        
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        err_msg = f" | 异常: {exception}" if exception else ""
        log_line = f"[{timestamp}] {message}{err_msg}\n"
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_line)
    except Exception:
        pass

def retry_with_backoff(attempts: int = 4, delay: float = 2.0, backoff: float = 2.0, exceptions=(Exception,)):
    """通用指数退避重试装饰器，应对限流 429 或短暂网络异常。"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            curr_delay = delay
            for i in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if i == attempts:
                        raise e
                    wait_time = curr_delay + random.uniform(0, 1.5)
                    print(f"⏳  操作遇到异常（{e}），第 {i}/{attempts} 次尝试，等待 {wait_time:.1f}s 后重试…")
                    time.sleep(wait_time)
                    curr_delay *= backoff
        return wrapper
    return decorator

def get_role1_template_dir(profile_dir: Path) -> Path | None:
    """
    寻找本地相册的角色模板目录。
    支持从环境变量 LOCAL_IG_ROLE_TEMPLATE 自定义配置，提供更好的可配置性。
    """
    env_template = os.environ.get('LOCAL_IG_ROLE_TEMPLATE', '').strip()
    if env_template:
        p = Path(env_template)
        if p.exists() and p.is_dir():
            return p

    candidates = [
        profile_dir.parent / '角色1',
        profile_dir.parent.parent / '角色1',
        profile_dir.parent.parent.parent / '角色1',
    ]
    return next((p for p in candidates if p.exists() and p.is_dir()), None)
