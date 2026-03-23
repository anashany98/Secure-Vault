$ErrorActionPreference = 'Stop'

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Stop-PortProcess -Port 3230
Stop-PortProcess -Port 6060

Write-Host 'Stopped listeners on ports 3230 and 6060.'
