# Check Database Connection
$DbHost = "db-postgresql-blr1-79926-do-user-29969927-0.h.db.ondigitalocean.com"
$DbPort = 25060

Write-Host "1. Testing connection to Database ($DbHost)..." -ForegroundColor Cyan
$conn = Test-NetConnection -ComputerName $DbHost -Port $DbPort -WarningAction SilentlyContinue

if (-not $conn.TcpTestSucceeded) {
    Write-Host "❌ Connection Timed Out!" -ForegroundColor Red
    Write-Host "The DigitalOcean database firewall is blocking your connection." -ForegroundColor Yellow
    
    $ip = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "Your Public IP is: $ip" -ForegroundColor White
    Write-Host "ACTION REQUIRED: Go to DigitalOcean Dashboard -> Databases -> Settings -> Trusted Sources and add this IP." -ForegroundColor Green
    exit 1
}

Write-Host "✅ Database connection successful!" -ForegroundColor Green

# Run Migrations
Write-Host "`n2. Running Django Migrations..." -ForegroundColor Cyan
Set-Location backend_django
python manage.py migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migrations failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migrations applied." -ForegroundColor Green

# Start Backend
Write-Host "`n3. Starting Backend Server..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "manage.py runserver" -WorkingDirectory "$PWD" -WindowStyle Normal
Write-Host "✅ Backend started in new window." -ForegroundColor Green

# Start Frontend
Write-Host "`n4. Starting Frontend..." -ForegroundColor Cyan
Set-Location ../frontend
npm run dev
