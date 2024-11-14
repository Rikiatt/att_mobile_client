git config --global --add safe.directory C:/ui_automator_v2
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

git reset --hard
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

git pull
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

npm i
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

cd views/portal_ui_automator
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

npm i
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%