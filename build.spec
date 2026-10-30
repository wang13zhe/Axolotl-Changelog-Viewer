# PyInstaller spec for Axolotl Changelog Viewer
# Bundles the web app into a single exe

import os

block_cipher = None

# Collect all web assets
web_files = [
    ('index.html', '.'),
    ('src/echarts.min.js', 'src'),
    ('src/styles.css', 'src'),
    ('src/app.js', 'src'),
    ('data/changelog.json', 'data'),
]

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=web_files,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AxolotlChangelogViewer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
