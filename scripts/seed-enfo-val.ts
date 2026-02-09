import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter }) as any

async function main() {
  console.log('🌱 Insertando relaciones enfoque-valor...')

  // Datos basados en la imagen: cada enfoque tiene valores asociados
  // Enfoque 1 → Valores 1, 2, 3
  // Enfoque 2 → Valores 4, 5, 6
  // Enfoque 3 → Valores 7, 8, 9
  // Enfoque 4 → Valores 10, 11, 12
  // Enfoque 5 → Valores 13, 14, 15
  // Enfoque 6 → Valores 16, 17, 18, 19
  // Enfoque 7 → Valores 20, 21

  const relaciones = [
    // Enfoque 1 → Valores 1, 2, 3
    { idenfoval: 1, idenfoque: 1, idvalor: 1 },
    { idenfoval: 2, idenfoque: 1, idvalor: 2 },
    { idenfoval: 3, idenfoque: 1, idvalor: 3 },
    
    // Enfoque 2 → Valores 4, 5, 6
    { idenfoval: 4, idenfoque: 2, idvalor: 4 },
    { idenfoval: 5, idenfoque: 2, idvalor: 5 },
    { idenfoval: 6, idenfoque: 2, idvalor: 6 },
    
    // Enfoque 3 → Valores 7, 8, 9
    { idenfoval: 7, idenfoque: 3, idvalor: 7 },
    { idenfoval: 8, idenfoque: 3, idvalor: 8 },
    { idenfoval: 9, idenfoque: 3, idvalor: 9 },
    
    // Enfoque 4 → Valores 10, 11, 12
    { idenfoval: 10, idenfoque: 4, idvalor: 10 },
    { idenfoval: 11, idenfoque: 4, idvalor: 11 },
    { idenfoval: 12, idenfoque: 4, idvalor: 12 },
    
    // Enfoque 5 → Valores 13, 14, 15
    { idenfoval: 13, idenfoque: 5, idvalor: 13 },
    { idenfoval: 14, idenfoque: 5, idvalor: 14 },
    { idenfoval: 15, idenfoque: 5, idvalor: 15 },
    
    // Enfoque 6 → Valores 16, 17, 18, 19
    { idenfoval: 16, idenfoque: 6, idvalor: 16 },
    { idenfoval: 17, idenfoque: 6, idvalor: 17 },
    { idenfoval: 18, idenfoque: 6, idvalor: 18 },
    { idenfoval: 19, idenfoque: 6, idvalor: 19 },
    
    // Enfoque 7 → Valores 20, 21
    { idenfoval: 20, idenfoque: 7, idvalor: 20 },
    { idenfoval: 21, idenfoque: 7, idvalor: 21 },
  ]

  for (const relacion of relaciones) {
    try {
      await (prisma as any).enfoVal.upsert({
        where: { idenfoval: relacion.idenfoval },
        update: relacion,
        create: relacion,
      })
      console.log(`✅ Insertado: Enfoque ${relacion.idenfoque} → Valor ${relacion.idvalor}`)
    } catch (error) {
      console.error(`❌ Error al insertar relación ${relacion.idenfoval}:`, error)
    }
  }

  console.log('✨ Proceso completado')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

