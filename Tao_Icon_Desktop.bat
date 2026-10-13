@echo off
title Tao Icon Shortcut TBYT Manager

echo Dang tao Phim tat TBYT Manager ngoai Man hinh chinh (Desktop)...

set SCRIPT_PATH=%~dp0CHAY_APP.bat
set WORK_DIR=%~dp0
set DESKTOP_PATH=%USERPROFILE%\Desktop\TBYT Manager.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_PATH%'); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = '%WORK_DIR%'; $s.WindowStyle = 1; $s.Description = 'Khoi dong TBYT Manager'; $s.Save()"

echo.
echo =========================================================
echo  [THANH CONG] Da tao Icon "TBYT Manager" ngoai Desktop!
echo  Bay gio ban chi can nhap dup chuot vao Icon "TBYT Manager"
echo  o ngoai Man hinh chinh de khoi dong ung dung lap tuc.
echo =========================================================
echo.
pause
