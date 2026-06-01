@echo off
setlocal
set "PORT=3005"
set "FOUND="

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  echo Stopping process %%a on port %PORT%...
  taskkill /PID %%a /F >nul 2>&1
  set "FOUND=1"
)

if not defined FOUND (
  echo No Nitro Labs server is running on port %PORT%.
)

endlocal
pause
