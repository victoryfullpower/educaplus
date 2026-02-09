# Guía para actualizar a Prisma 7

Si deseas actualizar a Prisma 7, sigue estos pasos:

## 1. Actualizar dependencias

```bash
npm install prisma@latest @prisma/client@latest
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg
```

## 2. Actualizar schema.prisma

Remover la propiedad `url` del datasource:

```prisma
datasource db {
  provider = "postgresql"
}
```

## 3. Crear prisma.config.ts

Crear el archivo `prisma/config.ts`:

```typescript
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

## 4. Actualizar src/lib/prisma.ts

```typescript
import { PrismaClient } from '../generated/prisma/client'
import { Adapter } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno')
}

// Crear el adapter para PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new Adapter(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 5. Regenerar el cliente de Prisma

```bash
npx prisma generate
```

## 6. Ejecutar migraciones

```bash
npx prisma migrate dev
```

