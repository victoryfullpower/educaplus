/**
 * Script para insertar los datos de ciclos y actualizar grados con idciclo
 * Ejecutar con: npx tsx scripts/seed-ciclos-grados.ts
 */

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

async function seedCiclosYGrados() {
  try {
    console.log('🌱 Iniciando inserción de ciclos y actualización de grados...')

    // 1. Insertar o actualizar ciclos
    console.log('📝 Creando/actualizando ciclos...')
    
    const ciclo1 = await prisma.ciclo.upsert({
      where: { id: 1 },
      update: { descripcion: 'VI' },
      create: { id: 1, descripcion: 'VI' }
    })
    console.log('✅ Ciclo 1 (VI) creado/actualizado')

    const ciclo2 = await prisma.ciclo.upsert({
      where: { id: 2 },
      update: { descripcion: 'VII' },
      create: { id: 2, descripcion: 'VII' }
    })
    console.log('✅ Ciclo 2 (VII) creado/actualizado')

    // 2. Actualizar grados con idciclo
    // Grados 1 y 2 -> Ciclo 1 (VI)
    // Grados 3, 4 y 5 -> Ciclo 2 (VII)
    
    console.log('📝 Actualizando grados con idciclo...')
    
    await prisma.grado.updateMany({
      where: { id: { in: [1, 2] } },
      data: { idciclo: 1 }
    })
    console.log('✅ Grados 1 y 2 actualizados con idciclo = 1')

    await prisma.grado.updateMany({
      where: { id: { in: [3, 4, 5] } },
      data: { idciclo: 2 }
    })
    console.log('✅ Grados 3, 4 y 5 actualizados con idciclo = 2')

    // Verificar que los grados tienen idciclo
    const grados = await prisma.grado.findMany({
      include: { ciclo: true },
      orderBy: { id: 'asc' }
    })
    
    console.log('\n📊 Verificación de grados:')
    grados.forEach(g => {
      console.log(`  - Grado ${g.id}: "${g.descripcion}" -> Ciclo ${g.idciclo} (${g.ciclo.descripcion})`)
    })

    console.log('\n🎉 ¡Ciclos y grados actualizados exitosamente!')
  } catch (error) {
    console.error('❌ Error al insertar ciclos/grados:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

seedCiclosYGrados()
  .then(() => {
    console.log('✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })

