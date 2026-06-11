param(
  [switch]$Restart,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$RedisPackageDir = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.8.0-Windows-x64-msys2"

function Write-Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
  Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Test-Port($Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(700, $false)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Find-CommandPath($Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Find-RedisServer {
  $fromPath = Find-CommandPath "redis-server"
  if ($fromPath) { return $fromPath }

  $known = Join-Path $RedisPackageDir "redis-server.exe"
  if (Test-Path $known) { return $known }

  $found = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") -Recurse -Filter "redis-server.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($found) { return $found }

  return $null
}

function Ensure-Redis {
  Write-Step "Checking Redis"
  if (Test-Port 6379) {
    Write-Ok "Redis is already listening on 6379"
    return
  }

  $redisServer = Find-RedisServer
  if (-not $redisServer) {
    $winget = Find-CommandPath "winget"
    if (-not $winget) {
      throw "Redis is not installed and winget is unavailable. Install Redis or install winget first."
    }
    Write-Step "Installing Redis with winget"
    & $winget install --id taizod1024.redis-windows-fork --accept-package-agreements --accept-source-agreements --silent
    $redisServer = Find-RedisServer
  }

  if (-not $redisServer) {
    throw "Redis installation finished, but redis-server.exe was not found."
  }

  Write-Step "Starting Redis"
  Start-Process -FilePath $redisServer -WorkingDirectory (Split-Path $redisServer) -WindowStyle Hidden
  Start-Sleep -Seconds 2
  if (-not (Test-Port 6379)) {
    throw "Redis did not start on port 6379."
  }
  Write-Ok "Redis started on 6379"
}

function Stop-AppProcesses {
  Write-Step "Stopping existing API/Web dev processes"
  $patterns = @(
    "apps[\\/]api",
    "apps[\\/]web",
    "@nestjs",
    "vite"
  )
  $processes = Get-CimInstance Win32_Process | Where-Object {
    if ($_.Name -notmatch "^node(\.exe)?$") { return $false }
    $cmd = $_.CommandLine
    return $patterns | Where-Object { $cmd -match $_ }
  }

  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
}

function Start-DevWindow($Title, $Command) {
  $escapedRoot = $Root.Path.Replace("'", "''")
  $escapedTitle = $Title.Replace("'", "''")
  $script = "Set-Location '$escapedRoot'; `$host.UI.RawUI.WindowTitle = '$escapedTitle'; $Command"
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $script -WorkingDirectory $Root.Path
}

function Ensure-NodeModules {
  if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Step "Installing npm dependencies"
    Push-Location $Root
    try { npm install } finally { Pop-Location }
  }
}

Push-Location $Root
try {
  Write-Step "LightTask dev environment"
  Ensure-NodeModules
  Ensure-Redis

  if (-not (Test-Port 5432)) {
    Write-Warn "PostgreSQL is not listening on 5432. Start your database before logging in."
  } else {
    Write-Ok "PostgreSQL is listening on 5432"
  }

  if ($Restart) {
    Stop-AppProcesses
  }

  if (Test-Port 3000) {
    Write-Ok "API is already running on http://localhost:3000"
  } else {
    Write-Step "Starting API"
    Start-DevWindow "LightTask API" "npm run dev -w apps/api"
  }

  if (Test-Port 5173) {
    Write-Ok "Web is already running on http://localhost:5173"
  } else {
    Write-Step "Starting Web"
    Start-DevWindow "LightTask Web" "npm run dev -w apps/web -- --host 0.0.0.0"
  }

  Start-Sleep -Seconds 4
  Write-Host ""
  Write-Ok "Environment started"
  Write-Host "Web:   http://localhost:5173"
  Write-Host "API:   http://localhost:3000"
  Write-Host "Redis: redis://127.0.0.1:6379"
  Write-Host ""
  Write-Host "Tip: use scripts\start-dev.ps1 -Restart to restart API/Web windows."

  if (-not $NoBrowser) {
    Start-Process "http://localhost:5173"
  }
} finally {
  Pop-Location
}
