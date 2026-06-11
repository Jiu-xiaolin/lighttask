param(
  [switch]$Rebuild,
  [switch]$Logs
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.docker"
$exampleFile = Join-Path $root ".env.docker.example"

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes)
}

function New-HexSecret {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return (($bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Read-EnvValue($Path, $Key, $Fallback) {
  $line = Get-Content $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) { return $Fallback }
  $value = $line.Substring($Key.Length + 1).Trim()
  if (-not $value) { return $Fallback }
  return $value
}

Set-Location $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "未检测到 Docker，请先安装 Docker Desktop 或 Docker Engine。"
}

docker compose version | Out-Null

if (-not (Test-Path $envFile)) {
  Copy-Item $exampleFile $envFile
  $content = Get-Content $envFile -Raw
  $content = $content.Replace("please-change-postgres-password", (New-HexSecret))
  $content = $content.Replace("please-change-this-to-a-random-string-longer-than-32-chars", (New-RandomSecret))
  $content = $content.Replace("please-change-this-too", (New-RandomSecret))
  Set-Content -Path $envFile -Value $content -NoNewline
  Write-Host "已生成 .env.docker，请按需修改域名、飞书和管理员密码。" -ForegroundColor Yellow
}

$args = @("compose", "--env-file", ".env.docker", "up", "-d")
if ($Rebuild) {
  $args += "--build"
}

Write-Host "正在启动 LightTask Docker 环境..." -ForegroundColor Cyan
docker @args

Write-Host ""
Write-Host "部署完成：" -ForegroundColor Green
$webPort = Read-EnvValue $envFile "WEB_PORT" "8080"
$apiPort = Read-EnvValue $envFile "API_PORT" "3000"
Write-Host "  Web: http://localhost:$webPort"
Write-Host "  API: http://localhost:$apiPort/api/health/ready"
Write-Host "  初始账号见 .env.docker 的 BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD"

if ($Logs) {
  docker compose --env-file .env.docker logs -f
}
