# Sauvegarde Supabase (PostgreSQL)

Ce dossier contient un script PowerShell pour extraire la base Supabase sous forme de sauvegarde.

## Fichier

- `supabase/backup-supabase.ps1`

## Prerequis

- `pg_dump` installe (PostgreSQL client tools)
- Les identifiants de la base Supabase (host, user, password)

## Utilisation rapide

```powershell
Set-Location "E:\Workspace\Vescovi.fr\Vescovi\vescovi"
$env:SUPABASE_DB_HOST = "db.<project-ref>.supabase.co"
$env:SUPABASE_DB_PORT = "5432"
$env:SUPABASE_DB_NAME = "postgres"
$env:SUPABASE_DB_USER = "postgres"
$env:SUPABASE_DB_PASSWORD = "<mot-de-passe-db>"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\supabase\backup-supabase.ps1"
```

Les fichiers de sauvegarde sont crees dans `supabase/backups/<timestamp>/` :

- `full.backup` (format custom pour `pg_restore`)
- `schema.sql`
- `data.sql`

## Test sans executer

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\supabase\backup-supabase.ps1" -DbHost "db.<project-ref>.supabase.co" -DbPassword "dummy" -DryRun
```

## Restauration (exemple)

```powershell
$env:PGPASSWORD = "<mot-de-passe-db>"
pg_restore --host=db.<project-ref>.supabase.co --port=5432 --username=postgres --dbname=postgres --clean --if-exists ".\supabase\backups\<timestamp>\full.backup"
Remove-Item Env:PGPASSWORD
```

