#!/usr/bin/env python3
"""
扁平散图文件夹 → local-ig.html 兼容格式转换器

适用于以下命名规律的散图文件夹：
    YY.MM.DD 标题.jpg
    YY.MM.DD 标题 (1).jpg   YY.MM.DD 标题 (2).jpg  ...  ← 同帖多张
    YY.MM.DD 标题.mp4                                     ← 视频
    YY.MM.DD 标题.txt                                     ← 帖子文案（可选）

转换后结构（in-place，原文件夹内创建子目录）：
    YYYY-MM-DD_标题/
        1.jpg  2.jpg  ...  1.mp4
        meta.json

子目录（如「办公」「周末-城市」）会自动递归处理，结构一致。

用法:
    python flat_convert.py "F:/【Claire】/【Claire Moreno 】"
    python flat_convert.py "F:/【Claire】/【Claire Moreno 】" --dry-run
"""

import re
import sys
import json
import shutil
import argparse
from pathlib import Path
from datetime import datetime

IMG_EXT   = re.compile(r'\.(jpe?g|png|webp|heic|gif)$',  re.IGNORECASE)
VIDEO_EXT = re.compile(r'\.(mp4|mov|avi|mkv|webm)$', re.IGNORECASE)

# 剥离末尾 (N) 的正则
_NUMBERED = re.compile(r'^(.*?)\s*\((\d+)\)\s*$')
# 日期前缀：YY.M.D 或 YYYY.M.D（后面可紧跟字母/空格/分隔符）
_DATE_PREFIX = re.compile(r'^(\d{2,4})[.\-](\d{1,2})[.\-](\d{1,2})\s*(.*)')


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def strip_numbered(stem: str):
    """去掉末尾 (N)，返回 (base, index)；无序号则 index=0。"""
    m = _NUMBERED.match(stem)
    if m:
        return m.group(1).rstrip(), int(m.group(2))
    return stem, 0


def parse_date(base: str):
    """
    从 base 开头提取日期，返回 (date_str, rest)。
    date_str 格式 'YYYY-MM-DD'；若无日期返回 (None, base)。
    """
    m = _DATE_PREFIX.match(base)
    if not m:
        return None, base
    yr, mo, dy, rest = m.groups()
    yr = int(yr)
    if yr < 100:
        yr += 2000
    try:
        dt = datetime(yr, int(mo), int(dy))
    except ValueError:
        return None, base
    return dt.strftime('%Y-%m-%d'), rest.strip()


def safe_name(s: str, max_len=45) -> str:
    """去掉 Windows 路径非法字符，截断到合理长度，确保不以空格/点结尾。"""
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', s).strip(' .')
    return s[:max_len].rstrip(' .') if s else 'untitled'


# ── 核心：扫描并分组 ───────────────────────────────────────────────────────────

def scan_dir(directory: Path):
    """
    扫描 directory 下的文件，按「日期+标题」分组。

    返回 dict：
        key   = (date_str, title_str)
        value = {
            'date':   'YYYY-MM-DD',
            'title':  str,
            'images': [(idx, Path), ...],   # 按 idx 排序
            'videos': [(idx, Path), ...],
            'txt':    Path | None,
        }
    """
    groups: dict = {}

    for f in sorted(directory.iterdir()):
        if not f.is_file():
            continue
        if f.name.startswith('.') or f.name.lower() == 'desktop.ini':
            continue

        stem = f.stem
        ext  = f.suffix

        base, idx = strip_numbered(stem)
        date_str, title = parse_date(base)

        if date_str is None:
            continue  # 无日期前缀，跳过

        key = (date_str, title)
        if key not in groups:
            groups[key] = {'date': date_str, 'title': title,
                           'images': [], 'videos': [], 'txt': None}

        if ext.lower() == '.txt':
            groups[key]['txt'] = f
        elif IMG_EXT.search(ext):
            groups[key]['images'].append((idx, f))
        elif VIDEO_EXT.search(ext):
            groups[key]['videos'].append((idx, f))

    # ── TXT 二次匹配：若某 .txt 所在 key 无媒体，尝试归到同日期的唯一组 ──
    to_reassign = []
    date_media: dict = {}   # date_str → [key, ...]
    for key, g in groups.items():
        if g['images'] or g['videos']:
            date_media.setdefault(g['date'], []).append(key)

    for key, g in list(groups.items()):
        if not g['images'] and not g['videos'] and g['txt']:
            candidates = date_media.get(g['date'], [])
            if len(candidates) == 1:
                groups[candidates[0]]['txt'] = g['txt']
                to_reassign.append(key)

    for key in to_reassign:
        del groups[key]

    # 排序每组内文件
    for g in groups.values():
        g['images'].sort(key=lambda x: x[0])
        g['videos'].sort(key=lambda x: x[0])

    return groups


