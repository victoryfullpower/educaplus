@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   EducaPlus - Levantar servidor
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] No se encontro package.json en esta carpeta.
    pause
    exit /b 1
)

if not exist ".next\" (
    echo [ERROR] No hay build de produccion.
    echo Compila primero desde Cursor con: npm run build
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo npm install.
        pause
        exit /b 1
    )
)

echo [INFO] Iniciando servidor en http://localhost:3000
echo [INFO] Para detener, ejecuta stop-server.bat o cierra esta ventana.
echo.

call npm start

pause
