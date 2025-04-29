@echo off
:: Yêu cầu quyền Administrator nếu chưa có
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Yêu cầu quyền Administrator...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

:: Di chuyển vào thư mục và khởi chạy server
cd /d C:\att_mobile_client
pm2 delete ui & npm i && pm2 start server.js --name ui && taskkill /F /IM scrcpy.exe

:: Vòng lặp tự động kill Vysor
:loop
tasklist | findstr /i vysor.exe >nul
if %errorlevel%==0 (
    taskkill /F /IM vysor.exe >nul 2>&1
)
timeout /t 5 >nul
goto loop