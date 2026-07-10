#!/usr/bin/env python3
"""
小红书下载器 (Playwright 版) — 配合本地相册查看器 (local-ig.html) 使用

安装依赖（只需一次）:
    pip install playwright requests
    playwright install chromium

用法:
    python xhs_download.py <用户主页URL或user_id>
    python xhs_download.py <user_id> --count 50
    python xhs_download.py <user_id> --output D:/photos
    python xhs_download.py <user_id> --cookie "your_cookie_string"
    python xhs_download.py <user_id> --fast          # 仅封面图，速度快

下载完成后:
    1. 用 Chrome / Edge 打开 local-ig.html
    2. 点「选择文件夹」，选中 downloads/<user_id> 目录
    3. 所有笔记自动导入，文案、时间、地点全部就位
"""

import asyncio
import json
import os

if False:
    import playwright
    import requests

import sys
import time
import random
import platform
import subprocess
import argparse
import re
import shutil
from pathlib import Path
from datetime import datetime


COOKIE_FILE  = Path(__file__).resolve().parent / 'xhs_cookie.txt'
BASE_URL     = 'https://www.rednote.com'
PROFILE_PATH = '/user/profile'


# ── 工具函数 ──────────────────────────────────────────────────────────────────
def open_folder(path: Path):
    try:
        system = platform.system()
        if system == 'Windows':
            os.startfile(str(path))
        elif system == 'Darwin':
            subprocess.run(['open', str(path)], check=True)
        else:
            subprocess.run(['xdg-open', str(path)], check=True)
    except Exception:
        pass


def _require(pkg, install_name=None):
    try:
        return __import__(pkg)
    except ImportError:
        name = install_name or pkg
        print(f"[依赖] 未找到 {name}，正在尝试自动安装...")
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--quiet", name],
                check=True,
                timeout=120
            )
            print(f"[依赖] {name} 安装成功，正在重新导入...")
            return __import__(pkg)
        except Exception as e:
            print(f"\n❌  自动安装失败: {e}")
            print(f"    请手动运行: pip install {name}\n")
            sys.exit(1)


def load_cookie():
    if COOKIE_FILE.exists():
        cookie = COOKIE_FILE.read_text(encoding='utf-8').strip()
        if cookie:
            print(f"✓  已加载 Cookie（来自 {COOKIE_FILE.name}）")
            return cookie

    print("""
╔══════════════════════════════════════════════════════════════╗
║              获取小红书 Cookie 的步骤                        ║
╠══════════════════════════════════════════════════════════════╣
║  1. 用 Chrome/Edge 打开 https://www.rednote.com             ║
║  2. 登录你的账号                                             ║
║  3. 按 F12 → Network 标签 → 刷新页面                        ║
║  4. 点任意请求 → Request Headers → 找 cookie 行             ║
║  5. 复制整行 cookie 值（一长串文字）                         ║
╚══════════════════════════════════════════════════════════════╝
""")
    try:
        cookie = input("请粘贴 Cookie 值（直接回车退出）: ").strip()
    except EOFError:
        print("\n❌  错误：未找到已保存的 Cookie，且当前处于非交互式后台环境，无法输入。")
        print("    请在本地相册界面的“小红书 Cookie”输入框中填写 Cookie，或在终端中以交互模式运行此脚本。")
        sys.exit(1)

    if not cookie:
        print("❌  未输入 Cookie，退出")
        sys.exit(1)
    COOKIE_FILE.write_text(cookie, encoding='utf-8')
    print(f"✓  Cookie 已保存到 {COOKIE_FILE.name}，下次无需重新输入\n")
    return cookie


def parse_user_id(user_input: str) -> str:
    m = re.search(r'/user/profile/([0-9a-fA-F]{20,})', user_input)
    return m.group(1) if m else user_input.strip()


def _cookie_str_to_list(cookie_str: str) -> list:
    """将 cookie 字符串转为 Playwright 所需的 cookie 列表。"""
    cookies = []
    for item in cookie_str.split(';'):
        item = item.strip()
        if '=' not in item:
            continue
        k, v = item.split('=', 1)
        k, v = k.strip(), v.strip()
        for domain in ('.rednote.com', '.xiaohongshu.com'):
            cookies.append({'name': k, 'value': v, 'domain': domain, 'path': '/'})
    return cookies


# ── 下载图片 / 视频 ───────────────────────────────────────────────────────────
DOWNLOAD_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ),
    'Referer': 'https://www.rednote.com/',
    'Accept':  'image/webp,image/apng,image/*,*/*;q=0.8',
}


