@REM git config --global --add safe.directory C:/att_mobile_client && git reset --hard && git pull
@echo off
pm2 delete ui & git config --global --add safe.directory "%cd%" && git reset --hard && git pull && npm i && pm2 start server.js --name ui && pm2 log ui && taskkill /F /IM scrcpy.exe