@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

title 本地相册 - 一键启动
set "PORT=8765"
set "PORT_MAX=8894"
set "HOST=127.0.0.1"
set "PY_CMD="
set "STATE="
set "URL="
set "USED_PORT="
set "ERRMSG="
set "EXISTING_URL="
set "STATUS_FILE=%TEMP%\local_ig_status_%RANDOM%_%RANDOM%.json"

if exist "%STATUS_FILE%" del /f /q "%STATUS_FILE%" >NUL 2>&1

echo.
echo ====== 本地相册 一键启动 ======
echo 项目目录: %CD%
echo.

where py >NUL 2>&1
if not errorlevel 1 (
    set "PY_CMD=py -3"
) else (
    where python >NUL 2>&1
    if not errorlevel 1 (
        set "PY_CMD=python"
    )
)

if not defined PY_CMD (
    echo [失败] 未找到 Python / py 启动器
    echo 请先安装 Python: https://www.python.org/downloads/
    echo 安装时建议勾选 "Add Python to PATH"
    call :popup_error "未找到 Python。请先安装 Python，并确保 python 或 py -3 可在命令行执行。"
    pause
    exit /b 1
)

if not exist "scripts\serve_local_album.py" (
    echo [失败] 缺少 scripts\serve_local_album.py
    call :popup_error "启动文件缺失：scripts\serve_local_album.py"
    pause
    exit /b 1
)

echo [OK] 使用解释器: %PY_CMD%
call :probe_existing_server
if defined EXISTING_URL (
    set "URL=%EXISTING_URL%"
    echo [信息] 检测到已有本地相册服务，直接复用
    goto open_browser
)

echo [启动] Python 本地服务脚本 ...
set "RUN_CMD=cd /d ""%~dp0"" ^&^& set LOCAL_IG_HOST=%HOST% ^&^& set LOCAL_IG_PORT=%PORT% ^&^& set LOCAL_IG_PORT_ATTEMPTS=100 ^&^& set LOCAL_IG_NO_BROWSER=1 ^&^& set LOCAL_IG_STATUS_FILE=%STATUS_FILE% ^&^& %PY_CMD% scripts\serve_local_album.py"
start "Local IG Server" /MIN cmd /v:on /c "!RUN_CMD!"

echo [等待] 服务器启动中 ...
for /L %%I in (1,1,15) do (
    if exist "%STATUS_FILE%" goto read_status
    timeout /t 1 /nobreak >NUL
)

echo [失败] 启动超时，未收到服务状态文件
echo 请查看 "Local IG Server" 窗口中的报错信息。
call :popup_error "本地相册启动超时。请查看 Local IG Server 窗口中的报错信息。"
pause
exit /b 1

:read_status
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%STATUS_FILE%' | ConvertFrom-Json; [string]$j.state"`) do set "STATE=%%R"
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%STATUS_FILE%' | ConvertFrom-Json; if($j.url){ [string]$j.url }"`) do set "URL=%%R"
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%STATUS_FILE%' | ConvertFrom-Json; if($j.port){ [string]$j.port }"`) do set "USED_PORT=%%R"
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%STATUS_FILE%' | ConvertFrom-Json; if($j.message){ [string]$j.message }"`) do set "ERRMSG=%%R"
if exist "%STATUS_FILE%" del /f /q "%STATUS_FILE%" >NUL 2>&1

if /I "%STATE%"=="ready" goto open_browser

echo [失败] 本地服务启动失败
if defined ERRMSG echo %ERRMSG%
echo 请查看 "Local IG Server" 窗口中的详细报错。
if not defined ERRMSG set "ERRMSG=本地相册启动失败。请查看 Local IG Server 窗口中的详细报错。"
call :popup_error "%ERRMSG%"
pause
exit /b 1

:open_browser
if not defined URL set "URL=http://%HOST%:%PORT%/local-ig.html"
if defined USED_PORT if not "%USED_PORT%"=="%PORT%" echo [信息] 默认端口 %PORT% 已占用，已自动改用 %USED_PORT%
echo [打开] 浏览器页面 ...
start "" "%URL%"
echo.
echo [完成] 已打开: %URL%
echo 若要停止服务，请关闭标题为 "Local IG Server" 的窗口。
echo.
pause
exit /b 0

:probe_existing_server
set "EXISTING_URL="
for /L %%P in (%PORT%,1,%PORT_MAX%) do (
    for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "try { $ProgressPreference='SilentlyContinue'; $u='http://%HOST%:%%P/local-ig.html'; $r=Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 2; if($r.StatusCode -eq 200 -and $r.Content -match 'btnWelcomeOpen'){ $u } } catch {}"`) do (
        set "EXISTING_URL=%%R"
        goto :probe_existing_server_done
    )
)
:probe_existing_server_done
exit /b 0

:popup_error
powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('%~1','本地相册启动失败')" >NUL 2>&1
exit /b 0
