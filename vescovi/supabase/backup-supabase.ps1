param(
  [Parameter(Mandatory = $false)]
  [string]$DbHost = $env:SUPABASE_DB_HOST,

  [Parameter(Mandatory = $false)]
  [int]$DbPort = $(if ($env:SUPABASE_DB_PORT) { [int]$env:SUPABASE_DB_PORT } else { 5432 }),

  [Parameter(Mandatory = $false)]
  [string]$DbName = $(if ($env:SUPABASE_DB_NAME) { $env:SUPABASE_DB_NAME } else { "postgres" }),

  [Parameter(Mandatory = $false)]
  [string]$DbUser = $(if ($env:SUPABASE_DB_USER) { $env:SUPABASE_DB_USER } else { "postgres" }),

  [Parameter(Mandatory = $false)]
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,

  [Parameter(Mandatory = $false)]
  [string]$OutputRoot = "./supabase/backups",

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Assert-NotEmpty([string]$value, [string]$name) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Le parametre '$name' est requis (ou variable d'environnement associee)."
  }
}

Assert-NotEmpty $DbHost "DbHost"
Assert-NotEmpty $DbPassword "DbPassword"

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "pg_dump introuvable. Installe PostgreSQL client tools puis reessaie."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputRoot $timestamp

$fullBackup = Join-Path $backupDir "full.backup"
$schemaSql = Join-Path $backupDir "schema.sql"
$dataSql = Join-Path $backupDir "data.sql"

$cmds = @(
  @("--host=$DbHost", "--port=$DbPort", "--username=$DbUser", "--dbname=$DbName", "--format=custom", "--no-owner", "--no-privileges", "--file=$fullBackup"),
  @("--host=$DbHost", "--port=$DbPort", "--username=$DbUser", "--dbname=$DbName", "--schema-only", "--no-owner", "--no-privileges", "--file=$schemaSql"),
  @("--host=$DbHost", "--port=$DbPort", "--username=$DbUser", "--dbname=$DbName", "--data-only", "--inserts", "--no-owner", "--no-privileges", "--file=$dataSql")
)

if ($DryRun) {
  Write-Host "[DRY RUN] Dossier cible: $backupDir"
  foreach ($args in $cmds) {
    Write-Host "pg_dump $($args -join ' ')"
  }
  exit 0
}

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$env:PGPASSWORD = $DbPassword
try {
  foreach ($args in $cmds) {
    & pg_dump @args
    if ($LASTEXITCODE -ne 0) {
      throw "Echec pg_dump avec code de sortie $LASTEXITCODE"
    }
  }
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Sauvegarde terminee dans: $backupDir"
Write-Host "- $fullBackup"
Write-Host "- $schemaSql"
Write-Host "- $dataSql"

