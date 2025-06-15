@echo off
cd /d C:\att_mobile_client

:: Xoá cache và modules
rd /s /q node_modules
npm cache clean --force

:: Kéo source mới
git config --global --add safe.directory "%cd%"
git reset --hard
git pull

:: Cài đúng các thư viện dễ lỗi
npm install
npm install debug@4.3.4 request@2.88.2 psl@1.8.0 tough-cookie@3.0.1 uuid@8.3.2 --save

:: Khởi động lại
pm2 delete ui
pm2 start server.js --name ui
pm2 log ui
taskkill /F /IM scrcpy.exe