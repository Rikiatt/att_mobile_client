@echo off
:: Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Yêu cầu quyền Administrator...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

:loop
tasklist | findstr /i vysor.exe >nul
if %errorlevel%==0 (
    taskkill /F /IM vysor.exe >nul 2>&1
)
timeout /t 5 >nul
goto loop