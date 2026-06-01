# Creates Desktop shortcuts for launching, stopping, and backing up Nitro Labs.
# Run once: right-click -> "Run with PowerShell" (or from a PowerShell prompt).

$Project   = "C:\Users\CB\nl-sys"
$Tools     = Join-Path $Project "tools"
$Desktop   = [Environment]::GetFolderPath("Desktop")
$WshShell  = New-Object -ComObject WScript.Shell

function New-Shortcut {
    param(
        [string]$Name,
        [string]$Target,
        [string]$Description,
        [string]$IconPath
    )
    $lnkPath = Join-Path $Desktop "$Name.lnk"
    $shortcut = $WshShell.CreateShortcut($lnkPath)
    $shortcut.TargetPath       = $Target
    $shortcut.WorkingDirectory = $Project
    $shortcut.Description      = $Description
    if ($IconPath -and (Test-Path $IconPath)) {
        $shortcut.IconLocation = $IconPath
    }
    $shortcut.Save()
    Write-Host "Created shortcut: $lnkPath"
}

# Optional: if you place a .ico at C:\Users\CB\nl-sys\public\nitro-labs-logo.ico
# it will be used. Otherwise the default cmd icon is used.
$Icon = Join-Path $Project "public\nitro-labs-logo.ico"

New-Shortcut -Name "Nitro Labs"          -Target (Join-Path $Tools "start-nitro-labs.bat")  -Description "Launch Nitro Labs"        -IconPath $Icon
New-Shortcut -Name "Nitro Labs - Stop"   -Target (Join-Path $Tools "stop-nitro-labs.bat")   -Description "Stop the Nitro Labs server"
New-Shortcut -Name "Nitro Labs - Backup" -Target (Join-Path $Tools "backup-database.bat")   -Description "Back up the Nitro Labs database"

Write-Host ""
Write-Host "All set. Look on your Desktop for the new shortcuts."
