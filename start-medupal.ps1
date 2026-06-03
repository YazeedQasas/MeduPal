# Start frontend + AI server (run from repo root after closing old terminals).
$root = $PSScriptRoot
Write-Host "Stopping old processes on 8000 and 5173..." -ForegroundColor Yellow
foreach ($port in @(8000, 5173)) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 2

Write-Host "Starting AI server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; .\run-dev.ps1"

Start-Sleep -Seconds 3

Write-Host "Starting Vite..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host ""
Write-Host "Open http://localhost:5173" -ForegroundColor Green
Write-Host "Allow microphone when prompted." -ForegroundColor Green
