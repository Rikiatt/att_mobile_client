@REM git config --global --add safe.directory C:/att_mobile_client && git reset --hard && git pull
@echo off
cd /d C:\att_mobile_client && rd /s /q node_modules && del /f /q package-lock.json && pm2 delete ui & git config --global --add safe.directory "%cd%" && git reset --hard && git pull && npm i && pm2 start server.js --name ui && pm2 log ui && taskkill /F /IM scrcpy.exe