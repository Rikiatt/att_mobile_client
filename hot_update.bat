@REM git config --global --add safe.directory C:/att_mobile_client && git reset --hard && git pull
@echo off
cd /d C:\att_mobile_client && rd /s /q node_modules && npm cache clean --force && pm2 delete ui & git config --global --add safe.directory "%cd%" && git reset --hard && npm install && git pull && node server.js --name ui && pm2 log ui && taskkill /F /IM scrcpy.exe