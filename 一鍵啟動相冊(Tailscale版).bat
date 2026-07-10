@echo off
chcp 65001 >nul
title 本地相冊啟動器(Tailscale)

echo ========================================================
echo             本地相冊啟動器 (Tailscale 局域網版)
echo ========================================================
echo.
echo [提示] 此腳本將允許您在同一個 Tailscale 帳號下的其他設備
echo （如 VPS、手機等）通過 Tailscale 內網 IP 遠程訪問本機相冊。
echo.
echo 正在啟用局域網監聽環境變量...
set LOCAL_IG_HOST=0.0.0.0

echo 正在啟動本地相冊服務...
start "" "安装本地IG.exe"

echo.
echo ========================================================
echo [成功] 本地相冊已成功啟動！
echo.
echo 本地電腦訪問：http://127.0.0.1:8765/local-ig.html
echo.
echo 其他 Tailscale 設備訪問：http://[您本機的Tailscale IP]:8765/local-ig.html
echo ========================================================
echo.
pause
