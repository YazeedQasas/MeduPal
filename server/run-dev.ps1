# Stable dev server (no reload — avoids .venv-kokoro reload storms).
Set-Location $PSScriptRoot
Write-Host "Starting Medupal AI on http://127.0.0.1:8000" -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
