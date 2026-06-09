param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$appName = "LocalAlbum"
$installerExeName = "安装本地IG.exe"
$specFile = "LocalAlbum.spec"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw "未找到 Python 启动器 py。请先安装 Python 3。"
}

if (-not (Test-Path $specFile)) {
    throw "找不到 spec 文件: $specFile"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    if (Test-Path "VERSION") {
        $Version = (Get-Content "VERSION" -Raw).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($Version)) {
        $Version = (Get-Date -Format "yyyy.MM.dd")
    }
}

Write-Host "[1/5] 清理旧构建目录..."
Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

Write-Host "[2/5] 构建子程序二进制组件..."
Write-Host "-> 正在构建 ig_download.exe..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build --onefile ig_download.py
Write-Host "-> 正在构建 xhs_download.exe..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build --onefile xhs_download.py
Write-Host "-> 正在构建 flat_convert.exe..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build --onefile flat_convert.py
Write-Host "-> 正在构建 hhcat_convert.exe..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build --onefile hhcat_convert.py
Write-Host "-> 正在构建 APP - deep-translator.exe..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build --onefile "APP - deep-translator.py"

Write-Host "[3/5] 构建主程序单文件 EXE..."
py -3 -m PyInstaller --noconfirm --clean --distpath dist --workpath build $specFile

$exePath = Join-Path $repoRoot "dist\LocalAlbum.exe"
if (-not (Test-Path $exePath)) {
    throw "构建失败：未找到 $exePath"
}

$releaseDir = Join-Path $repoRoot "release\$appName-$Version"
Write-Host "[4/5] 生成发布目录: $releaseDir"
if (Test-Path $releaseDir) {
    Get-ChildItem -Path $releaseDir -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
    }
} else {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$releaseExe = Join-Path $releaseDir $installerExeName
Copy-Item $exePath $releaseExe -Force

$quickstart = @"
$appName 快速开始
====================

1. 双击 安装本地IG.exe 启动。
2. 启动后会自动打开浏览器页面。
3. 如果浏览器没自动打开，请手动访问：
   http://127.0.0.1:8765/local-ig.html

说明：
- 这是单文件绿色版，不需要安装 Python。
- 首次启动可能稍慢（系统会解压临时运行文件）。
- 若被安全软件拦截，请将本程序加入白名单后重试。
"@
Set-Content -Path (Join-Path $releaseDir "README_快速开始.txt") -Value $quickstart -Encoding UTF8

$sha = (Get-FileHash $releaseExe -Algorithm SHA256).Hash
"SHA256  $installerExeName`n$sha" | Set-Content -Path (Join-Path $releaseDir "SHA256.txt") -Encoding UTF8

Write-Host "[5/5] 打包 zip..."
$zipPath = Join-Path $repoRoot "release\$appName-$Version-win64.zip"
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "构建完成。可上传文件："
Write-Host "- $releaseExe"
Write-Host "- $(Join-Path $releaseDir "README_快速开始.txt")"
Write-Host "- $(Join-Path $releaseDir "SHA256.txt")"
Write-Host "- $zipPath"
