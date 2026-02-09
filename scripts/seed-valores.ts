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
  console.log('🌱 Insertando valores...')

  const valores = [
    {
      idvalor: 1,
      descripcion: 'Conciencia de derechos',
      actitud: 'Disposición a conocer, reconocer y valorar los derechos individuales y colectivos que tenemos las personas en el ámbito privado y público'
    },
    {
      idvalor: 2,
      descripcion: 'Libertad y responsabilidad',
      actitud: 'Disposición a elegir de manera voluntaria y responsable la propia forma de actuar dentro de una sociedad'
    },
    {
      idvalor: 3,
      descripcion: 'Diálogo y concertación',
      actitud: 'Disposición a conversar con otras personas, intercambiando ideas o afectos de modo alternativo para construir juntos una postura común.'
    },
    {
      idvalor: 4,
      descripcion: 'Respeto por las diferencias',
      actitud: 'Reconocimiento al valor inherente de cada persona y de sus derechos, por encima de cualquier diferencia'
    },
    {
      idvalor: 5,
      descripcion: 'Equidad en la enseñanza',
      actitud: 'Disposición a enseñar ofreciendo a los estudiantes las condiciones y oportunidades que cada uno necesita para lograr los mismos resultados'
    },
    {
      idvalor: 6,
      descripcion: 'Confianza en la persona',
      actitud: 'Disposición a depositar expectativas en una persona, creyendo sinceramente en su capacidad de superación y crecimiento por sobre cualquier circunstancia'
    },
    {
      idvalor: 7,
      descripcion: 'Respeto a la identidad cultural',
      actitud: 'Reconocimiento al valor de las diversas identidades culturales y relaciones de pertenencia de los estudiantes'
    },
    {
      idvalor: 8,
      descripcion: 'Justicia',
      actitud: 'Disposición a actuar de manera justa, respetando el derecho de todos, exigiendo sus propios derechos y reconociendo derechos a quienes les corresponde'
    },
    {
      idvalor: 9,
      descripcion: 'Diálogo intercultural',
      actitud: 'Fomento de una interacción equitativa entre diversas culturas, mediante el diálogo y el respeto mutuo'
    },
    {
      idvalor: 10,
      descripcion: 'Igualdad y Dignidad',
      actitud: 'Reconocimiento al valor inherente de cada persona, por encima de cualquier diferencia de género'
    },
    {
      idvalor: 11,
      descripcion: 'Justicia',
      actitud: 'Disposición a actuar de modo que se dé a cada uno lo que le corresponde, en especial a quienes se ven perjudicados por las desigualdades de género'
    },
    {
      idvalor: 12,
      descripcion: 'Empatía',
      actitud: 'Reconoce y valora las emociones y necesidades afectivas de los otros/as y muestra sensibilidad ante ellas al identificar situaciones de desigualdad de género, evidenciando así la capacidad de comprender o acompañar a las personas en dichas emociones o necesidades afectivas.'
    },
    {
      idvalor: 13,
      descripcion: 'Solidaridad planetaria y equidad intergeneracional',
      actitud: 'Disposición para colaborar con el bienestar y la calidad de vida de las generaciones presentes y futuras, así como con la naturaleza asumiendo el cuidado del planeta'
    },
    {
      idvalor: 14,
      descripcion: 'Justicia y solidaridad',
      actitud: 'Disposición a evaluar los impactos y costos ambientales de las acciones y actividades cotidianas, y a actuar en beneficio de todas las personas, así como de los sistemas, instituciones y medios compartidos de los que todos dependemos.'
    },
    {
      idvalor: 15,
      descripcion: 'Respeto a toda forma de vida',
      actitud: 'Aprecio, valoración y disposición para el cuidado a toda forma de vida sobre la Tierra desde una mirada sistémica y global, revalorando los saberes ancestrales.'
    },
    {
      idvalor: 16,
      descripcion: 'Equidad y justicia',
      actitud: 'Disposición a reconocer a que, ante situaciones de inicio diferentes, se requieren compensaciones a aquellos con mayores dificultades'
    },
    {
      idvalor: 17,
      descripcion: 'Solidaridad',
      actitud: 'Disposición a apoyar incondicionalmente a personas en situaciones comprometidas o difíciles'
    },
    {
      idvalor: 18,
      descripcion: 'Empatía',
      actitud: 'Identificación afectiva con los sentimientos del otro y disposición para apoyar y comprender sus circunstancias'
    },
    {
      idvalor: 19,
      descripcion: 'Responsabilidad',
      actitud: 'Disposición a valorar y proteger los bienes comunes y compartidos de un colectivo'
    },
    {
      idvalor: 20,
      descripcion: 'Flexibilidad y apertura',
      actitud: 'Disposición para adaptarse a los cambios, modificando si fuera necesario la propia conducta para alcanzar determinados objetivos cuando surgen dificultades, información no conocida o situaciones nuevas'
    },
    {
      idvalor: 21,
      descripcion: 'Superación personal',
      actitud: 'Disposición a adquirir cualidades que mejorarán el propio desempeño y aumentarán el estado de satisfacción consigo mismo y con las circunstancias'
    },
  ]

  for (const valor of valores) {
    try {
      await (prisma as any).valores.upsert({
        where: { idvalor: valor.idvalor },
        update: valor,
        create: valor,
      })
      console.log(`✅ Insertado: ${valor.descripcion}`)
    } catch (error) {
      console.error(`❌ Error al insertar ${valor.descripcion}:`, error)
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

