Set WshShell = CreateObject("WScript.Shell")

' Start FastAPI backend on port 3850 (hidden window)
WshShell.Run "cmd /c cd /d D:\flo-w\server && python main.py", 0, False

' Wait 3 seconds for backend to start
WScript.Sleep 3000

' Start Next.js frontend on port 3000 (hidden window)
WshShell.Run "cmd /c cd /d D:\flo-w && ""C:\Program Files\nodejs\npm.cmd"" run dev", 0, False

' Wait 8 seconds then open browser
WScript.Sleep 8000
WshShell.Run "http://localhost:3000"
