@echo off
cd /d C:\att_mobile_client

:: Xoá cache và modules
rd /s /q node_modules
npm cache clean --force

:: Kéo source mới
git config --global --add safe.directory "%cd%"
git reset --hard
git pull
npm install

:: Khởi động lại
pm2 delete ui
taskkill /F /IM scrcpy.exe
pm2 start server.js --name ui
pm2 log ui