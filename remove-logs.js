const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'unidades-aprendizaje', 'generate-document', 'route.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Eliminar líneas que contengan console.log, console.error, console.warn, console.info, console.debug
// Pero mantener las líneas que sean parte de strings o comentarios
const lines = content.split('\n');
const filteredLines = lines.filter(line => {
  // Si la línea contiene console.log/error/etc pero está dentro de un string o comentario, mantenerla
  const trimmed = line.trim();
  
  // Si es un comentario que contiene console, mantenerlo
  if (trimmed.startsWith('//') && trimmed.includes('console')) {
    return true;
  }
  
  // Si contiene console.log/error/etc como parte del código (no comentario), eliminarla
  if (trimmed.match(/^\s*console\.(log|error|warn|info|debug)/)) {
    return false;
  }
  
  return true;
});

const newContent = filteredLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('Logs eliminados exitosamente');