def download_file(url, path, session, stream=False):
    r = session.get(url, headers=DOWNLOAD_HEADERS, timeout=60, stream=stream)
    r.raise_for_status()
    if stream:
        size = 0
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    size += len(chunk)
        return size
    data = r.content
    path.write_bytes(data)
    return len(data)


def _extract_img_url(img: dict) -> str:
    for key in ('url', 'url_default', 'original_url'):
        if img.get(key):
            return img[key]
    info_list = img.get('info_list') or []
    if info_list:
        return info_list[-1].get('url', '')
    return ''


# ── 从笔记数据提取媒体 URL ─────────────────────────────────────────────────────
def _extract_media(note: dict):
    """返回 (image_urls, video_url, is_video)。"""
    is_video   = (note.get('type') == 'video')
    image_urls = []
    video_url  = None

    if is_video:
        # 视频 URL：尝试多条路径
        try:
            streams = note['video']['media']['stream']
            for q in ('h264', 'h265', 'av1'):
                lst = streams.get(q) or []
                if lst:
                    video_url = lst[0].get('master_url') or lst[0].get('backup_urls', [''])[0] or lst[0].get('url', '')
                    if video_url:
                        break
        except (KeyError, TypeError):
            pass
        if not video_url:
            # 备用路径
            try:
                video_url = note['video']['media'].get('video_url', '') or \
                            note['video'].get('url', '')
            except (KeyError, TypeError):
                pass
        # 封面（视频只取第一张）
        for img in (note.get('image_list') or []):
            url = _extract_img_url(img)
            if url:
                image_urls.append(url)
                break
    else:
        # 图文：全部图片
        for img in (note.get('image_list') or []):
            url = _extract_img_url(img)
            if url:
                image_urls.append(url)

    # 兜底封面（brief 只有 cover）
    if not image_urls:
        cover = note.get('cover') or {}
        url = cover.get('url') or cover.get('url_default', '')
        if url:
            image_urls.append(url)

    return image_urls, video_url, is_video


# ── 保存单条笔记 ──────────────────────────────────────────────────────────────
def _ts_from_note_id(note_id: str) -> datetime:
    """XHS note_id 前 8 位是 Unix 秒时间戳（MongoDB ObjectID 风格）。"""
    try:
        return datetime.fromtimestamp(int(note_id[:8], 16))
    except Exception:
        return datetime.now()


def save_note(note: dict, note_brief: dict, profile_dir: Path, session):
    note_id = note.get('note_id') or note.get('id') or note_brief.get('note_id', '')
    ts_ms   = note.get('time', 0) or note_brief.get('time', 0)
    dt      = datetime.fromtimestamp(ts_ms / 1000) if ts_ms else _ts_from_note_id(note_id)
    date_str = dt.strftime('%Y-%m-%d')

    post_dir = profile_dir / f"{date_str}_{note_id}"
    if (post_dir / 'meta.json').exists():
        print(f"  ↳ 已存在，跳过")
        return 'skip'

    post_dir.mkdir(parents=True, exist_ok=True)
    image_urls, video_url, is_video = _extract_media(note)

    if not image_urls and not video_url:
        shutil.rmtree(post_dir, ignore_errors=True)
        print(f"  ↳ 无媒体，跳过")
        return 'skip'

    # 下载图片
    downloaded = 0
    for idx, url in enumerate(image_urls, 1):
        try:
            size = download_file(url, post_dir / f"{idx}.jpg", session)
            end  = '\r' if idx < len(image_urls) else '\n'
            print(f"  ↳ 图片 {idx}/{len(image_urls)}  ({size//1024} KB)", end=end, flush=True)
            downloaded += 1
            if idx < len(image_urls):
                time.sleep(0.3)
        except Exception as e:
            print(f"  ↳ 图片 {idx} 失败: {e}")

    # 下载视频
    if video_url:
        try:
            size = download_file(video_url, post_dir / '1.mp4', session, stream=True)
            print(f"  ↳ 视频  ({size//1024} KB)")
        except Exception as e:
            print(f"  ↳ 视频失败: {e}")

    if downloaded == 0 and not (post_dir / '1.mp4').exists():
        shutil.rmtree(post_dir, ignore_errors=True)
        return 'fail'

    # 文案
    title   = (note.get('title') or note.get('display_title') or '').strip()
    desc    = (note.get('desc')  or '').strip()
    caption = '\n'.join(filter(None, [title, desc]))

    # 位置
    loc_info      = note.get('location') or {}
    location_name = loc_info.get('name', '') if isinstance(loc_info, dict) else str(loc_info or '')

    # 点赞
    likes = None
    try:
        interact     = note.get('interact_info') or {}
        liked_count  = interact.get('liked_count') or interact.get('like_count', '')
        if liked_count and str(liked_count).isdigit():
            likes = int(liked_count)
    except Exception:
        pass

    meta = {
        'caption':     caption,
        'date':        dt.isoformat(),
        'location':    location_name,
        'shortcode':   note_id,
        'ig_url':      f'https://www.rednote.com/discovery/item/{note_id}',
        'is_video':    is_video,
        'image_count': len(image_urls),
        'source':      'xhs',
    }
    if likes is not None:
        meta['likes'] = likes

    (post_dir / 'meta.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8'
    )

    preview = caption.split('\n')[0][:72] if caption else '（无文案）'
    if len(caption) > 72:
        preview += '…'
    print(f"  ✓ {preview}")
    return 'ok'


