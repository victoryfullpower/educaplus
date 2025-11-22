# Proyecto de Educación - Next.js con Prisma y PostgreSQL

Este es un proyecto Next.js con autenticación, usando Prisma como ORM y PostgreSQL 17 como base de datos.

## Características

- ✅ Login y registro de usuarios
- ✅ Página de inicio protegida
- ✅ Autenticación basada en cookies
- ✅ Prisma ORM con PostgreSQL 17
- ✅ Hash de contraseñas con bcryptjs

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar la base de datos

El archivo `.env` ya está configurado con:
- Puerto: 5433
- Contraseña: 123456
- Usuario: postgres (ajusta si es diferente)
- Base de datos: test

Si necesitas cambiar estos valores, edita el archivo `.env`:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5433/test?schema=public"
```

**Importante**: Asegúrate de que la base de datos `test` exista en tu PostgreSQL. Si no existe, créala primero:

```sql
CREATE DATABASE test;
```

### 3. Generar el cliente de Prisma

```bash
npx prisma generate
```

### 4. Ejecutar las migraciones

```bash
npx prisma migrate dev --name init
```

Esto creará las tablas necesarias en tu base de datos PostgreSQL.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

- `/src/app/login` - Página de inicio de sesión
- `/src/app/register` - Página de registro
- `/src/app/home` - Página principal (protegida)
- `/src/app/api/auth` - Endpoints de autenticación
- `/src/lib/prisma.ts` - Cliente de Prisma
- `/prisma/schema.prisma` - Esquema de la base de datos

## Rutas

- `/` - Redirige a `/login`
- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/home` - Página principal (requiere autenticación)

## Tecnologías

- **Next.js 16** - Framework de React
- **TypeScript** - Tipado estático
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL 17** - Base de datos
- **bcryptjs** - Hash de contraseñas
