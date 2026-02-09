import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function getCompetenciasConCapacidades(areaId: number, gradoId: number) {
  try {
    console.log(`\n🔍 Obteniendo competencias para Área ID: ${areaId}, Grado ID: ${gradoId}\n`)

    const competencias = await prisma.competencia.findMany({
      where: {
        idarea: areaId,
        idgrado: gradoId,
        transversal: false // Solo competencias no transversales
      },
      include: {
        capacidades: {
          select: {
            id: true
          }
        },
        area: {
          select: {
            descripcion: true
          }
        }
      },
      orderBy: {
        numeroCompetencia: 'asc'
      }
    })

    console.log(`✅ Encontradas ${competencias.length} competencias\n`)

    // Formatear la lista para el Word
    const listaFormateada = competencias.map(comp => {
      const numCapacidades = comp.capacidades.length
      return `• ${comp.descripcion}: ${numCapacidades} capacidad${numCapacidades !== 1 ? 'es' : ''}`
    })

    console.log('📋 LISTA PARA EL WORD:\n')
    console.log(listaFormateada.join('\n'))
    console.log('\n')

    // También mostrar en formato JSON para uso programático
    const listaJSON = competencias.map(comp => ({
      id: comp.id,
      numeroCompetencia: comp.numeroCompetencia,
      descripcion: comp.descripcion,
      numCapacidades: comp.capacidades.length
    }))

    console.log('📊 FORMATO JSON:\n')
    console.log(JSON.stringify(listaJSON, null, 2))
    console.log('\n')

    // Formato para usar con docxtemplater (texto plano)
    const textoParaWord = competencias.map(comp => 
      `${comp.descripcion}: ${comp.capacidades.length} capacidades`
    ).join('\n')

    console.log('📝 TEXTO PARA INSERTAR EN EL WORD:\n')
    console.log(textoParaWord)
    console.log('\n')

    return {
      competencias: listaJSON,
      textoFormateado: listaFormateada.join('\n'),
      textoPlano: textoParaWord
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  // Ejemplo: Área Comunicación (ID 1) y Grado 1
  const areaId = process.argv[2] ? parseInt(process.argv[2]) : 1
  const gradoId = process.argv[3] ? parseInt(process.argv[3]) : 1

  getCompetenciasConCapacidades(areaId, gradoId)
    .then(() => {
      console.log('✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error)
      process.exit(1)
    })
}

export { getCompetenciasConCapacidades }

