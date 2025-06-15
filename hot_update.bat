@echo off
cd /d C:\att_mobile_client

:: Xoá cache và modules
rd /s /q node_modules

:: Kéo source mới
git config --global --add safe.directory "%cd%"

:: install lại xong mới pull về
npm install
git pull

:: Khởi động lại
pm2 delete ui
taskkill /F /IM scrcpy.exe
pm2 start server.js --name ui
pm2 log ui