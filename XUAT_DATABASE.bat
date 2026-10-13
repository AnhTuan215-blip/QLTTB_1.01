@echo off
title Xuat File Database Backup
color 0B
echo ===================================================
echo   XUAT DU LIEU DATABASE HE THONG TBYT MANAGER
echo ===================================================
echo.
echo Dang sao luu du lieu ra file database_backup.sql...

cmd /c "npx wrangler d1 export tbyt-db --local --output database_backup.sql"

echo.
echo ===================================================
echo  DA XUAT THANH CONG!
echo  File du lieu duoc luu tai: database_backup.sql
echo ===================================================
pause
