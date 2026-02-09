# Guía para actualizar a Node.js y Prisma 7

## Paso 1: Actualizar Node.js

Prisma 7 requiere Node.js 20.19+, 22.12+, o 24.0+.

### Opción A: Usando nvm (Node Version Manager) - Recomendado

Si tienes nvm instalado:

```bash
# Ver versiones disponibles
nvm list available

# Instalar Node.js 20.19 o superior (o 22.12+)
nvm install 20.19.0
# o
nvm install 22.12.0

# Usar la versión instalada
nvm use 20.19.0
```

### Opción B: Descargar desde nodejs.org

1. Ve a https://nodejs.org/
2. Descarga la versión LTS más reciente (22.x o superior)
3. Instala siguiendo el asistente
4. Reinicia tu terminal/PowerShell

### Verificar la instalación

```bash
node --version
# Debería mostrar v20.19.0 o superior, o v22.12.0 o superior
```

## Paso 2: Actualizar Prisma a la versión 7

Una vez que tengas Node.js actualizado:

```bash
npm install prisma@latest @prisma/client@latest
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg
```

## Paso 3: Configurar Prisma 7

Los archivos ya están preparados. Solo necesitas:
1. Actualizar el schema.prisma (remover `url`)
2. Crear prisma/config.ts
3. Actualizar src/lib/prisma.ts para usar el adapter

¡Sigue las instrucciones que te daré después de actualizar Node.js!

