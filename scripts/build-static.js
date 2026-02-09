const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Preparando versión estática para GitHub Pages...\n');

// Función para copiar recursivamente
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Función para eliminar recursivamente
function removeRecursiveSync(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        removeRecursiveSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// 1. Hacer backup de archivos originales
console.log('📦 Haciendo backup de archivos originales...');
const backupDir = path.join(process.cwd(), '.backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const filesToBackup = [
  { src: 'src/app/home/page.tsx', dest: '.backup/home-page.original.tsx' },
  { src: 'src/app/login/page.tsx', dest: '.backup/login-page.original.tsx' },
  { src: 'src/app/register/page.tsx', dest: '.backup/register-page.original.tsx' },
  { src: 'next.config.ts', dest: '.backup/next.config.original.ts' }
];

filesToBackup.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

// 2. Mover temporalmente las rutas de API (usando copy + delete)
console.log('📦 Excluyendo temporalmente rutas de API...');
const apiDir = path.join(process.cwd(), 'src/app/api');
const apiBackupDir = path.join(process.cwd(), '.backup/api');
if (fs.existsSync(apiDir)) {
  // Limpiar backup anterior si existe
  if (fs.existsSync(apiBackupDir)) {
    removeRecursiveSync(apiBackupDir);
  }
  fs.mkdirSync(apiBackupDir, { recursive: true });
  
  // Copiar la carpeta API
  copyRecursiveSync(apiDir, path.join(apiBackupDir, 'api'));
  
  // Eliminar la carpeta API original
  try {
    removeRecursiveSync(apiDir);
    console.log('✓ Rutas de API excluidas temporalmente');
  } catch (error) {
    console.warn('⚠️  No se pudo eliminar la carpeta API:', error.message);
    console.log('⚠️  Continuando de todas formas...');
  }
}

// 3. Usar versiones estáticas
console.log('🔄 Reemplazando con versiones estáticas...');
const staticFiles = [
  { src: 'src/app/home/page.static.tsx', dest: 'src/app/home/page.tsx' },
  { src: 'src/app/login/page.static.tsx', dest: 'src/app/login/page.tsx' },
  { src: 'src/app/register/page.static.tsx', dest: 'src/app/register/page.tsx' },
  { src: 'next.config.static.ts', dest: 'next.config.ts' }
];

staticFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  } else {
    console.warn(`⚠️  Archivo ${src} no encontrado`);
  }
});

// 4. Limpiar cache de Next.js
console.log('🧹 Limpiando cache de Next.js...');
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  try {
    removeRecursiveSync(nextDir);
    console.log('✓ Cache limpiado');
  } catch (error) {
    console.warn('⚠️  No se pudo limpiar el cache completamente:', error.message);
  }
}

// 5. Generar build
console.log('🏗️  Generando build estático...');
try {
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
} catch (error) {
  console.error('❌ Error al generar build');
  // Restaurar API antes de salir
  if (fs.existsSync(path.join(apiBackupDir, 'api'))) {
    copyRecursiveSync(path.join(apiBackupDir, 'api'), apiDir);
  }
  // Restaurar archivos originales
  filesToBackup.forEach(({ src, dest }) => {
    if (fs.existsSync(dest)) {
      fs.copyFileSync(dest, src);
    }
  });
  process.exit(1);
}

// 6. Restaurar rutas de API
console.log('↩️  Restaurando rutas de API...');
if (fs.existsSync(path.join(apiBackupDir, 'api'))) {
  copyRecursiveSync(path.join(apiBackupDir, 'api'), apiDir);
  console.log('✓ Rutas de API restauradas');
}

// 7. Crear .nojekyll
console.log('📝 Creando archivo .nojekyll...');
const outDir = path.join(process.cwd(), 'out');
if (fs.existsSync(outDir)) {
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
}

// 8. Restaurar archivos originales
console.log('↩️  Restaurando archivos originales...');
filesToBackup.forEach(({ src, dest }) => {
  if (fs.existsSync(dest)) {
    fs.copyFileSync(dest, src);
  }
});

console.log('\n✅ ¡Build estático completado!');
console.log('📁 Los archivos están en la carpeta "out/"');
console.log('🚀 Listo para subir a GitHub Pages\n');
