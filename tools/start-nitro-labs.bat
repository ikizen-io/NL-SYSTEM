@echo off
setlocal
set "PROJECT=C:\Users\CB\nl-sys"
set "PORT=3005"
set "URL=http://localhost:%PORT%"

REM --- Check if a server is already listening on the port ---
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
  echo Starting Nitro Labs server on port %PORT%...
  start "Nitro Labs Server" /min cmd /k "cd /d "%PROJECT%" && set PORT=%PORT% && npm run start"
  echo Waiting for the server to come up...
  REM wait up to ~15s for the port to start listening (ping is a portable 1s wait)
  for /l %%i in (1,1,15) do (
    ping -n 2 127.0.0.1 >nul
    netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul && goto :ready
  )
)

:ready
echo Opening %URL%
start "" "%URL%"
endlocal