# ── Playwright 异步核心 ───────────────────────────────────────────────────────
async def _playwright_run(cookie_str, user_id, profile_dir, session, delay, limit, fast_mode):
    from playwright.async_api import async_playwright

    notes_brief   = []      # 从 user_posted 收集的简要数据
    detail_cache  = {}      # note_id → 详情数据（从笔记页拦截）

    async with async_playwright() as pw:
        # 优先使用系统 Chrome（避免被 XHS 识别为自动化浏览器）
        import os
        chrome_path = Path(os.environ.get('LOCALAPPDATA','')) / 'Google/Chrome/Application/chrome.exe'
        launch_kwargs = dict(headless=False, args=[
            '--disable-blink-features=AutomationControlled',
            '--no-first-run', '--no-default-browser-check',
        ])
        if chrome_path.exists():
            launch_kwargs['executable_path'] = str(chrome_path)

        browser = await pw.chromium.launch(**launch_kwargs)
        ctx = await browser.new_context(
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
            ),
            locale='zh-TW',
        )
        # 隐藏自动化特征
        await ctx.add_init_script("""
            delete Object.getPrototypeOf(navigator).webdriver;
            window.chrome = {runtime: {}, loadTimes: function(){}, csi: function(){}, app: {}};
            Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['zh-TW','zh','en']});
        """)
        await ctx.add_cookies(_cookie_str_to_list(cookie_str))

        # ── 第一阶段：滚动主页，收集笔记列表 ──────────────────────────────
        page = await ctx.new_page()

        async def _on_user_posted(response):
            if 'user_posted' not in response.url:
                return
            try:
                data = await response.json()
                if data.get('success'):
                    batch = (data.get('data') or {}).get('notes') or []
                    notes_brief.extend(batch)
                    print(f"  → 已获取 {len(notes_brief)} 条…", end='\r', flush=True)
            except Exception:
                pass

        page.on('response', _on_user_posted)

        print(f"🌐  打开主页…")
        await page.goto(f'{BASE_URL}{PROFILE_PATH}/{user_id}', wait_until='domcontentloaded', timeout=30_000)
        await asyncio.sleep(3)

        # 滚动直到不再增加
        prev = 0
        stall = 0
        while True:
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2.5)
            cur = len(notes_brief)
            if limit and cur >= limit:
                break
            if cur == prev:
                stall += 1
                if stall >= 3:
                    break
            else:
                stall = 0
                prev  = cur

        page.remove_listener('response', _on_user_posted)
        if limit:
            notes_brief[:] = notes_brief[:limit]

        total = len(notes_brief)
        print(f"\n✓  共获取 {total} 条笔记列表\n")

        if not total:
            await browser.close()
            return 0, 0, 0

        # ── 第二阶段：逐条点击笔记卡片获取详情 ────────────────────────────
        done = skip = fail = 0

        if not fast_mode:
            # 滚回顶部，让 Profile 卡片重新渲染
            print("🔄  回到顶部…")
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(2)

        for i, brief in enumerate(notes_brief, 1):
            note_id   = brief.get('note_id') or brief.get('id', '?')
            note_type = brief.get('type', 'normal')
            ts_ms     = brief.get('time', 0)
            date_hint = datetime.fromtimestamp(ts_ms / 1000).strftime('%Y-%m-%d') if ts_ms else '?'
            pct = int(i / total * 100) if total else 0
            bar_w = 20
            filled = int(bar_w * i / total) if total else 0
            bar = '█' * filled + '░' * (bar_w - filled)
            print(f"\n[{i}/{total}] {bar} {pct}%  {date_hint}  {note_id}  {'🎬' if note_type == 'video' else '🖼️ '}")

            # 已有 meta.json 直接跳过
            if profile_dir.exists():
                existing = next(
                    (d for d in profile_dir.iterdir()
                     if d.is_dir() and note_id in d.name and (d / 'meta.json').exists()),
                    None
                )
                if existing:
                    print(f"  ↳ 已存在，跳过")
                    skip += 1
                    continue

            note_data = dict(brief)

            if not fast_mode:
                detail = {}

                # ── 响应拦截器：寻找含 image_list 或 video 的 API 响应 ──
                async def _on_detail(response):
                    if detail.get('note'):
                        return
                    try:
                        if response.status != 200:
                            return
                        ct = response.headers.get('content-type', '')
                        if 'json' not in ct:
                            return
                        url = response.url
                        if 'rednote.com' not in url and 'xiaohongshu.com' not in url:
                            return
                        d = await response.json()
                        if not d.get('success'):
                            return
                        data = d.get('data') or {}
                        # 结构 1: data.items[].note_card
                        for item in (data.get('items') or []):
                            card = item.get('note_card') or item
                            if isinstance(card, dict) and (card.get('image_list') or card.get('video')):
                                detail['note'] = card
                                return
                        # 结构 2: data.note
                        nd = data.get('note')
                        if isinstance(nd, dict) and (nd.get('image_list') or nd.get('video')):
                            detail['note'] = nd
                            return
                        # 结构 3: data 本身就是 note
                        if data.get('image_list') or data.get('video'):
                            detail['note'] = data
                    except Exception:
                        pass

                page.on('response', _on_detail)
                try:
                    # ── 在 profile 页面找到并点击该笔记的卡片 ──
                    selector = f'a[href*="{note_id}"]'
                    clicked  = False

                    for attempt in range(20):          # 最多向下滚动 20 次
                        try:
                            elem    = page.locator(selector).first
                            visible = await elem.is_visible(timeout=400)
                            if visible:
                                await elem.scroll_into_view_if_needed()
                                await asyncio.sleep(0.3)
                                await elem.click()
                                clicked = True
                                break
                        except Exception:
                            pass
                        # 向下滚一小段，等虚拟列表渲染新卡片
                        await page.evaluate('window.scrollBy(0, 350)')
                        await asyncio.sleep(0.6)

                    if not clicked:
                        print(f"  ↳ [未找到笔记卡片，使用封面简要]")
                    else:
                        # 等待 API 响应（最多 5 秒）
                        for _ in range(10):
                            if detail.get('note'):
                                break
                            await asyncio.sleep(0.5)

                        # 备用：从 Pinia / Vuex 状态树提取
                        if not detail.get('note'):
                            try:
                                raw = await page.evaluate(f'''() => {{
                                    try {{
                                        // Pinia store
                                        const pinia = window.__pinia;
                                        if (pinia) {{
                                            for (const storeState of Object.values(pinia.state.value)) {{
                                                const find = (obj, depth) => {{
                                                    if (depth > 6 || !obj || typeof obj !== 'object') return null;
                                                    if (Array.isArray(obj)) {{
                                                        for (const it of obj) {{ const r = find(it, depth+1); if (r) return r; }}
                                                    }} else {{
                                                        if (obj.note_id === '{note_id}' && (obj.image_list || obj.video)) return obj;
                                                        for (const v of Object.values(obj)) {{ const r = find(v, depth+1); if (r) return r; }}
                                                    }}
                                                    return null;
                                                }};
                                                const found = find(storeState, 0);
                                                if (found) return JSON.stringify(found);
                                            }}
                                        }}
                                        // __INITIAL_STATE__
                                        const s = window.__INITIAL_STATE__;
                                        const map = s?.note?.noteDetailMap || s?.noteDetailMap || {{}};
                                        for (const [k, v] of Object.entries(map)) {{
                                            const nd = v?.note || v;
                                            if ((k === '{note_id}' || nd?.note_id === '{note_id}') && (nd?.image_list || nd?.video))
                                                return JSON.stringify(nd);
                                        }}
                                    }} catch(e) {{}}
                                    return null;
                                }}''')
                                if raw:
                                    nd = json.loads(raw)
                                    if isinstance(nd, dict) and (nd.get('image_list') or nd.get('video')):
                                        detail['note'] = nd
                            except Exception:
                                pass

                        # 关闭弹窗（Escape）
                        await page.keyboard.press('Escape')
                        await asyncio.sleep(0.8)

                except Exception as e:
                    print(f"  ↳ [点击失败: {e}]")
                finally:
                    page.remove_listener('response', _on_detail)

                if detail.get('note'):
                    note_data = detail['note']
                    note_data.setdefault('time', brief.get('time', 0))
                    note_data.setdefault('note_id', note_id)
                    note_data.setdefault('type', brief.get('type', 'normal'))
                    img_cnt = len(note_data.get('image_list') or [])
                    print(f"  ↳ 拦截到详情 ({'视频' if note_data.get('type')=='video' else f'{img_cnt} 张图'})")
                else:
                    print(f"  ↳ [未拦截到详情，使用封面简要]")

            try:
                result = save_note(note_data, brief, profile_dir, session)
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

            if i < total:
                wait_total = delay + random.uniform(0, delay * 0.4)
                print(f"  ⏱  等待 {wait_total:.1f}s…", end='\r')
                time.sleep(wait_total)

        await browser.close()

    return done, skip, fail


