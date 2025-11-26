$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path ".env") { Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$') {
        $name = $Matches[1]; $val = $Matches[2]; [Environment]::SetEnvironmentVariable($name, $val)
    }
} }
$port = $env:PORT
if (-not $port) { $port = 3000 }
$server = Start-Process -FilePath "node" -ArgumentList "app.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
Start-Process "http://localhost:$port/homepage"
Start-Process "http://localhost:$port/analytics/dashboard"
Write-Output "Server PID: $($server.Id)"
