param(
    [string]$Version = ""
)

# 遇到错误即刻停止脚本执行，避免后续脚本继续错跑
$ErrorActionPreference = "Stop"
# 启用严格模式，检查未初始化变量等潜在缺陷
Set-StrictMode -Version Latest

# 获取仓库根目录并切换工作目录，确保所有相对路径起点一致
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$appName = "LocalAlbum"
$installerExeName = "安装本地IG.exe"
$specFile = "LocalAlbum.spec"

# 1. 验证运行环境依赖
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "未找到 Python。请先安装 Python 3 并在系统环境变量 PATH 中配置它。"
}

if (-not (Test-Path $specFile)) {
    throw "找不到 spec 打包配置文件: $specFile"
}

# 2. 自动解析或生成版本号
if ([string]::IsNullOrWhiteSpace($Version)) {
    if (Test-Path "VERSION") {
        $Version = (Get-Content "VERSION" -Raw).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($Version)) {
        # 没有 VERSION 文件时，采用当前日期作为默认版本号
        $Version = (Get-Date -Format "yyyy.MM.dd")
    }
}

Write-Host "[1/5] 清理旧构建目录并关闭运行中的程序实例..."
Stop-Process -Name "LocalAlbum" -ErrorAction SilentlyContinue
Stop-Process -Name "安装本地IG" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist_bins" -ErrorAction SilentlyContinue

Write-Host "[2/5] 构建主程序单文件 EXE..."
python -m PyInstaller --noconfirm --clean --distpath dist --workpath build $specFile

$exePath = Join-Path $repoRoot "dist\LocalAlbum.exe"
if (-not (Test-Path $exePath)) {
    throw "构建失败：未找到 $exePath"
}

# 3. 准备生成最终的交付物发布目录
$releaseDir = Join-Path $repoRoot "release\$appName-$Version"
Write-Host "[4/5] 生成发布目录: $releaseDir"
if (Test-Path $releaseDir) {
    # ⚠️ 极其重要的安全防护：检测如果发布包里含有用户的数据文件夹，则绝对禁止强行覆盖清空！
    $hasUserDirs = Get-ChildItem -Path $releaseDir -Directory -ErrorAction SilentlyContinue
    if ($hasUserDirs) {
        $dirNames = ($hasUserDirs | ForEach-Object { $_.Name }) -join ", "
        throw "【安全终止】检测到发布目录 $releaseDir 中含有自定义文件夹: [$dirNames]。为防止丢失您的相册与素材数据，打包脚本已安全终止！请手动备份移动它们后再重新打包。"
    }
    Get-ChildItem -Path $releaseDir -File -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue
    }
} else {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$releaseExe = Join-Path $releaseDir $installerExeName
Copy-Item $exePath $releaseExe -Force

# 同步將 Tailscale 啟動腳本拷貝至發布包中
$batPath = Join-Path $repoRoot "一鍵啟動相冊(Tailscale版).bat"
if (Test-Path $batPath) {
    Copy-Item $batPath (Join-Path $releaseDir "一鍵啟動相冊(Tailscale版).bat") -Force
    Write-Host "[信息] 已將 Tailscale 啟動腳本拷貝至發布包"
}

# 自动生成快速开始引导说明文件，方便终端用户查阅使用
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

# 计算主安装包哈希校验码，确保防篡改与完整性校验
$sha = (Get-FileHash $releaseExe -Algorithm SHA256).Hash
"SHA256  $installerExeName`n$sha" | Set-Content -Path (Join-Path $releaseDir "SHA256.txt") -Encoding UTF8

Write-Host "[5/5] 打包 zip..."
# 将整个交付文件夹进行压缩打包，方便后续上传或分享
$zipPath = Join-Path $repoRoot "release\$appName-$Version-win64.zip"
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "构建完成。可上传文件："
Write-Host "- $releaseExe"
Write-Host "- $(Join-Path $releaseDir "README_快速开始.txt")"
Write-Host "- $(Join-Path $releaseDir "SHA256.txt")"
Write-Host "- $zipPath"