# ── 主函数 ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='小红书下载器 (Playwright 版)，配合本地相册查看器 (local-ig.html) 使用',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('user', nargs='?', default=None,
        help='小红书用户主页 URL 或 user_id')
    parser.add_argument('--fix-path', metavar='DIR', default=None,
        help='修复指定文件夹的 _path.txt（文件夹改名/移动后使用）')
    parser.add_argument('--count', type=int, metavar='N',
        help='最多下载 N 条最新笔记（默认全部）')
    parser.add_argument('--output',
        default=str(Path(__file__).resolve().parent / 'downloads'),
        metavar='DIR',
        help='下载根目录（默认: 脚本所在目录/downloads）')
    parser.add_argument('--delay', type=float, default=2.0, metavar='SEC',
        help='笔记间隔秒数（默认: 2.0）')
    parser.add_argument('--cookie', metavar='COOKIE',
        help='直接传入 Cookie 字符串（优先于保存的文件）')
    parser.add_argument('--fast', action='store_true',
        help='快速模式：只下载封面图，不导航到笔记页（速度快，但图文只有第一张）')
    args = parser.parse_args()

    # --fix-path 模式
    if args.fix_path is not None:
        target = Path(args.fix_path).resolve()
        if not target.exists() or not target.is_dir():
            print(f"❌  文件夹不存在: {target}")
            sys.exit(1)
        abs_path = str(target).replace('\\', '/')
        (target / '_path.txt').write_text(abs_path, encoding='utf-8')
        print(f"✓  {target.name}/_path.txt 已更新：{abs_path}")
        sys.exit(0)

    if not args.user:
        parser.error("请提供 user，或使用 --fix-path DIR 修复路径")

    _require('playwright', 'playwright')
    _require('requests')

    import requests as req_module

    user_id     = parse_user_id(args.user)
    output_dir  = Path(args.output)
    profile_dir = output_dir / user_id
    profile_dir.mkdir(parents=True, exist_ok=True)
    (profile_dir / '_path.txt').write_text(
        str(profile_dir.resolve()).replace('\\', '/'), encoding='utf-8'
    )

    print(f"\n{'─'*48}")
    print(f"  📕  本地相册 · 小红书下载器")
    print(f"{'─'*48}")
    print(f"  目标用户: {user_id}")
    print(f"  保存位置: {profile_dir.resolve()}")
    if args.fast:
        print(f"  模式: 快速（仅封面图）")
    print(f"{'─'*48}\n")

    cookie  = args.cookie.strip() if args.cookie else load_cookie()
    session = req_module.Session()

    done, skip, fail = asyncio.run(
        _playwright_run(cookie, user_id, profile_dir, session,
                        args.delay, args.count, args.fast)
    )

    resolved = profile_dir.resolve()
    print(f"\n{'─'*48}")
    print(f"  ✅  完成  下载 {done} | 已有 {skip} | 失败 {fail}")
    print(f"{'─'*48}")
    print(f"\n  📂  文件夹已自动打开: {resolved}")
    print(f"\n  📱  在本地相册中查看:")
    print(f"      1. 用 Chrome / Edge 打开 local-ig.html")
    print(f"      2. 点「选择文件夹」，选择上方目录")
    print()
    open_folder(resolved)


if __name__ == '__main__':
    main()
