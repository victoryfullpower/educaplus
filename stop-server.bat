@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   EducaPlus - Detener servidor
echo ========================================
echo.

set DETENIDO=0

for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [INFO] Deteniendo proceso en puerto 3000 ^(PID %%P^)...
    taskkill /PID %%P /F >nul 2>&1
    if not errorlevel 1 set DETENIDO=1
)

if "%DETENIDO%"=="1" (
    echo [OK] Servidor detenido.
) else (
    echo [INFO] No hay proceso escuchando en el puerto 3000.
    echo [INFO] Intentando detener procesos node.exe...
    taskkill /IM node.exe /F >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Procesos node.exe detenidos.
    ) else (
        echo [INFO] No se encontraron procesos node.exe activos.
    )
)

echo.
pause
