@echo off
setlocal enabledelayedexpansion

:: Set device ID (replace with your actual device ID if necessary)
set "DEVICE_ID=your_device_id"

:: Set source and destination directories
set "SRC_DIR=/sdcard/"
set "DEST_DIR=/sdcard/DCIM/"

:: Get the list of all images in /sdcard/ (files ending with .jpg or .png)
adb -s %DEVICE_ID% shell ls %SRC_DIR% | findstr /R "\.jpg$ \.png$" > image_list.txt

:: Check if any images were found
if %errorlevel% neq 0 (
    echo ❌ No images found in %SRC_DIR%!
    del image_list.txt
    exit /b
)

echo 🔍 Found images, starting copy process...

:: Loop through each image and copy it to the destination folder
for /f "tokens=*" %%A in (image_list.txt) do (
    set "FILENAME=%%A"
    echo Copying: !FILENAME!
    adb -s %DEVICE_ID% shell cp %SRC_DIR%!FILENAME! %DEST_DIR%!FILENAME!
    
    if %errorlevel% equ 0 (
        echo ✅ Successfully copied: !FILENAME!
    ) else (
        echo ❌ Failed to copy: !FILENAME!
    )
)

:: Clean up temporary file
del image_list.txt

echo ✅ All images copied successfully!
exit