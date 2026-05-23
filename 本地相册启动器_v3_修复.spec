# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['scripts\\serve_local_album.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('local-ig.html', '.'),
        ('locations_tw.json', '.'),
        ('ig_download.py', '.'),
        ('xhs_download.py', '.'),
        ('flat_convert.py', '.'),
        ('hhcat_convert.py', '.'),
        ('VERSION', '.'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='本地相册启动器_v3_修复',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets\\local_album_icon.ico'],
)
