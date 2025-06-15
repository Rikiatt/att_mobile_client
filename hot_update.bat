@echo off
cd /d C:\att_mobile_client
pm2 delete ui & git config --global --add safe.directory "%cd%" && git reset --hard && git pull && npm i && pm2 start server.js --name ui && pm2 delete ui && rd /s /q node_modules && npm install && git pull && pm2 start server.js --name ui && pm2 log ui && taskkill /F /IM scrcpy.exe