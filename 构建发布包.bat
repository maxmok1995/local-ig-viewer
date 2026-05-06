@echo off
chcp 65001 >NUL 2>&1
setlocal
cd /d "%~dp0"

where pwsh >NUL 2>&1
if not errorlevel 1 (
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "scripts\build_release.ps1" %*
) else (
    powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "scripts\build_release.ps1" %*
)

if errorlevel 1 (
    echo.
    echo [ERROR] 发布构建失败。
    pause
    exit /b 1
)

echo.
echo [DONE] 发布构建完成。
pause
