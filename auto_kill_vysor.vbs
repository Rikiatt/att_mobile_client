Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\att_mobile_client\auto_kill_vysor.bat" & Chr(34), 0
Set WshShell = Nothing