// Script de prueba para verificar la API de prompts
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function testQuery() {
  try {
    console.log('Consultando prompts desde Prisma...')
    const prompts = await prisma.prompt.findMany({ 
      orderBy: { fechacreacion: 'desc' } 
    })
    console.log(`✅ Encontrados ${prompts.length} prompts`)
    prompts.forEach(p => {
      console.log(`  - ID: ${p.idprompt}, Descripción: ${p.descripcion}, Estado: ${p.estado}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

testQuery()

