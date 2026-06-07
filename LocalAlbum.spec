# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['scripts\\serve_local_album.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('ig_download.py', '.'),
        ('xhs_download.py', '.'),
        ('flat_convert.py', '.'),
        ('hhcat_convert.py', '.'),
        ('APP - deep-translator.py', '.'),
        ('VERSION', '.'),
        ('local-ig.html', '.'),
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
    name='LocalAlbum',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
