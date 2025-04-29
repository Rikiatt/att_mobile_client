@echo off
pm2 restart ui && taskkill /F /IM Vysor.exe && taskkill /F /IM scrcpy.exe