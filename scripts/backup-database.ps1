param(
  [string]$OutputDirectory = $(if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }),
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL is required. Set it in the environment or pass -DatabaseUrl."
  exit 1
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$resolvedOutput = Resolve-Path -LiteralPath $OutputDirectory -ErrorAction SilentlyContinue
if (-not $resolvedOutput) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
  $resolvedOutput = Resolve-Path -LiteralPath $OutputDirectory
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $resolvedOutput "ecommerce-$timestamp.dump"

if ($pgDump) {
  & $pgDump.Source --format=custom --no-owner --no-privileges --file="$target" "$DatabaseUrl"
} else {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $docker) {
    Write-Error "Neither pg_dump nor docker was found. Install PostgreSQL client tools or Docker."
    exit 1
  }

  $postgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "ecommerce" }
  $postgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "ecommerce" }
  $containerTarget = "/tmp/ecommerce-$timestamp.dump"

  & $docker.Source exec ecommerce-postgres pg_dump --format=custom --no-owner --no-privileges --username="$postgresUser" --dbname="$postgresDb" --file="$containerTarget"
  if ($LASTEXITCODE -eq 0) {
    & $docker.Source cp "ecommerce-postgres:$containerTarget" "$target"
    $copyExitCode = $LASTEXITCODE
    & $docker.Source exec ecommerce-postgres rm -f "$containerTarget" | Out-Null
    $global:LASTEXITCODE = $copyExitCode
  }
}

if ($LASTEXITCODE -ne 0) {
  Write-Error "Database backup failed."
  exit $LASTEXITCODE
}

Write-Output "Database backup written to $target"
