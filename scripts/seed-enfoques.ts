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
  console.log('🌱 Insertando enfoques transversales...')

  const enfoques = [
    { idenfoque: 1, descripcion: 'Enfoque de derechos', idnivel: 2 },
    { idenfoque: 2, descripcion: 'Enfoque Inclusivo o de Atención a la diversidad', idnivel: 2 },
    { idenfoque: 3, descripcion: 'Enfoque intercultural', idnivel: 2 },
    { idenfoque: 4, descripcion: 'Enfoque igualdad de género', idnivel: 2 },
    { idenfoque: 5, descripcion: 'Enfoque ambiental', idnivel: 2 },
    { idenfoque: 6, descripcion: 'Enfoque de orientación al bien común', idnivel: 2 },
    { idenfoque: 7, descripcion: 'Enfoque de búsqueda de la excelencia', idnivel: 2 },
  ]

  for (const enfoque of enfoques) {
    try {
      await prisma.enfoqueTransversal.upsert({
        where: { idenfoque: enfoque.idenfoque },
        update: enfoque,
        create: enfoque,
      })
      console.log(`✅ Insertado: ${enfoque.descripcion}`)
    } catch (error) {
      console.error(`❌ Error al insertar ${enfoque.descripcion}:`, error)
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

