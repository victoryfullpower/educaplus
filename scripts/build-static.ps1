# Script PowerShell para generar versión estática del proyecto

Write-Host "🔧 Preparando versión estática para GitHub Pages..." -ForegroundColor Cyan

# 1. Hacer backup de archivos originales
Write-Host "📦 Haciendo backup de archivos originales..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path .backup | Out-Null
Copy-Item -Path "src/app/home/page.tsx" -Destination ".backup/home-page.original.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path "src/app/login/page.tsx" -Destination ".backup/login-page.original.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path "src/app/register/page.tsx" -Destination ".backup/register-page.original.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path "next.config.ts" -Destination ".backup/next.config.original.ts" -ErrorAction SilentlyContinue

# 2. Usar versiones estáticas
Write-Host "🔄 Reemplazando con versiones estáticas..." -ForegroundColor Yellow
Copy-Item -Path "src/app/home/page.static.tsx" -Destination "src/app/home/page.tsx" -Force
Copy-Item -Path "src/app/login/page.static.tsx" -Destination "src/app/login/page.tsx" -Force
Copy-Item -Path "src/app/register/page.static.tsx" -Destination "src/app/register/page.tsx" -Force
Copy-Item -Path "next.config.static.ts" -Destination "next.config.ts" -Force

# 3. Generar build
Write-Host "🏗️  Generando build estático..." -ForegroundColor Yellow
npm run build

# 4. Crear .nojekyll
Write-Host "📝 Creando archivo .nojekyll..." -ForegroundColor Yellow
New-Item -ItemType File -Path "out/.nojekyll" -Force | Out-Null

# 5. Restaurar archivos originales
Write-Host "↩️  Restaurando archivos originales..." -ForegroundColor Yellow
Copy-Item -Path ".backup/home-page.original.tsx" -Destination "src/app/home/page.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path ".backup/login-page.original.tsx" -Destination "src/app/login/page.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path ".backup/register-page.original.tsx" -Destination "src/app/register/page.tsx" -ErrorAction SilentlyContinue
Copy-Item -Path ".backup/next.config.original.ts" -Destination "next.config.ts" -ErrorAction SilentlyContinue

Write-Host "✅ ¡Build estático completado!" -ForegroundColor Green
Write-Host "📁 Los archivos están en la carpeta 'out/'" -ForegroundColor Green
Write-Host "🚀 Listo para subir a GitHub Pages" -ForegroundColor Green

