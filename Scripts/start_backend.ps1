$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
$backendDir = Join-Path $projectRoot "Backend"

Write-Host "Starting NeuroSync AI backend from $backendDir" -ForegroundColor Cyan
python -m uvicorn app.main:app --app-dir $backendDir --reload