# ── 核心：转换单个目录 ────────────────────────────────────────────────────────

def convert_dir(directory: Path, dry_run: bool) -> tuple[int, int]:
    """处理一个目录下的散图，返回 (done, skipped)。"""
    groups = scan_dir(directory)

    if not groups:
        print("    （无符合格式的文件）")
        return 0, 0

    done = skipped = 0

    for key in sorted(groups):
        g = groups[key]
        if not g['images'] and not g['videos']:
            continue

        folder_title = safe_name(g['title']) if g['title'] else 'untitled'
        folder_name  = f"{g['date']}_{folder_title}"
        dest = directory / folder_name

        # 已转换过则跳过
        if dest.exists() and (dest / 'meta.json').exists():
            skipped += 1
            continue

        is_video    = bool(g['videos'])
        image_count = len(g['images'])

        # 读取文案
        caption = ''
        if g['txt']:
            try:
                caption = g['txt'].read_text(encoding='utf-8').strip()
            except Exception:
                pass

        # 展示标签
        tag = '📹' if is_video else f"🖼️ ×{image_count}"
        print(f"  [{tag}]  {g['date']}  {folder_title[:50]}")

        if dry_run:
            for _, p in g['images']:
                print(f"    {p.name}")
            for _, p in g['videos']:
                print(f"    {p.name}")
            if g['txt']:
                print(f"    {g['txt'].name}  ← 文案")
            print(f"    → {folder_name}/")
        else:
            dest.mkdir(exist_ok=True)

            # 直接移动到目标子目录（源目录与目标目录不同，无冲突风险）
            for new_i, (_, src) in enumerate(g['images'], 1):
                ext = src.suffix.lower()
                if ext == '.jpeg':
                    ext = '.jpg'
                src.rename(dest / f"{new_i}{ext}")

            for new_i, (_, src) in enumerate(g['videos'], 1):
                src.rename(dest / f"{new_i}.mp4")

            if g['txt']:
                g['txt'].unlink(missing_ok=True)

            meta = {
                'caption':     caption,
                'date':        None,
                'location':    '',
                'shortcode':   '',
                'ig_url':      '',
                'is_video':    is_video,
                'image_count': image_count,
                'source':      'flat',
            }
            (dest / 'meta.json').write_text(
                json.dumps(meta, ensure_ascii=False, indent=2),
                encoding='utf-8',
            )

        done += 1

    return done, skipped


# ── 主函数 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='散图文件夹 → local-ig.html 格式转换器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('path',
        help='含散图的文件夹路径（如 F:/【Claire】/【Claire Moreno 】）')
    parser.add_argument('--dry-run', action='store_true',
        help='预览模式：只显示将要执行的操作，不实际修改文件')
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists() or not root.is_dir():
        print(f"❌  路径不存在: {root}")
        sys.exit(1)

    dry = args.dry_run
    if dry:
        print(f"\n{'─'*54}")
        print(f"  🔍  预览模式（dry-run），不会修改任何文件")
        print(f"{'─'*54}\n")

    total_done = total_skip = 0

    # ── 处理根目录下的散图 ──
    print(f"\n{'─'*54}")
    print(f"  📁  {root.name}")
    print(f"{'─'*54}\n")
    d, s = convert_dir(root, dry)
    total_done += d
    total_skip += s

    # ── 处理子目录（分类文件夹，如「办公」「周末-城市」）──
    for sub in sorted(root.iterdir()):
        if not sub.is_dir() or sub.name.startswith('.'):
            continue
        # 跳过已转换的帖子子目录（含 meta.json）
        if (sub / 'meta.json').exists():
            continue

        print(f"\n{'─'*54}")
        print(f"  📂  子目录: {sub.name}")
        print(f"{'─'*54}\n")
        d, s = convert_dir(sub, dry)
        total_done += d
        total_skip += s

    # ── 写入 _path.txt ──
    path_file = root / '_path.txt'
    abs_path  = str(root).replace('\\', '/')
    if not dry:
        path_file.write_text(abs_path, encoding='utf-8')
        print(f"\n写入 _path.txt: {abs_path}")

    print(f"\n{'─'*54}")
    print(f"  ✅  完成  转换 {total_done} 个 | 已有 {total_skip} 个跳过")
    print(f"{'─'*54}")

    if not dry:
        print(f"\n  📱  下一步：")
        print(f"      1. 用 Chrome / Edge 打开 local-ig.html")
        print(f"      2. 点「选择文件夹」→ 选中「{root.name}」")
    print()


if __name__ == '__main__':
    main()
