@REM @echo off
@REM npm i && pm2 start server.js --name ui
@echo off
pm2 delete ui & npm i && pm2 start server.js --name ui