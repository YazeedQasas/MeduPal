# Kokoro TTS requires Python 3.10–3.12 (not 3.13). This script creates
# server/.venv-kokoro and installs kokoro there. The main server (3.13) uses it via subprocess.
#
# Run from server/:  .\setup-kokoro.ps1

$ErrorActionPreference = "Stop"
$ServerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ServerDir

function Get-Python312 {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        $out = & py -3.12 -c "import sys; print(sys.executable)" 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $out -match '\.exe') { return ($out -split "`n")[0].Trim() }
    }
    foreach ($name in @("python3.12", "python312")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

$python312 = Get-Python312
if (-not $python312) {
    Write-Host "Python 3.12 not found. Installing via winget (Python.Python.3.12)..." -ForegroundColor Yellow
    winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Install Python 3.12 from https://www.python.org/downloads/ then re-run this script."
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
        [System.Environment]::GetEnvironmentVariable("Path", "User")
    $python312 = Get-Python312
    if (-not $python312) {
        Write-Error "Python 3.12 still not on PATH. Open a new terminal and run: py -3.12 --version"
    }
}

Write-Host "Using: $python312" -ForegroundColor Cyan
$venv = Join-Path $ServerDir ".venv-kokoro"
if (-not (Test-Path $venv)) {
    & $python312 -m venv $venv
}

$pip = Join-Path $venv "Scripts\pip.exe"
& $pip install --upgrade pip
& $pip install "kokoro>=0.9.4" soundfile "numpy>=1.26,<2"

Write-Host ""
Write-Host "Done. Restart uvicorn on port 8000, then check:" -ForegroundColor Green
Write-Host "  http://localhost:8000/health  -> tts.active_backend should be kokoro-subprocess"
Write-Host ""
Write-Host "Optional: set KOKORO_PYTHON=$($venv)\Scripts\python.exe in server/.env"
