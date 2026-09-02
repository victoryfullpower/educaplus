# EducaPlus - Levantar servidor desde cualquier ubicacion
$ErrorActionPreference = 'Stop'

$projectPath = 'C:\temp\sellos\educaplus'

function Write-Info($msg)  { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host $msg -ForegroundColor Green }
function Write-Err($msg)   { Write-Host $msg -ForegroundColor Red }

Write-Host '========================================' -ForegroundColor Magenta
Write-Host '  EducaPlus - Levantar servidor' -ForegroundColor Magenta
Write-Host '========================================' -ForegroundColor Magenta
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err '[ERROR] Node.js no esta instalado.'
    Read-Host 'Presiona Enter para salir'
    exit 1
}

if (-not (Test-Path (Join-Path $projectPath 'package.json'))) {
    Write-Err "[ERROR] No se encontro el proyecto en: $projectPath"
    Read-Host 'Presiona Enter para salir'
    exit 1
}

if (-not (Test-Path (Join-Path $projectPath '.next'))) {
    Write-Err '[ERROR] No hay build de produccion.'
    Write-Info 'Compila primero desde Cursor con: npm run build'
    Read-Host 'Presiona Enter para salir'
    exit 1
}

Set-Location $projectPath
Write-Ok "[INFO] Proyecto: $projectPath"
Write-Ok '[INFO] Iniciando servidor en http://localhost:3000'
Write-Host ''

npm start

Read-Host 'Presiona Enter para salir'
