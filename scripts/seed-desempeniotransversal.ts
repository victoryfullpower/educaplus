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

const datosDesempeniotransversal = [
  { iddesempeniotransversal: 1, descripcion: 'Navega en diversos entornos virtuales recomendados adaptando funcionalidades básicas de acuerdo con sus necesidades de manera pertinente y responsable.', idcapacidadtransversal: 1 },
  { iddesempeniotransversal: 2, descripcion: 'Clasifica información de diversas fuentes y entornos teniendo en cuenta la pertinencia y exactitud del contenido reconociendo los derechos de autor. ', idcapacidadtransversal: 2 },
  { iddesempeniotransversal: 3, descripcion: 'Registra datos mediante hoja de cálculo que le permita ordenar y secuenciar información relevante.', idcapacidadtransversal: 2 },
  { iddesempeniotransversal: 4, descripcion: 'Participa en actividades interactivas y comunicativas de manera pertinente cuando expresa su identidad personal y sociocultural en entornos virtuales determinados, como redes virtuales, portales educativos y grupos en red.', idcapacidadtransversal: 3 },
  { iddesempeniotransversal: 5, descripcion: 'Utiliza herramientas multimedia e interactivas cuando desarrolla capacidades relacionadas con diversas áreas del conocimiento.', idcapacidadtransversal: 3 },
  { iddesempeniotransversal: 6, descripcion: 'Elabora proyectos escolares de su comunidad y localidad utilizando documentos y presentaciones digitales.', idcapacidadtransversal: 4 },
  { iddesempeniotransversal: 7, descripcion: 'Desarrolla procedimientos lógicos y secuenciales para plantear soluciones a enunciados concretos con lenguajes de programación de código escrito bloques gráficos.', idcapacidadtransversal: 4 },
  { iddesempeniotransversal: 8, descripcion: 'Determina metas de aprendizaje viables asociadas a sus conocimientos, estilos de aprendizaje, habilidades y actitudes para el logro de la tarea, formulándose preguntas de manera reflexiva.', idcapacidadtransversal: 5 },
  { iddesempeniotransversal: 9, descripcion: 'Organiza un conjunto de estrategias y procedimientos en función del tiempo y de los recursos de que dispone para lograr las metas de aprendizaje de acuerdo con sus posibilidades.', idcapacidadtransversal: 6 },
  { iddesempeniotransversal: 10, descripcion: 'Revisa la aplicación de estrategias, procedimientos, recursos y aportes de sus pares para realizar ajustes o cambios en sus acciones que permitan llegar a los resultados esperados.', idcapacidadtransversal: 7 },
  { iddesempeniotransversal: 11, descripcion: 'Explica las acciones realizadas y los recursos movilizados en función de su pertinencia al logro de las metas de aprendizaje.', idcapacidadtransversal: 7 },
  { iddesempeniotransversal: 12, descripcion: 'Organiza aplicaciones y materiales digitales según su utilidad y propósitos variados en un entorno virtual determinado, como televisor, computadora personal, dispositivo móvil, aula virtual, entre otros, para uso personal y necesidades educativas.', idcapacidadtransversal: 8 },
  { iddesempeniotransversal: 13, descripcion: 'Contrasta información recopilada de diversas fuentes y entornos que respondan a consignas y necesidades de investigación o tareas escolares, y resume la información en un documento con pertinencia y considerando la autoría.', idcapacidadtransversal: 9 },
  { iddesempeniotransversal: 14, descripcion: 'Procesa datos mediante hojas de cálculo y base de datos cuando representa gráficamente información con criterios e indicaciones.', idcapacidadtransversal: 9 },
  { iddesempeniotransversal: 15, descripcion: 'Participa en actividades colaborativas en comunidades y redes virtuales para intercambiar y compartir información de manera individual o en grupos de trabajo desde perspectivas multiculturales y de acuerdo con su contexto.', idcapacidadtransversal: 10 },
  { iddesempeniotransversal: 16, descripcion: 'Elabora animaciones, videos y material interactivo en distintos formatos con creatividad e iniciativa, con aplicaciones de modelado y multimedia.', idcapacidadtransversal: 11 },
  { iddesempeniotransversal: 17, descripcion: 'Resuelve situaciones problemáticas mediante la programación de código con procedimientos y secuencias lógicas estructuradas planteando soluciones creativas.', idcapacidadtransversal: 11 },
  { iddesempeniotransversal: 18, descripcion: 'Determina metas de aprendizaje viables asociadas a sus potencialidades, conocimientos, estilos de aprendizaje, habilidades, limitaciones personales y actitudes para el logro de la tarea, formulándose preguntas de manera reflexiva.', idcapacidadtransversal: 12 },
  { iddesempeniotransversal: 19, descripcion: 'Organiza un conjunto de estrategias y acciones en función del tiempo y de los recursos de que dispone, para lo cual establece un orden y una prioridad para alcanzar las metas de aprendizaje.', idcapacidadtransversal: 13 },
  { iddesempeniotransversal: 20, descripcion: 'Revisa los avances de las acciones propuestas, la elección de las estrategias y considera la opinión de sus pares para llegar a los resultados esperados.', idcapacidadtransversal: 13 },
  { iddesempeniotransversal: 21, descripcion: 'Explica los resultados obtenidos de acuerdo con sus posibilidades y en función de su pertinencia para el logro de las metas de aprendizaje.', idcapacidadtransversal: 14 },
  { iddesempeniotransversal: 22, descripcion: 'Construye su perfil personal cuando accede a aplicaciones o plataformas de distintos propósitos, y se integra a comunidades colaborativas virtuales.', idcapacidadtransversal: 15 },
  { iddesempeniotransversal: 23, descripcion: 'Establece búsquedas utilizando filtros en diferentes entornos virtuales que respondan a necesidades de información.', idcapacidadtransversal: 15 },
  { iddesempeniotransversal: 24, descripcion: 'Clasifica y organiza la información obtenida de acuerdo con criterios establecidos y cita las fuentes en forma apropiada con eficiencia y efectividad.', idcapacidadtransversal: 16 },
  { iddesempeniotransversal: 25, descripcion: 'Aplica funciones de cálculo cuando resuelve problemas matemáticos utilizando hojas de cálculo y base de datos.', idcapacidadtransversal: 16 },
  { iddesempeniotransversal: 26, descripcion: 'Establece diálogos significativos y acordes con su edad en el desarrollo de un proyecto o identificación de un problema o una actividad planteada con sus pares en entornos virtuales compartidos.', idcapacidadtransversal: 17 },
  { iddesempeniotransversal: 27, descripcion: 'Diseña objetos virtuales cuando representa ideas u otros elementos mediante el modelado de diseño. Ejemplo: Diseña el logotipo de su proyecto de emprendimiento estudiantil.', idcapacidadtransversal: 18 },
  { iddesempeniotransversal: 28, descripcion: 'Desarrolla secuencias lógicas o juegos digitales que simulen procesos u objetos que lleven a realizar tareas del mundo real con criterio y creatividad. Ejemplo: Elabora un programa que simule el movimiento de una polea.', idcapacidadtransversal: 18 },
  { iddesempeniotransversal: 29, descripcion: 'Determina metas de aprendizaje viables sobre la base de sus potencialidades, conocimientos, estilos de aprendizaje, habilidades y actitudes para el logro de la tarea simple o compleja, formulándose preguntas de manera reflexiva y de forma constante.', idcapacidadtransversal: 19 },
  { iddesempeniotransversal: 30, descripcion: 'Organiza un conjunto de acciones en función del tiempo y de los recursos de que dispone para lograr las metas de aprendizaje, para lo cual establece un orden y una prioridad en las acciones de manera secuenciada y articulada.', idcapacidadtransversal: 20 },
  { iddesempeniotransversal: 31, descripcion: 'Revisa de manera permanente las estrategias, los avances de las acciones propuestas, su experiencia previa y la priorización de sus actividades para llegar a los resultados esperados. Evalúa los resultados y los aportes que le brindan sus pares para el logro de las metas de aprendizaje.', idcapacidadtransversal: 21 },
  { iddesempeniotransversal: 32, descripcion: 'Accede a plataformas virtuales para desarrollar aprendizajes de diversas áreas curriculares seleccionando opciones, herramientas y aplicaciones, y realizando configuraciones de manera autónoma y responsable.', idcapacidadtransversal: 22 },
  { iddesempeniotransversal: 33, descripcion: 'Emplea diversas fuentes con criterios de credibilidad, pertinencia y eficacia utilizando herramientas digitales de autor cuando realiza investigación sobre un tema específico.', idcapacidadtransversal: 23 },
  { iddesempeniotransversal: 34, descripcion: 'Aplica diversas funciones de cálculo combinadas para solucionar situaciones diversas cuando sistematiza información en una base de datos y la representa gráficamente.', idcapacidadtransversal: 23 },
  { iddesempeniotransversal: 35, descripcion: 'Comparte y evalúa sus proyectos escolares demostrando habilidades relacionadas con las áreas curriculares cuando plantea soluciones y propuestas creativas en las comunidades virtuales en las que participa.', idcapacidadtransversal: 24 },
  { iddesempeniotransversal: 36, descripcion: 'Documenta proyectos escolares cuando combina animaciones, videos y material interactivo en distintos formatos con creatividad e iniciativa.', idcapacidadtransversal: 25 },
  { iddesempeniotransversal: 37, descripcion: 'Publica proyectos escolares utilizando información diversa según pautas de organización y citación combinando materiales digitales de diferentes formatos.', idcapacidadtransversal: 25 },
  { iddesempeniotransversal: 38, descripcion: 'Programa secuencias lógicas estableciendo condiciones de decisión que presenten soluciones acordes con el problema planteado con eficacia.', idcapacidadtransversal: 25 },
  { iddesempeniotransversal: 39, descripcion: 'Determina metas de aprendizaje viables sobre la base de sus experiencias asociadas, necesidades, prioridades de aprendizaje, habilidades y actitudes para el logro de la tarea simple o compleja, formulándose preguntas de manera reflexiva y de forma constante.', idcapacidadtransversal: 26 },
  { iddesempeniotransversal: 40, descripcion: 'Organiza un conjunto de acciones en función del tiempo y de los recursos de que dispone, para lo cual establece un orden y una prioridad que le permitan alcanzar la meta en el tiempo determinado con un considerable grado de calidad en las acciones de manera secuenciada y articulada.', idcapacidadtransversal: 27 },
  { iddesempeniotransversal: 41, descripcion: 'Revisa de manera permanente la aplicación de estrategias, los avances de las acciones propuestas, su experiencia previa, y la secuencia y la priorización de actividades que hacen posible el logro de la meta de aprendizaje.', idcapacidadtransversal: 28 },
  { iddesempeniotransversal: 42, descripcion: 'Evalúa los resultados y los aportes que le brindan los demás para decidir si realizará o no cambios en las estrategias para el éxito de la meta de aprendizaje.', idcapacidadtransversal: 28 },
  { iddesempeniotransversal: 43, descripcion: 'Optimiza el desarrollo de proyectos cuando configura diversos entornos virtuales de software y hardware de acuerdo con determinadas necesidades cuando reconoce su identidad digital, con responsabilidad y eficiencia.', idcapacidadtransversal: 29 },
  { iddesempeniotransversal: 44, descripcion: 'Administra bases de datos aplicando filtros, criterios de consultas y organización de información para mostrar reportes e informes que demuestren análisis y capacidad de síntesis.', idcapacidadtransversal: 30 },
  { iddesempeniotransversal: 45, descripcion: 'Administra comunidades virtuales asumiendo distintos roles, estableciendo vínculos acordes con sus necesidades e intereses, y valorando el trabajo colaborativo.', idcapacidadtransversal: 31 },
  { iddesempeniotransversal: 46, descripcion: 'Desarrolla proyectos productivos y de emprendimiento aplicando de manera idónea herramientas TIC que mejoren los resultados.', idcapacidadtransversal: 32 },
  { iddesempeniotransversal: 47, descripcion: 'Elabora objetos virtuales con aplicaciones de modelado en 3D cuando desarrolla proyectos de innovación y emprendimiento. Ejemplo: Modela en 3D el prototipo de su producto.', idcapacidadtransversal: 32 },
  { iddesempeniotransversal: 48, descripcion: 'Construye prototipos robóticos que permitan solucionar problemas de su entorno.', idcapacidadtransversal: 32 },
  { iddesempeniotransversal: 49, descripcion: 'Publica y comparte, en diversos medios virtuales, proyectos o investigaciones, y genera actividades de colaboración y diálogo en distintas comunidades y redes virtuales.', idcapacidadtransversal: 32 },
  { iddesempeniotransversal: 50, descripcion: 'Determina metas de aprendizaje viables sobre la base de sus potencialidades, conocimientos, estilos de aprendizaje, habilidades, limitaciones personales y actitudes para el logro de la tarea simple o compleja con destreza, formulándose preguntas de manera reflexiva y de forma constante.', idcapacidadtransversal: 33 },
  { iddesempeniotransversal: 51, descripcion: 'Organiza un conjunto de acciones en función del tiempo y de los recursos de que dispone, para lo cual establece una elevada precisión en el orden y prioridad, y considera las exigencias que enfrenta en las acciones de manera secuenciada y articulada.', idcapacidadtransversal: 34 },
  { iddesempeniotransversal: 52, descripcion: 'Evalúa de manera permanente los avances de las acciones propuestas en relación con su eficacia y la eficiencia de las estrategias usadas para alcanzar la meta de aprendizaje, en función de los resultados, el tiempo y el uso de los recursos.', idcapacidadtransversal: 35 },
  { iddesempeniotransversal: 53, descripcion: 'Evalúa con precisión y rapidez los resultados y si los aportes que le brindan los demás le ayudarán a decidir si realizará o no cambios en las estrategias para el éxito de la meta de aprendizaje.', idcapacidadtransversal: 35 },
]

async function main() {
  console.log('🌱 Iniciando migración de datos para desempeniotransversal...')

  for (const data of datosDesempeniotransversal) {
    try {
      await prisma.desempeniotransversal.upsert({
        where: { iddesempeniotransversal: data.iddesempeniotransversal },
        update: {
          descripcion: data.descripcion,
          idcapacidadtransversal: data.idcapacidadtransversal
        },
        create: data
      })
      console.log(`✅ Insertado/actualizado: ${data.iddesempeniotransversal} - ${data.descripcion.substring(0, 50)}...`)
    } catch (error) {
      console.error(`❌ Error al insertar id ${data.iddesempeniotransversal}:`, error)
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

