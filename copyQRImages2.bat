@echo off
setlocal enabledelayedexpansion

:: Set device ID
set "DEVICE_ID=your_device_id"

:: Get the latest file name from /sdcard/DCIM/
adb -s %DEVICE_ID% shell ls -t /sdcard/DCIM/ | findstr /R "^[0-9]\{8\}_[0-9]\{6\}\.jpg$" > latest_file.txt

:: Read the latest file name
set /p FILENAME=<latest_file.txt

:: If no file found, exit
if "%FILENAME%"=="" (
    echo ❌ Không tìm thấy file ảnh trong /sdcard/DCIM/!
    del latest_file.txt
    exit /b
)

echo 🔍 Tìm thấy file mới nhất: %FILENAME%

:: Set source and destination paths
set "SRC_PATH=/sdcard/DCIM/%FILENAME%"
set "DEST_DIR=/sdcard/"

:: Get file list in /sdcard/
adb -s %DEVICE_ID% shell ls %DEST_DIR% > file_list.txt

:: Find the maximum copy index
set "MAX_INDEX=0"
for /f "tokens=*" %%A in (file_list.txt) do (
    echo %%A | findstr /R "%FILENAME%_copy_[0-9]*\.jpg" >nul && (
        for /f "tokens=2 delims=_" %%B in ("%%A") do (
            for /f "tokens=1 delims=." %%C in ("%%B") do (
                if %%C gtr !MAX_INDEX! set "MAX_INDEX=%%C"
            )
        )
    )
)

:: Next index
set /a "NEW_INDEX=MAX_INDEX+1"
set "DEST_PATH=%DEST_DIR%%FILENAME%_copy_%NEW_INDEX%.jpg"

:: Copy file
adb -s %DEVICE_ID% shell cp %SRC_PATH% %DEST_PATH%

if %errorlevel% equ 0 (
    echo ✅ Đã sao chép ảnh vào: %DEST_PATH%
) else (
    echo ❌ Lỗi sao chép ảnh!
)

:: Delete temp files
del latest_file.txt
del file_list.txt
exit