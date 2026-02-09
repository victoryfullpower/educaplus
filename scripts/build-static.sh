#!/bin/bash

# Script para generar versión estática del proyecto

echo "🔧 Preparando versión estática para GitHub Pages..."

# 1. Hacer backup de archivos originales
echo "📦 Haciendo backup de archivos originales..."
mkdir -p .backup
cp src/app/home/page.tsx .backup/home-page.original.tsx 2>/dev/null || true
cp src/app/login/page.tsx .backup/login-page.original.tsx 2>/dev/null || true
cp src/app/register/page.tsx .backup/register-page.original.tsx 2>/dev/null || true
cp next.config.ts .backup/next.config.original.ts 2>/dev/null || true

# 2. Usar versiones estáticas
echo "🔄 Reemplazando con versiones estáticas..."
cp src/app/home/page.static.tsx src/app/home/page.tsx
cp src/app/login/page.static.tsx src/app/login/page.tsx
cp src/app/register/page.static.tsx src/app/register/page.tsx
cp next.config.static.ts next.config.ts

# 3. Generar build
echo "🏗️  Generando build estático..."
npm run build

# 4. Crear .nojekyll
echo "📝 Creando archivo .nojekyll..."
touch out/.nojekyll

# 5. Restaurar archivos originales
echo "↩️  Restaurando archivos originales..."
cp .backup/home-page.original.tsx src/app/home/page.tsx 2>/dev/null || true
cp .backup/login-page.original.tsx src/app/login/page.tsx 2>/dev/null || true
cp .backup/register-page.original.tsx src/app/register/page.tsx 2>/dev/null || true
cp .backup/next.config.original.ts next.config.ts 2>/dev/null || true

echo "✅ ¡Build estático completado!"
echo "📁 Los archivos están en la carpeta 'out/'"
echo "🚀 Listo para subir a GitHub Pages"

