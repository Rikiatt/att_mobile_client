@echo off
:loop
tasklist | findstr /i vysor.exe >nul
if %errorlevel%==0 (
    taskkill /F /IM vysor.exe >nul 2>&1
)
timeout /t 5 >nul
goto loop