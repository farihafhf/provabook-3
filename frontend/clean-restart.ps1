# Clean Next.js cache and restart dev server
# Run this after git pull if you encounter module errors

Write-Host "🧹 Cleaning Next.js cache..." -ForegroundColor Yellow

# Kill any running dev servers on port 3001
$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($pid in $processes) {
        Write-Host "   Killing process $pid on port 3001..." -ForegroundColor Gray
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Remove .next directory
if (Test-Path ".next") {
    Write-Host "   Removing .next directory..." -ForegroundColor Gray
    Remove-Item -Recurse -Force .next
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules/.cache") {
    Write-Host "   Removing node_modules cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules/.cache
}

Write-Host "✅ Cache cleaned!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting dev server..." -ForegroundColor Cyan
npm run dev
