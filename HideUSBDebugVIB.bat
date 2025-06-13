@echo off
FOR /F "tokens=1" %%A IN ('adb devices ^| findstr "device" ^| findstr /V "List"') DO (
    adb -s %%A shell dumpsys battery set usb 0
)