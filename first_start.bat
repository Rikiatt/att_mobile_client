@REM @echo off
@REM npm i && pm2 start server.js --name ui
@echo off
:: Ensure it moved to C:\att_mobile_client
cd /d C:\att_mobile_client
pm2 delete ui & npm i && pm2 start server.js --name ui