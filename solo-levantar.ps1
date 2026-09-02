# EducaPlus - Levantar servidor (PowerShell)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Info($msg)  { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host $msg -ForegroundColor Red }

Write-Host '========================================' -ForegroundColor Magenta
Write-Host '  EducaPlus - Levantar servidor' -ForegroundColor Magenta
Write-Host '========================================' -ForegroundColor Magenta
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err '[ERROR] Node.js no esta instalado.'
    Write-Info 'Instala Node.js desde https://nodejs.org'
    Read-Host 'Presiona Enter para salir'
    exit 1
}

if (-not (Test-Path 'package.json')) {
    Write-Err '[ERROR] No se encontro package.json en esta carpeta.'
    Read-Host 'Presiona Enter para salir'
    exit 1
}

if (-not (Test-Path '.next')) {
    Write-Err '[ERROR] No hay build de produccion.'
    Write-Warn 'Compila primero desde Cursor con: npm run build'
    Read-Host 'Presiona Enter para salir'
    exit 1
}

if (-not (Test-Path 'node_modules')) {
    Write-Warn '[INFO] Instalando dependencias...'
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err '[ERROR] Fallo npm install.'
        Read-Host 'Presiona Enter para salir'
        exit 1
    }
}

Write-Ok '[INFO] Iniciando servidor en http://localhost:3000'
Write-Info '[INFO] Para detener, ejecuta stop-server.bat o cierra esta ventana.'
Write-Host ''

npm start

Read-Host 'Presiona Enter para salir'
