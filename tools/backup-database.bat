@echo off
setlocal
set "DB=C:\Users\CB\nl-sys\prisma\dev.db"
set "BACKUP_DIR=C:\Users\CB\nl-sys\backups"

if not exist "%DB%" (
  echo Database file not found at %DB%.
  pause
  exit /b 1
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Build a YYYYMMDD-HHMMSS timestamp using PowerShell (locale-safe)
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%t"

set "OUT=%BACKUP_DIR%\dev_%STAMP%.db"
copy /Y "%DB%" "%OUT%" >nul
if errorlevel 1 (
  echo Backup failed.
) else (
  echo Backup created: %OUT%
)

endlocal
pause
