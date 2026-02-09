import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function checkPrompts() {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: { idprompt: 'asc' }
    })
    
    prompts.forEach(p => {
      console.log(`\n=== PROMPT ID: ${p.idprompt} ===`)
      console.log(`Descripción: ${p.descripcion}`)
      console.log(`Estado: ${p.estado}`)
      console.log(`Longitud del contenido: ${p.contenido.length} caracteres`)
      console.log(`\nPrimeros 200 caracteres:\n${p.contenido.substring(0, 200)}...`)
      console.log(`\nÚltimos 200 caracteres:\n...${p.contenido.substring(p.contenido.length - 200)}`)
    })
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

checkPrompts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error)
    process.exit(1)
  })

