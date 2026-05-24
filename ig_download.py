#!/usr/bin/env python3
"""
Instagram 下载器 — 配合本地相册查看器 (local-ig.html) 使用

安装依赖（只需一次）:
    pip install instaloader requests

用法:
    python ig_download.py natgeo                       # 下载公开账号
    python ig_download.py natgeo --count 30            # 只下载最新 30 条
    python ig_download.py natgeo --start 201 --end 400 # 下载第 201～400 条（范围模式）
    python ig_download.py yourusername --login         # 登录后下载（私密账号或自己的号）
    python ig_download.py natgeo --output D:/photos    # 自定义保存目录
    python ig_download.py natgeo --delay 3             # 每条间隔 3 秒（降低被限流概率）
    python ig_download.py natgeo --cookies-from-browser chrome   # 用 Chrome Cookie 免密登录（推荐）

下载完成后:
    1. 用 Chrome / Edge 打开 local-ig.html
    2. 点「选择文件夹」，选中 downloads/<用户名> 目录
    3. 所有帖子自动导入，文案、时间、地点全部就位
"""

import json
import os
import sys
import time
import random
import re
import platform
import subprocess
import argparse
import shutil
from itertools import islice
from pathlib import Path
from urllib.parse import unquote
from types import SimpleNamespace

RATE_LIMIT_WAIT    = 300  # 被限流后首次等待秒数（5 分钟）
RATE_LIMIT_RETRIES = 5    # 最多重试次数
MOBILE_UA = 'Instagram 219.0.0.12.117 Android (28/9; 420dpi; 1080x2160; samsung; SM-G960F; star2lte; samsungexynos9810; en_US; 301006047)'


def open_folder(path: Path):
    """在系统文件管理器中打开文件夹（跨平台）。"""
    try:
        system = platform.system()
        if system == 'Windows':
            os.startfile(str(path))
        elif system == 'Darwin':
            subprocess.run(['open', str(path)], check=True)
        else:
            subprocess.run(['xdg-open', str(path)], check=True)
    except Exception:
        pass  # 打开失败不影响主流程


# ── 依赖检查 ──────────────────────────────────────────────────────────────────
def _require(pkg, install_name=None):
    try:
        return __import__(pkg)
    except ImportError:
        name = install_name or pkg
        print(f"\n❌  缺少依赖包: {name}")
        print(f"    请运行: pip install {name}\n")
        sys.exit(1)


# ── 图片下载 ──────────────────────────────────────────────────────────────────
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) '
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    ),
    'Referer': 'https://www.instagram.com/',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}


def download_file(url, path, session, stream=False):
    r = session.get(url, headers=HEADERS, timeout=60, stream=stream)
    r.raise_for_status()
    if stream:
        size = 0
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    size += len(chunk)
        return size
    else:
        data = r.content
        path.write_bytes(data)
        return len(data)


