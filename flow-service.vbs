Set WshShell = CreateObject("WScript.Shell")

' Start Next.js frontend (hidden window)
WshShell.Run "cmd /c cd /d D:\flo-w && ""C:\Program Files\nodejs\npm.cmd"" run dev", 0, False

' Start FastAPI backend (hidden window)
WshShell.Run "cmd /c cd /d D:\flo-w\server && python main.py", 0, False

' Wait 8 seconds then open browser
WScript.Sleep 8000
WshShell.Run "http://localhost:3000"
