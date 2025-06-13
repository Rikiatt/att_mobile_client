@echo off
FOR /F "tokens=1" %%A IN ('adb devices ^| findstr "device" ^| findstr /V "List"') DO (
    adb -s %%A shell settings put global development_settings_enabled 0
)