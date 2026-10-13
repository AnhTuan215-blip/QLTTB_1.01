@echo off
title TBYT Manager - Khoi Dong Nhanh
color 0A

echo ===================================================
echo    HE THONG QUAN LY TRANG THIET BI Y TE (TBYT)
echo ===================================================
echo.
echo [1/3] Dang giai phong cong Port 8787...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8787 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [2/3] Dang khoi dong May chu Web Server (Port 8787)...
echo [3/3] Tu dong mo ung dung tren trinh duyet web...
echo.
echo  --------------------------------------------------
echo   Web dang hoat dong tai: http://localhost:8787
echo   Vui long KHONG tat cua so nay khi dang dung Web!
echo  --------------------------------------------------
echo.

:: Tu dong mo trinh duyet sau 3 giay
start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:8787'"

:: Chay Wrangler Dev Server
cmd /c "node node_modules\wrangler\bin\wrangler.js dev --port 8787"

pause
