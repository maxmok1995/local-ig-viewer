@echo off
chcp 65001 >NUL 2>&1
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

title Local Album Launcher
set "PORT=8765"
set "PORT_MAX=8894"
set "PORT_ATTEMPTS="
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
echo ====== Local Album One-Click Start ======
echo Project dir: %CD%
echo.

set /a PORT_ATTEMPTS=PORT_MAX-PORT+1
if %PORT_ATTEMPTS% LEQ 0 (
    echo [ERROR] Invalid port range: PORT=%PORT%, PORT_MAX=%PORT_MAX%
    call :popup_error "Invalid port range. Please check PORT and PORT_MAX."
    pause
    exit /b 1
)

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
    echo [ERROR] Python not found.
    echo Install Python from: https://www.python.org/downloads/
    echo Recommended: enable "Add Python to PATH".
    call :popup_error "Python not found. Install Python and ensure python or py -3 works in terminal."
    pause
    exit /b 1
)

if not exist "scripts\serve_local_album.py" (
    echo [ERROR] Missing scripts\serve_local_album.py
    call :popup_error "Missing startup file: scripts\\serve_local_album.py"
    pause
    exit /b 1
)

echo [OK] Python command: %PY_CMD%
call :probe_existing_server
if defined EXISTING_URL (
    set "URL=%EXISTING_URL%"
    echo [INFO] Existing server detected. Reusing it.
    goto open_browser
)

echo [START] Launching local server script...
set "LOCAL_IG_PORT=%PORT%"
set "LOCAL_IG_PORT_ATTEMPTS=%PORT_ATTEMPTS%"
set "LOCAL_IG_HOST=%HOST%"
set "LOCAL_IG_NO_BROWSER=1"
set "LOCAL_IG_STATUS_FILE=%STATUS_FILE%"
start "Local IG Server" /MIN cmd /k "cd /d ""%~dp0"" && %PY_CMD% scripts\serve_local_album.py"

for /L %%I in (1,1,20) do (
    if exist "%STATUS_FILE%" goto read_status
    timeout /t 1 /nobreak >NUL
)

echo [ERROR] Startup timeout. Status file not received.
echo Check the "Local IG Server" window for details.
call :popup_error "Local album startup timed out. Check Local IG Server window for errors."
pause
exit /b 1

:read_status
set "STATE="
set "URL="
set "USED_PORT="
set "ERRMSG="
for /f "usebackq tokens=1,* delims==" %%A in (`powershell -NoProfile -Command "$j=Get-Content -Raw '%STATUS_FILE%' | ConvertFrom-Json; 'STATE=' + [string]$j.state; 'URL=' + [string]$j.url; 'USED_PORT=' + [string]$j.port; 'ERRMSG=' + [string]$j.message"`) do (
    if /I "%%A"=="STATE" set "STATE=%%B"
    if /I "%%A"=="URL" set "URL=%%B"
    if /I "%%A"=="USED_PORT" set "USED_PORT=%%B"
    if /I "%%A"=="ERRMSG" set "ERRMSG=%%B"
)
if exist "%STATUS_FILE%" del /f /q "%STATUS_FILE%" >NUL 2>&1

if /I "%STATE%"=="ready" goto open_browser

echo [ERROR] Local service failed to start.
if defined ERRMSG echo %ERRMSG%
echo Check "Local IG Server" window for details.
if not defined ERRMSG set "ERRMSG=Local album startup failed. Check Local IG Server window for details."
call :popup_error "%ERRMSG%"
pause
exit /b 1

:open_browser
if not defined URL set "URL=http://%HOST%:%PORT%/local-ig.html"
if defined USED_PORT if not "%USED_PORT%"=="%PORT%" echo [INFO] Default port %PORT% was busy. Using %USED_PORT%.
echo [OPEN] Browser page ...
start "" "%URL%"
echo.
echo [DONE] Opened: %URL%
echo To stop the service, close the "Local IG Server" window.
echo.
pause
exit /b 0

:probe_existing_server
set "EXISTING_URL="
for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "try { $ProgressPreference='SilentlyContinue'; $u='http://%HOST%:%PORT%/local-ig.html'; $r=Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 1; if($r.StatusCode -eq 200 -and $r.Content -match 'btnWelcomeOpen'){ $u } } catch {}"`) do (
    set "EXISTING_URL=%%R"
)
exit /b 0

:popup_error
set "POPUP_MSG=%~1"
powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($env:POPUP_MSG,'Local Album Start Failed')" >NUL 2>&1
set "POPUP_MSG="
exit /b 0
