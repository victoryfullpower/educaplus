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
  console.log('🌱 Insertando relaciones valor-actividad demostrable...')

  const relaciones = [
    { idvalact: 1, idvalor: 1, idactdemostrable: 1 },
    { idvalact: 2, idvalor: 1, idactdemostrable: 2 },
    { idvalact: 3, idvalor: 2, idactdemostrable: 3 },
    { idvalact: 4, idvalor: 2, idactdemostrable: 4 },
    { idvalact: 5, idvalor: 3, idactdemostrable: 5 },
    { idvalact: 6, idvalor: 4, idactdemostrable: 6 },
    { idvalact: 7, idvalor: 4, idactdemostrable: 7 },
    { idvalact: 8, idvalor: 4, idactdemostrable: 8 },
    { idvalact: 9, idvalor: 5, idactdemostrable: 9 },
    { idvalact: 10, idvalor: 6, idactdemostrable: 10 },
    { idvalact: 11, idvalor: 6, idactdemostrable: 11 },
    { idvalact: 12, idvalor: 6, idactdemostrable: 12 },
    { idvalact: 13, idvalor: 7, idactdemostrable: 13 },
    { idvalact: 14, idvalor: 7, idactdemostrable: 14 },
    { idvalact: 15, idvalor: 7, idactdemostrable: 15 },
    { idvalact: 16, idvalor: 8, idactdemostrable: 16 },
    { idvalact: 17, idvalor: 9, idactdemostrable: 17 },
    { idvalact: 18, idvalor: 10, idactdemostrable: 18 },
    { idvalact: 19, idvalor: 10, idactdemostrable: 19 },
    { idvalact: 20, idvalor: 11, idactdemostrable: 20 },
    { idvalact: 21, idvalor: 11, idactdemostrable: 21 },
    { idvalact: 22, idvalor: 12, idactdemostrable: 22 },
    { idvalact: 23, idvalor: 13, idactdemostrable: 23 },
    { idvalact: 24, idvalor: 13, idactdemostrable: 24 },
    { idvalact: 25, idvalor: 14, idactdemostrable: 25 },
    { idvalact: 26, idvalor: 14, idactdemostrable: 26 },
    { idvalact: 27, idvalor: 14, idactdemostrable: 27 },
    { idvalact: 28, idvalor: 14, idactdemostrable: 28 },
    { idvalact: 29, idvalor: 15, idactdemostrable: 29 },
    { idvalact: 30, idvalor: 15, idactdemostrable: 30 },
    { idvalact: 31, idvalor: 15, idactdemostrable: 31 },
    { idvalact: 32, idvalor: 16, idactdemostrable: 32 },
    { idvalact: 33, idvalor: 17, idactdemostrable: 33 },
    { idvalact: 34, idvalor: 18, idactdemostrable: 34 },
    { idvalact: 35, idvalor: 19, idactdemostrable: 35 },
    { idvalact: 36, idvalor: 20, idactdemostrable: 36 },
    { idvalact: 37, idvalor: 20, idactdemostrable: 37 },
    { idvalact: 38, idvalor: 21, idactdemostrable: 38 },
    { idvalact: 39, idvalor: 21, idactdemostrable: 39 },
  ]

  for (const relacion of relaciones) {
    try {
      await (prisma as any).valAct.upsert({
        where: { idvalact: relacion.idvalact },
        update: relacion,
        create: relacion,
      })
      console.log(`✅ Insertado: Valor ${relacion.idvalor} → Actividad ${relacion.idactdemostrable}`)
    } catch (error) {
      console.error(`❌ Error al insertar relación ${relacion.idvalact}:`, error)
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

