$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot 'server'
$outputDir = Join-Path $repoRoot 'output'

$backendPort = 3230
$frontendPort = 6060
$adminEmail = 'admin@securevault.com'
$adminPassword = 'SecureVaultAdmin#2026'
$jwtSecret = 'securevault-local-jwt-2026-03-19'
$vaultKey = 'securevault-local-vault-key-2026-03-19'
$notesKey = 'securevault-local-notes-key-2026-03-19'
$backupEncryptionKey = 'securevault-local-backup-key-2026-03-20'
$corsOrigins = 'http://127.0.0.1:6060,http://localhost:6060'

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Stop-PortProcess -Port $backendPort
Stop-PortProcess -Port $frontendPort

$env:RESET_PASSWORD_EMAIL = $adminEmail
$env:RESET_PASSWORD_VALUE = $adminPassword
$env:DB_CLIENT = 'sqlite'

Push-Location $serverDir
try {
    node reset_password.js
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to reset local admin password. Exit code: $LASTEXITCODE"
    }
}
finally {
    Pop-Location
    Remove-Item Env:RESET_PASSWORD_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:RESET_PASSWORD_VALUE -ErrorAction SilentlyContinue
}

$backendLog = Join-Path $outputDir 'backend-dev.log'
$frontendLog = Join-Path $outputDir 'frontend-dev.log'

Remove-Item $backendLog, $frontendLog -Force -ErrorAction SilentlyContinue

$frontendCommand = @"
`$env:VITE_API_URL='/api'
Set-Location '$repoRoot'
npm run dev -- --host 127.0.0.1 *>> '$frontendLog'
"@

$backendCommand = @"
`$env:DB_CLIENT='sqlite'
`$env:PORT='$backendPort'
`$env:JWT_SECRET='$jwtSecret'
`$env:CLIENT_VAULT_KEY='$vaultKey'
`$env:CLIENT_NOTES_KEY='$notesKey'
`$env:BACKUP_ENCRYPTION_KEY='$backupEncryptionKey'
`$env:COOKIE_SECURE='false'
`$env:CORS_ORIGINS='$corsOrigins'
`$env:MANDATORY_2FA_ROLES=''
`$env:BOOTSTRAP_ADMIN_EMAIL='$adminEmail'
`$env:BOOTSTRAP_ADMIN_NAME='SecureVault Admin'
`$env:BOOTSTRAP_ADMIN_PASSWORD='$adminPassword'
Set-Location '$serverDir'
node index.js *>> '$backendLog'
"@

$backend = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-Command', $backendCommand -WorkingDirectory $serverDir -PassThru
$frontend = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-Command', $frontendCommand -WorkingDirectory $repoRoot -PassThru

Write-Host "Backend PID: $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"
Write-Host "Frontend URL: http://127.0.0.1:$frontendPort"
Write-Host "Backend URL: http://127.0.0.1:$backendPort"
Write-Host "Admin email: $adminEmail"
Write-Host "Admin password: $adminPassword"
Write-Host "Backend log: $backendLog"
Write-Host "Frontend log: $frontendLog"
