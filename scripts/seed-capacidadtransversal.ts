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

const datosCapacidadtransversal = [
  { idcapacidadtransversal: 1, descripcion: 'Personaliza entornos virtuales.', idcomtransversal: 1 },
  { idcapacidadtransversal: 2, descripcion: 'Gestiona información del entorno virtual.', idcomtransversal: 1 },
  { idcapacidadtransversal: 3, descripcion: 'Interactúa en entornos virtuales.', idcomtransversal: 1 },
  { idcapacidadtransversal: 4, descripcion: 'Crea objetos virtuales en diversos formatos.', idcomtransversal: 1 },
  { idcapacidadtransversal: 5, descripcion: 'Define metas de aprendizaje.', idcomtransversal: 2 },
  { idcapacidadtransversal: 6, descripcion: 'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje.', idcomtransversal: 2 },
  { idcapacidadtransversal: 7, descripcion: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje.', idcomtransversal: 2 },
  { idcapacidadtransversal: 8, descripcion: 'Personaliza entornos virtuales.', idcomtransversal: 3 },
  { idcapacidadtransversal: 9, descripcion: 'Gestiona información del entorno virtual.', idcomtransversal: 3 },
  { idcapacidadtransversal: 10, descripcion: 'Interactúa en entornos virtuales.', idcomtransversal: 3 },
  { idcapacidadtransversal: 11, descripcion: 'Crea objetos virtuales en diversos formatos.', idcomtransversal: 3 },
  { idcapacidadtransversal: 12, descripcion: 'Define metas de aprendizaje.', idcomtransversal: 4 },
  { idcapacidadtransversal: 13, descripcion: 'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje.', idcomtransversal: 4 },
  { idcapacidadtransversal: 14, descripcion: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje.', idcomtransversal: 4 },
  { idcapacidadtransversal: 15, descripcion: 'Personaliza entornos virtuales.', idcomtransversal: 5 },
  { idcapacidadtransversal: 16, descripcion: 'Gestiona información del entorno virtual.', idcomtransversal: 5 },
  { idcapacidadtransversal: 17, descripcion: 'Interactúa en entornos virtuales.', idcomtransversal: 5 },
  { idcapacidadtransversal: 18, descripcion: 'Crea objetos virtuales en diversos formatos.', idcomtransversal: 5 },
  { idcapacidadtransversal: 19, descripcion: 'Define metas de aprendizaje.', idcomtransversal: 6 },
  { idcapacidadtransversal: 20, descripcion: 'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje.', idcomtransversal: 6 },
  { idcapacidadtransversal: 21, descripcion: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje.', idcomtransversal: 6 },
  { idcapacidadtransversal: 22, descripcion: 'Personaliza entornos virtuales.', idcomtransversal: 7 },
  { idcapacidadtransversal: 23, descripcion: 'Gestiona información del entorno virtual.', idcomtransversal: 7 },
  { idcapacidadtransversal: 24, descripcion: 'Interactúa en entornos virtuales.', idcomtransversal: 7 },
  { idcapacidadtransversal: 25, descripcion: 'Crea objetos virtuales en diversos formatos.', idcomtransversal: 7 },
  { idcapacidadtransversal: 26, descripcion: 'Define metas de aprendizaje.', idcomtransversal: 8 },
  { idcapacidadtransversal: 27, descripcion: 'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje.', idcomtransversal: 8 },
  { idcapacidadtransversal: 28, descripcion: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje.', idcomtransversal: 8 },
  { idcapacidadtransversal: 29, descripcion: 'Personaliza entornos virtuales.', idcomtransversal: 9 },
  { idcapacidadtransversal: 30, descripcion: 'Gestiona información del entorno virtual.', idcomtransversal: 9 },
  { idcapacidadtransversal: 31, descripcion: 'Interactúa en entornos virtuales.', idcomtransversal: 9 },
  { idcapacidadtransversal: 32, descripcion: 'Crea objetos virtuales en diversos formatos.', idcomtransversal: 9 },
  { idcapacidadtransversal: 33, descripcion: 'Define metas de aprendizaje.', idcomtransversal: 10 },
  { idcapacidadtransversal: 34, descripcion: 'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje.', idcomtransversal: 10 },
  { idcapacidadtransversal: 35, descripcion: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje.', idcomtransversal: 10 },
]

async function main() {
  console.log('🌱 Iniciando migración de datos para capacidadtransversal...')

  for (const data of datosCapacidadtransversal) {
    try {
      await prisma.capacidadtransversal.upsert({
        where: { idcapacidadtransversal: data.idcapacidadtransversal },
        update: {
          descripcion: data.descripcion,
          idcomtransversal: data.idcomtransversal
        },
        create: data
      })
      console.log(`✅ Insertado/actualizado: ${data.idcapacidadtransversal} - ${data.descripcion.substring(0, 50)}...`)
    } catch (error) {
      console.error(`❌ Error al insertar id ${data.idcapacidadtransversal}:`, error)
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

