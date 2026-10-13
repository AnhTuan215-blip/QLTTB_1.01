$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("$desktop\TBYT Manager.lnk")
$shortcut.TargetPath = "Z:\tbyt-manager-source\tbyt-manager-source\CHAY_APP.bat"
$shortcut.WorkingDirectory = "Z:\tbyt-manager-source\tbyt-manager-source"
$shortcut.Description = "Khoi dong TBYT Manager Web App"
$shortcut.Save()
Write-Host "Created shortcut at $desktop\TBYT Manager.lnk"