# ── 单条帖子处理 ──────────────────────────────────────────────────────────────
def process_post(post, profile_dir, session, delay):
    date_str = post.date_local.strftime('%Y-%m-%d')
    folder_name = f"{date_str}_{post.shortcode}"
    post_dir = profile_dir / folder_name

    # 已下载则跳过
    if (post_dir / 'meta.json').exists():
        print(f"  ↳ 已存在，跳过")
        return 'skip'

    post_dir.mkdir(parents=True, exist_ok=True)

    # 收集图片 URL（单图 / 轮播 / 视频封面）及视频 URL
    urls = []
    video_urls = []   # list of (index, url)
    try:
        if post.typename == 'GraphSidecar':
            for i, node in enumerate(post.get_sidecar_nodes(), 1):
                urls.append(node.display_url)          # 封面图（含视频节点的静态封面）
                if getattr(node, 'is_video', False) and getattr(node, 'video_url', None):
                    video_urls.append((i, node.video_url))
        else:
            urls.append(post.url)   # 视频帖子 post.url 是封面图
            if post.is_video and post.video_url:
                video_urls.append((1, post.video_url))
    except Exception as e:
        print(f"  ↳ 获取图片链接失败: {e}")
        urls = [post.url] if post.url else []

    if not urls:
        shutil.rmtree(post_dir, ignore_errors=True)
        print(f"  ↳ 无可用图片，跳过")
        return 'skip'

    # 下载图片
    failed = 0
    for i, url in enumerate(urls, 1):
        try:
            size = download_file(url, post_dir / f"{i}.jpg", session)
            kb = size // 1024
            end = '\r' if i < len(urls) else '\n'
            print(f"  ↳ 图片 {i}/{len(urls)}  ({kb} KB)", end=end, flush=True)
            if i < len(urls):
                time.sleep(delay * 0.2)
        except Exception as e:
            failed += 1
            print(f"  ↳ 图片 {i} 失败: {e}")

    saved = list(post_dir.glob('*.jpg'))
    if not saved:
        shutil.rmtree(post_dir, ignore_errors=True)
        return 'fail'

    # 下载视频文件（与封面同编号，扩展名 .mp4），使用串流避免大文件占满内存
    for i, vurl in video_urls:
        try:
            size = download_file(vurl, post_dir / f"{i}.mp4", session, stream=True)
            print(f"  ↳ 视频 {i}  ({size//1024} KB)")
        except Exception as e:
            print(f"  ↳ 视频 {i} 下载失败: {e}")

    # 地点（多策略兼容，优先从原始 GraphQL _node 读取，无额外 API 请求）
    location_name = ''
    location_id = ''
    try:
        # 策略 1：直接读 _node（instaloader 缓存的 GraphQL 原始数据，100% 无网络调用）
        raw_loc = (getattr(post, '_node', None) or {}).get('location') or {}
        if raw_loc:
            location_name = raw_loc.get('name', '') or ''
            raw_id = raw_loc.get('id')
            if raw_id:
                location_id = str(raw_id)
    except Exception:
        pass

    if not location_name:
        try:
            # 策略 2：回退到 post.location 对象（部分 instaloader 版本有效）
            loc = getattr(post, 'location', None)
            if loc:
                if hasattr(loc, 'name') and loc.name:
                    location_name = str(loc.name)
                if not location_id and hasattr(loc, 'id') and loc.id:
                    location_id = str(loc.id)
        except Exception:
            pass

    # 文案
    caption = (post.caption or '').strip()

    # 点赞数（未登录时部分账号不可见）
    likes = None
    try:
        likes = post.likes
    except Exception:
        pass

    # 写入 meta.json
    meta = {
        'caption':      caption,
        'date':         post.date_local.isoformat(),
        'location':     location_name,
        'location_id':  location_id,
        'shortcode':    post.shortcode,
        'ig_url':       f'https://www.instagram.com/p/{post.shortcode}/',
        'is_video':     post.is_video,
        'image_count':  len(urls),
        'downloaded':   len(saved),
        'source':       'ig',
    }
    if likes is not None:
        meta['likes'] = likes

    (post_dir / 'meta.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    # 预览文案（第一行，最多 72 字符）
    preview = caption.split('\n')[0][:72] if caption else '（无文案）'
    if len(caption) > 72:
        preview += '…'
    print(f"  ✓ {preview}")
    return 'ok'


# ── 注入 Instagram 认证信息到 instaloader session ─────────────────────────────
def _apply_ig_auth(L, sessionid: str):
    """将 sessionid 及必要请求头注入 instaloader session。"""
    sess = L.context._session
    sess.cookies.set('sessionid', sessionid, domain='.instagram.com', path='/')
    csrf = sess.cookies.get('csrftoken', domain='.instagram.com') or 'missing'
    sess.headers.update({
        'X-CSRFToken':       csrf,
        'X-IG-App-ID':       '936619743392459',
        'X-Requested-With':  'XMLHttpRequest',
        'Referer':           'https://www.instagram.com/',
    })


def _clean_sessionid(raw: str) -> str:
    """清洗用户粘贴的 sessionid，兼容引号与 URL 编码。"""
    sid = (raw or '').strip().strip('"').strip("'")
    return unquote(sid)


def _sync_role1_template_dirs(profile_dir: Path):
    """
    Auto-create category folders in the downloaded profile directory
    based on sibling 本地IG/角色1 directory names.
    """
    try:
        candidates = [
            profile_dir.parent / '角色1',
            profile_dir.parent.parent / '角色1',
            profile_dir.parent.parent.parent / '角色1',
        ]
        role1_dir = next((p for p in candidates if p.exists() and p.is_dir()), None)
        if role1_dir is None:
            return
        for child in role1_dir.iterdir():
            if child.is_dir():
                (profile_dir / child.name).mkdir(parents=True, exist_ok=True)
    except Exception:
        # Template sync is best-effort and must not block downloads.
        pass


def _get_sessionid_from_loader(L):
    return L.context._session.cookies.get('sessionid', domain='.instagram.com') or ''


def _mobile_api_session(sessionid: str):
    import requests as _req
    s = _req.Session()
    s.cookies.set('sessionid', sessionid, domain='.instagram.com', path='/')
    s.headers.update({
        'User-Agent': MOBILE_UA,
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
    })
    return s


def _get_json_with_retry(ms, url: str, params=None, attempts: int = 4):
    last_err = None
    for i in range(1, attempts + 1):
        try:
            r = ms.get(url, params=params, timeout=25)
            if r.status_code == 429:
                wait = min(60, 5 * (2 ** (i - 1)))
                print(f"⏳  接口限流（429），第 {i}/{attempts} 次，等待 {wait}s 后重试…")
                time.sleep(wait + random.uniform(0, 1.5))
                continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_err = e
            if i < attempts:
                wait = min(30, 3 * i)
                time.sleep(wait + random.uniform(0, 1.0))
                continue
            break
    raise last_err or RuntimeError('request_failed')


def _resolve_user_id_by_username(ms, username: str) -> str:
    # Fallback-0: parse user id from public profile HTML to avoid API 429.
    try:
        r = ms.get(f'https://www.instagram.com/{username}/', timeout=20)
        if r.status_code == 200:
            text = r.text or ''
            m = re.search(r'"profilePage_([0-9]+)"', text)
            if m:
                return m.group(1)
            m2 = re.search(r'"id":"([0-9]{5,})"', text)
            if m2:
                return m2.group(1)
    except Exception:
        pass

    candidates = [
        ('https://www.instagram.com/api/v1/users/web_profile_info/', {'username': username}),
        ('https://i.instagram.com/api/v1/users/web_profile_info/', {'username': username}),
        (f'https://i.instagram.com/api/v1/users/{username}/usernameinfo/', None),
    ]
    for url, params in candidates:
        try:
            data = _get_json_with_retry(ms, url, params=params, attempts=4)
            user = (data.get('data') or {}).get('user') or data.get('user') or {}
            uid = str(user.get('id') or user.get('pk') or '')
            if uid:
                return uid
        except Exception:
            continue
    raise RuntimeError('cannot_resolve_user_id')


def _extract_mobile_items(ms, user_id: str, limit: int):
    items = []
    max_id = None
    # limit <= 0 means "fetch all available pages".
    fetch_all = limit <= 0
    while fetch_all or len(items) < limit:
        batch_count = 33 if fetch_all else min(33, limit - len(items))
        params = {'count': batch_count}
        if max_id:
            params['max_id'] = max_id
        data = _get_json_with_retry(
            ms,
            f'https://i.instagram.com/api/v1/feed/user/{user_id}/',
            params=params,
            attempts=4,
        )
        batch = data.get('items') or []
        if not batch:
            break
        items.extend(batch)
        max_id = data.get('next_max_id')
        if not max_id:
            break
    return items if fetch_all else items[:limit]


def _post_from_mobile_item(item):
    import datetime as _dt
    ts = int(item.get('taken_at') or 0)
    dt = _dt.datetime.fromtimestamp(ts)
    shortcode = item.get('code') or item.get('id', 'unknown')
    caption = ((item.get('caption') or {}).get('text')) or ''
    location = item.get('location') or {}
    is_video = bool(item.get('media_type') == 2)

    sidecar = []
    if item.get('media_type') == 8:
        for c in item.get('carousel_media') or []:
            iv = (c.get('image_versions2') or {}).get('candidates') or []
            display = (iv[0].get('url') if iv else '') or ''
            vvs = c.get('video_versions') or []
            video = (vvs[0].get('url') if vvs else None)
            sidecar.append(SimpleNamespace(
                display_url=display,
                is_video=bool(video),
                video_url=video,
            ))

    iv_main = (item.get('image_versions2') or {}).get('candidates') or []
    main_img = (iv_main[0].get('url') if iv_main else '') or ''
    vv_main = item.get('video_versions') or []
    main_video = (vv_main[0].get('url') if vv_main else None)
    return SimpleNamespace(
        date_local=dt,
        shortcode=shortcode,
        caption=caption,
        typename='GraphSidecar' if item.get('media_type') == 8 else 'GraphImage',
        is_video=is_video,
        url=main_img,
        video_url=main_video,
        likes=item.get('like_count'),
        _node={'location': {'name': location.get('name', ''), 'id': location.get('pk')}},
        get_sidecar_nodes=lambda: sidecar,
        location=SimpleNamespace(name=location.get('name', ''), id=location.get('pk')),
    )


# ── 主函数 ────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(
        description='Instagram 下载器，配合本地相册查看器 (local-ig.html) 使用',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('username', nargs='?', default=None,
        help='Instagram 用户名（不含 @）')
    parser.add_argument('--fix-path', metavar='DIR', default=None,
        help='修复指定文件夹的 _path.txt（文件夹改名/移动后使用，无需 username）')
    parser.add_argument('--login', action='store_true',
        help='登录 Instagram（支持私密账号 / 提高请求限额）')
    parser.add_argument('--cookies-from-browser', metavar='BROWSER', default=None,
        help='从浏览器加载已登录 Cookie，免输密码。可选值: chrome / firefox / edge / safari')
    parser.add_argument('--sessionid', metavar='SID', default=None,
        help='直接传入 Instagram sessionid cookie 值（从浏览器 DevTools 复制）')
    parser.add_argument('--check', action='store_true',
        help='只查询帖子总数，不下载（快速确认账号可访问性）')
    parser.add_argument('--count', type=int, metavar='N',
        help='最多下载 N 条最新帖子（默认全部）；与 --start/--end 互斥')
    parser.add_argument('--start', type=int, default=None, metavar='N',
        help='范围模式：从第 N 条开始下载（1 = 最新，与 --end 配合使用）')
    parser.add_argument('--end', type=int, default=None, metavar='N',
        help='范围模式：下载到第 N 条为止（与 --start 配合使用）')
    parser.add_argument('--output', default=str(Path(__file__).resolve().parent/'downloads'), metavar='DIR',
        help='下载根目录（默认: 脚本所在目录/downloads）')
    parser.add_argument('--delay', type=float, default=2.0, metavar='SEC',
        help='帖子间隔秒数，降低限流概率（默认: 2.0）')
    parser.add_argument('--doctor', action='store_true',
        help='打印脚本自检信息（版本、路径、是否支持 --sessionid）后退出')
    args = parser.parse_args()

    if args.doctor:
        version = 'unknown'
        try:
            version = (Path(__file__).resolve().parent / 'VERSION').read_text(encoding='utf-8').strip()
        except Exception:
            pass
        print('IG Downloader Doctor')
        print(f'  script_path: {Path(__file__).resolve()}')
        print(f'  version: {version}')
        print('  supports_sessionid: yes')
        print('  supports_cookies_from_browser: yes')
        print('  tip: if you do not see these lines, you are likely running an old script')
        sys.exit(0)

    # --fix-path 模式：只更新 _path.txt，不下载
    if args.fix_path is not None:
        target = Path(args.fix_path).resolve()
        if not target.exists() or not target.is_dir():
            print(f"❌  文件夹不存在: {target}")
            sys.exit(1)
        abs_path = str(target).replace('\\', '/')
        (target / '_path.txt').write_text(abs_path, encoding='utf-8')
        print(f"✓  {target.name}/_path.txt 已更新：{abs_path}")
        sys.exit(0)

    if not args.username:
        parser.error("请提供 username，或使用 --fix-path DIR 修复路径")

    # 加载依赖
    instaloader = _require('instaloader')
    requests    = _require('requests')

    # --check 模式：只查询帖数，不创建目录
    if not args.check:
        output_dir  = Path(args.output)
        profile_dir = output_dir / args.username
        profile_dir.mkdir(parents=True, exist_ok=True)
        _sync_role1_template_dirs(profile_dir)
        (profile_dir / '_path.txt').write_text(
            str(profile_dir.resolve()).replace('\\', '/'),
            encoding='utf-8',
        )
        print(f"\n{'─'*48}")
        print(f"  📸  本地相册 · IG 下载器")
        print(f"{'─'*48}")
        print(f"  目标账号: @{args.username}")
        print(f"  保存位置: {profile_dir.resolve()}")
        print(f"{'─'*48}\n")
    else:
        profile_dir = None
        print(f"\n🔢  查询 @{args.username} 的帖子总数…")

    # 初始化 Instaloader（--check 模式减少重试次数，快速失败）
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
        max_connection_attempts=1 if args.check else 3,
    )

    # 从浏览器加载 Cookie（免密登录）
    if args.cookies_from_browser:
        browser = args.cookies_from_browser.lower()
        print(f"🍪  从 {browser} 加载 Cookie…")
        try:
            browser_cookie3 = _require('browser_cookie3', 'browser-cookie3')
            fn = getattr(browser_cookie3, browser, None)
            if fn is None:
                print(f"❌  不支持的浏览器: {browser}，可选: chrome / firefox / edge")
                sys.exit(1)
            cj = fn(domain_name='.instagram.com')
            L.context._session.cookies.update(cj)
            sid = L.context._session.cookies.get('sessionid', domain='.instagram.com')
            if not sid:
                print(f"❌  未找到 sessionid，请确认已在 {browser} 中登录 Instagram")
                print(f"    或改用: --sessionid <从 DevTools 复制的值>")
                sys.exit(1)
            _apply_ig_auth(L, sid)
            ds_user = L.context._session.cookies.get('ds_user', domain='.instagram.com')
            if ds_user:
                L.context.username = ds_user
            print(f"✓ Cookie 加载成功（{f'@{ds_user}，' if ds_user else ''}sessionid={sid[:12]}…）\n")
        except SystemExit:
            raise
        except Exception as e:
            print(f"❌  Cookie 加载失败: {e}")
            print(f"    提示：Chrome 必须完全关闭后再运行本脚本")
            print(f"    或改用: --sessionid <从 DevTools 复制的值>")
            sys.exit(1)

    # 直接传入 sessionid
    if args.sessionid:
        print(f"🔑  使用手动 sessionid…")
        sid = _clean_sessionid(args.sessionid)
        if not sid:
            print("❌  sessionid 为空，请重新复制后重试")
            sys.exit(1)
        _apply_ig_auth(L, sid)
        # 抓取已登入用户名，让 instaloader 使用已登入 API endpoint
        uid = sid.split(':')[0]  # sessionid 首段即 user_id
        uname = ''
        _mobile_ua = 'Instagram 219.0.0.12.117 Android (28/9; 420dpi; 1080x2160; samsung; SM-G960F; star2lte; samsungexynos9810; en_US; 301006047)'
        for _url in [
            f'https://i.instagram.com/api/v1/users/{uid}/info/',
            'https://i.instagram.com/api/v1/accounts/current_user/',
        ]:
            try:
                import requests as _req
                resp = _req.get(
                    _url,
                    cookies={'sessionid': sid},
                    headers={'User-Agent': _mobile_ua, 'X-IG-App-ID': '936619743392459'},
                    timeout=10,
                )
                data = resp.json()
                uname = (data.get('user') or {}).get('username', '')
                if uname:
                    break
            except Exception:
                continue
        if uname:
            L.context.username = uname
            print(f"✓ sessionid 已设置，登入用户: @{uname}\n")
        else:
            print(f"✓ sessionid 已设置（{sid[:12]}…）\n")

    # 登录
    if args.login:
        import getpass
        login_user = input("你的 Instagram 用户名: ").strip()
        password   = getpass.getpass("密码（输入时不显示）: ")
        try:
            L.login(login_user, password)
            print("✓ 登录成功\n")
        except instaloader.exceptions.BadCredentialsException:
            print("❌ 密码错误，请确认后重试")
            sys.exit(1)
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            code = input("请输入双重验证码: ").strip()
            try:
                L.two_factor_login(code)
                print("✓ 双重验证成功\n")
            except Exception as e:
                print(f"❌ 验证失败: {e}")
                sys.exit(1)
        except Exception as e:
            print(f"❌ 登录失败: {e}")
            sys.exit(1)

    # 获取 Profile
    print("🔍  获取账号信息…")
    try:
        profile = instaloader.Profile.from_username(L.context, args.username)
    except instaloader.exceptions.ProfileNotExistsException:
        print(f"❌  无法获取 @{args.username}")
        print(f"    可能原因：① 账号不存在  ② Instagram 要求登录（403）")
        print(f"\n  💡 解决方案（按推荐顺序）：")
        print(f"     1. 在 Chrome 中登录 Instagram，然后加 --cookies-from-browser chrome")
        print(f"     2. 加 --login 参数，手动输入 Instagram 账号密码")
        sys.exit(1)
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        print(f"❌  @{args.username} 是私密账号")
        print(f"    请加 --login 参数，以关注者身份访问")
        sys.exit(1)
    except Exception as e:
        msg = str(e)
        print(f"❌  获取失败: {msg}")
        if '403' in msg or 'Forbidden' in msg:
            print(f"\n  💡 Instagram 拒绝了匿名 GraphQL 请求（403）")
            print(f"     建议优先使用：--cookies-from-browser chrome")
            print(f"     其次使用：--sessionid <从 DevTools 复制的值>")
            print(f"     或最後再試：--login")
        elif '401' in msg or 'Unauthorized' in msg or 'wait a few minutes' in msg:
            print(f"\n  💡 Instagram 要求登录验证，请在命令末尾加上 --login 参数后重试")
        sys.exit(1)

    total = None
    try:
        total = profile.mediacount
    except Exception as e:
        print(f"⚠️  无法读取帖子总数（mediacount）：{e}")
        print("    将切换为降级模式继续下载（建议同时提供 --count）")

    if args.check:
        if total is None:
            print("\n  ⚠️  当前会话无法查询总数（GraphQL 受限）")
            print("  → 请改用 --count N 直接下载最新 N 条\n")
            sys.exit(2)
        print(f"\n  ✓  @{profile.username}  共 {total} 条帖子")
        print(f"\n  → 请将 {total} 填入页面的帖数输入框，选择下载范围\n")
        sys.exit(0)

    session = requests.Session()

    try:
        if args.start is not None or args.end is not None:
            if total is None:
                print("❌  当前会话无法读取总数，暂不支持 --start/--end 范围模式")
                print("    请改用 --count N，或切换登录方式后重试")
                sys.exit(1)
            start = max(1, args.start or 1)
            end   = min(args.end or total, total)
            limit = max(0, end - start + 1)
            posts_iter = islice(profile.get_posts(), start - 1, end)
            print(f"✓  @{profile.username}  {total} 条帖子，准备下载第 {start}–{end} 条（共 {limit} 条）\n")
        else:
            if args.count:
                limit = min(args.count, total) if total is not None else args.count
                posts_iter = islice(profile.get_posts(), limit)
                total_label = f"{total} 条帖子，" if total is not None else ""
                print(f"✓  @{profile.username}  {total_label}准备下载最新 {limit} 条\n")
            else:
                if total is None:
                    print("❌  当前会话无法读取总数，且未提供 --count")
                    print("    请改用: --count N（例如 --count 200）")
                    sys.exit(1)
                limit = total
                posts_iter = islice(profile.get_posts(), limit)
                print(f"✓  @{profile.username}  {total} 条帖子，准备下载最新 {limit} 条\n")
    except instaloader.exceptions.QueryReturnedBadRequestException as e:
        print(f"⚠️  GraphQL 接口受限：{e}")
        print("    尝试切换到移动端 API 降级模式…")
        sid = _get_sessionid_from_loader(L)
        if not sid:
            print("❌  降级模式需要有效 sessionid（请填写 Session ID 或使用可读 Cookie）")
            sys.exit(1)
        if args.start is not None or args.end is not None:
            print("❌  降级模式暂不支持 --start/--end，请改用 --count")
            sys.exit(1)
        try:
            ms = _mobile_api_session(sid)
            uid = _resolve_user_id_by_username(ms, args.username)
            mobile_limit = int(args.count or 0)
            if mobile_limit <= 0:
                print("ℹ️  降级模式：未指定 --count，尝试抓取全部可见帖子（可能较慢）")
            raw_items = _extract_mobile_items(ms, uid, mobile_limit)
            posts = [_post_from_mobile_item(it) for it in raw_items]
            posts_iter = iter(posts)
            limit = len(posts)
            print(f"✓  降级模式就绪，获取到 {limit} 条，准备下载\n")
        except Exception as fallback_err:
            print(f"❌  降级模式失败：{fallback_err}")
            print("    请更换 sessionid 后重试")
            sys.exit(1)
    done = skip = fail = 0
    incomplete = False
    i = 0

    while True:
        # 获取下一条帖子，遇到限流时自动等待重试
        post = None
        for attempt in range(1, RATE_LIMIT_RETRIES + 1):
            try:
                post = next(posts_iter)
                break
            except StopIteration:
                post = None
                break
            except KeyboardInterrupt:
                print("\n\n⚠️  手动中断")
                sys.exit(0)
            except Exception as e:
                if attempt < RATE_LIMIT_RETRIES:
                    wait = RATE_LIMIT_WAIT * attempt          # 5 / 10 / 15 / 20 分钟
                    jitter = random.uniform(0, 30)
                    total = int(wait + jitter)
                    print(f"\n⏳  被限流（第 {attempt} 次），等待 {total} 秒后重试…")
                    print(f"    已成功下载 {done} 条 | 错误: {e}")
                    try:
                        time.sleep(total)
                    except KeyboardInterrupt:
                        print("\n\n⚠️  手动中断")
                        sys.exit(0)
                else:
                    print(f"\n⚠️  获取帖子列表失败（已重试 {RATE_LIMIT_RETRIES} 次）: {e}")
                    print(f"    已成功下载 {done} 条，请等待更长时间后重新运行脚本")
                    print(f"    ※ 已下载的帖子不会重复下载，直接重跑即可续传")
                    incomplete = True

        if post is None:
            break

        i += 1
        pct = int(i / limit * 100) if limit else 0
        bar_w = 20
        filled = int(bar_w * i / limit) if limit else 0
        bar = '█' * filled + '░' * (bar_w - filled)
        loc_str = ''
        total_mark = str(limit) if limit else '?'
        print(f"\n[{i}/{total_mark}] {bar} {pct}%  {post.date_local.strftime('%Y-%m-%d')}  /p/{post.shortcode}{loc_str}")
        try:
            result = process_post(post, profile_dir, session, args.delay)
            if result == 'ok':
                done += 1
                print(f"  ✓  已下載（共 {done} 條）")
            elif result == 'skip':
                skip += 1
                print(f"  ↳  已存在，跳過")
            else:
                fail += 1
        except KeyboardInterrupt:
            print("\n\n⚠️  手动中断")
            break
        except Exception as e:
            print(f"  ✗  意外错误: {e}")
            fail += 1

        if i < limit:
            jitter = random.uniform(0, args.delay * 0.5)
            wait_total = args.delay + jitter
            print(f"  ⏱  等待 {wait_total:.1f}s…", end='\r')
            time.sleep(wait_total)

    resolved = profile_dir.resolve()

    print(f"\n{'─'*48}")
    print(f"  ✅  完成  下载 {done} | 已有 {skip} | 失败 {fail}")
    print(f"{'─'*48}")
    if incomplete:
        print("  ⚠️  本次未完整跑完目标列表（通常是限流或网络导致）")
    print(f"\n  📂  文件夹已自动打开: {resolved}")
    print(f"  🔗  {resolved.as_uri()}")
    print(f"\n  📱  在本地相册中查看:")
    print(f"      1. 用 Chrome / Edge 打开 local-ig.html")
    print(f"      2. 点「选择文件夹」，选择上方目录")
    print()

    open_folder(resolved)
    if incomplete:
        return 2
    if fail > 0:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
