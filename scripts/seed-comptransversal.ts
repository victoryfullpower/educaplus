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

const datosComptransversal = [
  { idcomtransversal: 1, descripcion: 'Se desenvuelve en entornos virtuales generados por las TIC.', idgrado: 1 },
  { idcomtransversal: 2, descripcion: 'Gestiona su aprendizaje de manera autónoma', idgrado: 1 },
  { idcomtransversal: 3, descripcion: 'Se desenvuelve en entornos virtuales generados por las TIC.', idgrado: 2 },
  { idcomtransversal: 4, descripcion: 'Gestiona su aprendizaje de manera autónoma', idgrado: 2 },
  { idcomtransversal: 5, descripcion: 'Se desenvuelve en entornos virtuales generados por las TIC.', idgrado: 3 },
  { idcomtransversal: 6, descripcion: 'Gestiona su aprendizaje de manera autónoma', idgrado: 3 },
  { idcomtransversal: 7, descripcion: 'Se desenvuelve en entornos virtuales generados por las TIC.', idgrado: 4 },
  { idcomtransversal: 8, descripcion: 'Gestiona su aprendizaje de manera autónoma', idgrado: 4 },
  { idcomtransversal: 9, descripcion: 'Se desenvuelve en entornos virtuales generados por las TIC.', idgrado: 5 },
  { idcomtransversal: 10, descripcion: 'Gestiona su aprendizaje de manera autónoma', idgrado: 5 },
]

async function main() {
  console.log('🌱 Iniciando migración de datos para comptransversal...')

  for (const data of datosComptransversal) {
    try {
      await prisma.comptransversal.upsert({
        where: { idcomtransversal: data.idcomtransversal },
        update: {
          descripcion: data.descripcion,
          idgrado: data.idgrado
        },
        create: data
      })
      console.log(`✅ Insertado/actualizado: ${data.idcomtransversal} - ${data.descripcion.substring(0, 50)}...`)
    } catch (error) {
      console.error(`❌ Error al insertar id ${data.idcomtransversal}:`, error)
    }
  }

  console.log('✅ Migración de datos completada')
}

main()
  .catch((e) => {
    console.error('❌ Error en la migración:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

