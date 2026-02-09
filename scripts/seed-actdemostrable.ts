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
  console.log('🌱 Insertando acciones demostrables...')

  const acciones = [
    { idactdemostrable: 1, descripcion: 'Los docentes promueven el conocimiento de los Derechos Humanos y la Convención sobre los Derechos del Niño para empoderar a los estudiantes en su ejercicio democrático.' },
    { idactdemostrable: 2, descripcion: 'Los docentes generan espacios de reflexión y crítica sobre el ejercicio de los derechos individuales y colectivos, especialmente en grupos y poblaciones vulnerables.' },
    { idactdemostrable: 3, descripcion: 'Los docentes promueven oportunidades para que los estudiantes ejerzan sus derechos en la relación con sus pares y adultos.' },
    { idactdemostrable: 4, descripcion: 'Los docentes promueven formas de participación estudiantil que permitan el desarrollo de competencias ciudadanas, articulando acciones con la familia y comunidad en la búsqueda del bien común.' },
    { idactdemostrable: 5, descripcion: 'Los docentes propician y los estudiantes practican la deliberación para arribar a consensos en la reflexión sobre asuntos públicos, la elaboración de normas u otros.' },
    { idactdemostrable: 6, descripcion: 'Docentes y estudiantes demuestran tolerancia, apertura y respeto a todos y cada uno, evitando cualquier forma de discriminación basada en el prejuicio a cualquier diferencia.' },
    { idactdemostrable: 7, descripcion: 'Ni docentes ni estudiantes estigmatizan a nadie.' },
    { idactdemostrable: 8, descripcion: 'Las familias reciben información continua sobre los esfuerzos, méritos, avances y logros de sus hijos, entendiendo su dificultad.' },
    { idactdemostrable: 9, descripcion: 'Los docentes programan y enseñan considerando tiempos, espacios y actividades diferenciadas de acuerdo a las características y demandas de los estudiantes, las que se articulan en situaciones significativas vinculadas a su contexto y realidad.' },
    { idactdemostrable: 10, descripcion: 'Los docentes demuestran altas expectativas sobre todos los estudiantes, incluyendo aquellos que tienen estilos diversos y ritmos de aprendizaje diferentes o viven en contextos difíciles.' },
    { idactdemostrable: 11, descripcion: 'Los docentes convocan a las familias principalmente a reforzar la autonomía, la autoconfianza y la autoestima de sus hijos, antes que a cuestionarlos o sancionarlos' },
    { idactdemostrable: 12, descripcion: 'Los estudiantes protegen y fortalecen en toda circunstancia su autonomía, autoconfianza y autoestima.' },
    { idactdemostrable: 13, descripcion: 'Los docentes y estudiantes acogen con respeto a todos, sin menospreciar ni excluir a nadie en razón de su lengua, su manera de hablar, su forma de vestir, sus costumbres o sus creencias.' },
    { idactdemostrable: 14, descripcion: 'Los docentes hablan la lengua materna de los estudiantes y los acompañan con respeto en su proceso de adquisición del castellano como segunda lengua.' },
    { idactdemostrable: 15, descripcion: 'Los docentes respetan todas las variantes del castellano que se hablan en distintas regiones del país, sin obligar a los estudiantes a que se expresen oralmente solo en castellano estándar.' },
    { idactdemostrable: 16, descripcion: 'Los docentes previenen y afrontan de manera directa toda forma de discriminación, propiciando una reflexión crítica sobre sus causas y motivaciones con todos los estudiantes.' },
    { idactdemostrable: 17, descripcion: 'Los docentes y directivos propician un diálogo continuo entre diversas perspectivas culturales, y entre estas con el saber científico, buscando complementariedades en los distintos planos en los que se formulan para el tratamiento de los desafíos comunes.' },
    { idactdemostrable: 18, descripcion: 'Docentes y estudiantes no hacen distinciones discriminatorias entre varones y mujeres.' },
    { idactdemostrable: 19, descripcion: 'Estudiantes varones y mujeres tienen las mismas responsabilidades en el cuidado de los espacios educativos que utilizan.' },
    { idactdemostrable: 20, descripcion: 'Docentes y directivos fomentan la asistencia de las estudiantes que se encuentran embarazadas o que son madres o padres de familia.' },
    { idactdemostrable: 21, descripcion: 'Docentes y directivos fomentan una valoración sana y respetuosa del cuerpo e integridad de las personas; en especial, se previene y atiende adecuadamente las posibles situaciones de violencia sexual (Ejemplo: tocamientos indebidos, acoso, etc.).' },
    { idactdemostrable: 22, descripcion: 'Estudiantes y docentes analizan los prejuicios entre géneros. Por ejemplo, que las mujeres limpian mejor, que los hombres no son sensibles, que las mujeres tienen menor capacidad que los varones para el aprendizaje de las matemáticas y ciencias, que los varones tienen menor capacidad que las mujeres para desarrollar aprendizajes en el área de Comunicación, que las mujeres son más débiles, que los varones son más irresponsables.' },
    { idactdemostrable: 23, descripcion: 'Docentes y estudiantes desarrollan acciones de ciudadanía, que demuestren conciencia sobre los eventos climáticos extremos ocasionados por el calentamiento global (sequías e inundaciones, entre otros.), así como el desarrollo de capacidades de resiliencia para la adaptación al cambio climático.' },
    { idactdemostrable: 24, descripcion: 'Docentes y estudiantes plantean soluciones en relación a la realidad ambiental de su comunidad, tal como la contaminación, el agotamiento de la capa de ozono, la salud ambiental, etc.' },
    { idactdemostrable: 25, descripcion: 'Docentes y estudiantes realizan acciones para identificar los patrones de producción y consumo de aquellos productos utilizados de forma cotidiana, en la escuela y la comunidad.' },
    { idactdemostrable: 26, descripcion: 'Docentes y estudiantes implementan las 3R (reducir, reusar y reciclar), la segregación adecuada de los residuos sólidos, las medidas de ecoeficiencia, las prácticas de cuidado de la salud y para el bienestar común.' },
    { idactdemostrable: 27, descripcion: 'Docentes y estudiantes impulsan acciones que contribuyan al ahorro del agua y el cuidado de las cuencas hidrográficas de la comunidad, identificando su relación con el cambio climático, adoptando una nueva cultura del agua.' },
    { idactdemostrable: 28, descripcion: 'Docentes y estudiantes promueven la preservación de entornos saludables, a favor de la limpieza de los espacios educativos que comparten, así como de los hábitos de higiene y alimentación saludables.' },
    { idactdemostrable: 29, descripcion: 'Docentes planifican y desarrollan acciones pedagógicas a favor de la preservación de la flora y fauna local, promoviendo la conservación de la diversidad biológica nacional.' },
    { idactdemostrable: 30, descripcion: 'Docentes y estudiantes promueven estilos de vida en armonía con el ambiente, revalorando los saberes locales y el conocimiento ancestral.' },
    { idactdemostrable: 31, descripcion: 'Docentes y estudiantes impulsan la recuperación y uso de las áreas verdes y las áreas naturales, como espacios educativos, a fin de valorar el beneficio que les brindan.' },
    { idactdemostrable: 32, descripcion: 'Los estudiantes comparten siempre los bienes disponibles para ellos en los espacios educativos (recursos, materiales, instalaciones, tiempo, actividades, conocimientos) con sentido de equidad y justicia.' },
    { idactdemostrable: 33, descripcion: 'Los estudiantes demuestran solidaridad con sus compañeros en toda situación en la que padecen dificultades que rebasan sus posibilidades de afrontarlas.' },
    { idactdemostrable: 34, descripcion: 'Los docentes identifican, valoran y destacan continuamente actos espontáneos de los estudiantes en beneficio de otros, dirigidos a procurar o restaurar su bienestar en situaciones que lo requieran.' },
    { idactdemostrable: 35, descripcion: 'Los docentes promueven oportunidades para que las y los estudiantes asuman responsabilidades diversas y los estudiantes las aprovechan, tomando en cuenta su propio bienestar y el de la colectividad.' },
    { idactdemostrable: 36, descripcion: 'Docentes y estudiantes comparan, adquieren emplean estrategias útiles para aumentar la eficacia de sus esfuerzos en el logro de los objetivos que se proponen.' },
    { idactdemostrable: 37, descripcion: 'Docentes y estudiantes demuestran flexibilidad para el cambio y la adaptación a circunstancias diversas, orientados a objetivos de mejora personal o grupal.' },
    { idactdemostrable: 38, descripcion: 'Docentes y estudiantes utilizan sus cualidades y recursos al máximo posible para cumplir con éxito las metas que se proponen a nivel personal y colectivo.' },
    { idactdemostrable: 39, descripcion: 'Docentes y estudiantes se esfuerzan por superarse, buscando objetivos que representen avances respecto de su actual nivel de posibilidades en determinados ámbitos de desempeño.' },
  ]

  for (const accion of acciones) {
    try {
      await (prisma as any).actDemostrable.upsert({
        where: { idactdemostrable: accion.idactdemostrable },
        update: accion,
        create: accion,
      })
      console.log(`✅ Insertado: ${accion.idactdemostrable}`)
    } catch (error) {
      console.error(`❌ Error al insertar ${accion.idactdemostrable}:`, error)
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

