import 'dotenv/config'

/**
 * Convierte el texto de competenciaProceso a un array JSON.
 * - "{A, B, C}" o "A, B, C" -> ["A", "B", "C"]
 * - "Una sola competencia" -> ["Una sola competencia"]
 */
function competenciaToJson(text: string): string[] {
  const t = (text || '').trim()
  if (!t) return []
  let inner = t
  if (inner.startsWith('{') && inner.endsWith('}')) {
    inner = inner.slice(1, -1).trim()
  }
  const parts = inner.split(/,\s+/).map((s) => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [t]
}

const datos: Array<{ idproceso: number; descripcion: string; competenciaProceso: string; idarea: number }> = [
  { idproceso: 1, descripcion: 'Antes del discurso', competenciaProceso: 'Se comunica oralmente en su lengua materna', idarea: 1 },
  { idproceso: 2, descripcion: 'Durante el discurso', competenciaProceso: 'Se comunica oralmente en su lengua materna', idarea: 1 },
  { idproceso: 3, descripcion: 'Después el discurso', competenciaProceso: 'Se comunica oralmente en su lengua materna', idarea: 1 },
  { idproceso: 4, descripcion: 'Antes de la lectura,', competenciaProceso: 'Lee diversos tipos de textos escritos en lengua materna', idarea: 1 },
  { idproceso: 5, descripcion: 'Durante la lectura', competenciaProceso: 'Lee diversos tipos de textos escritos en lengua materna', idarea: 1 },
  { idproceso: 6, descripcion: 'Después de la lectura', competenciaProceso: 'Lee diversos tipos de textos escritos en lengua materna', idarea: 1 },
  { idproceso: 7, descripcion: 'Planificación', competenciaProceso: 'Escribe diversos tipos de textos en lengua materna', idarea: 1 },
  { idproceso: 8, descripcion: 'Textualización', competenciaProceso: 'Escribe diversos tipos de textos en lengua materna', idarea: 1 },
  { idproceso: 9, descripcion: 'Revisión', competenciaProceso: 'Escribe diversos tipos de textos en lengua materna', idarea: 1 },
  { idproceso: 10, descripcion: 'Problematización', competenciaProceso: 'Construye interpretaciones históricas, Gestiona responsablemente el espacio y el ambiente, Gestiona responsablemente los recursos económicos', idarea: 2 },
  { idproceso: 11, descripcion: 'Análisis de la información', competenciaProceso: 'Construye interpretaciones históricas, Gestiona responsablemente el espacio y el ambiente, Gestiona responsablemente los recursos económicos', idarea: 2 },
  { idproceso: 12, descripcion: 'Toma de decisiones', competenciaProceso: 'Construye interpretaciones históricas, Gestiona responsablemente el espacio y el ambiente, Gestiona responsablemente los recursos económicos', idarea: 2 },
  { idproceso: 13, descripcion: 'Problematización', competenciaProceso: 'Construye su identidad, convive y participa democráticamente en la búsqueda del bien común', idarea: 3 },
  { idproceso: 14, descripcion: 'Análisis de la información', competenciaProceso: 'Construye su identidad, convive y participa democráticamente en la búsqueda del bien común', idarea: 3 },
  { idproceso: 15, descripcion: 'Toma de decisiones', competenciaProceso: 'Construye su identidad, convive y participa democráticamente en la búsqueda del bien común', idarea: 3 },
  { idproceso: 16, descripcion: 'Planteamiento del problema', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 17, descripcion: 'Planteamiento de hipótesis', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 18, descripcion: 'Elaboración del plan de indagación', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 19, descripcion: 'Análisis de resultados y comparación con la hipótesis', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 20, descripcion: 'Estructuración del saber construido como respuesta al problema', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 21, descripcion: 'Evaluación y comunicación', competenciaProceso: 'Indaga mediante métodos científicos para construir conocimientos, Explica el mundo físico basándose en conocimientos sobre los seres vivos materia y energía biodiversidad tierra y universo, Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', idarea: 4 },
  { idproceso: 22, descripcion: 'Comprensión del problema', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 23, descripcion: 'Búsqueda de Estrategias', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 24, descripcion: 'La representación', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 25, descripcion: 'La formalización', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 26, descripcion: 'Reflexión', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 27, descripcion: 'Transferencia', competenciaProceso: 'Resuelve problemas de cantidad, Resuelve problemas de regularidad equivalencia y cambios, Resuelve problemas de forma movimiento y localización, Resuelve problemas de gestión de datos e incertidumbre', idarea: 5 },
  { idproceso: 28, descripcion: 'Reacción inmediata', competenciaProceso: 'Aprecia de manera crítica manifestaciones artístico-culturales', idarea: 6 },
  { idproceso: 29, descripcion: 'Descripción de lo que observa o experimenta:', competenciaProceso: 'Aprecia de manera crítica manifestaciones artístico-culturales', idarea: 6 },
  { idproceso: 30, descripcion: 'Análisis e interpretación:', competenciaProceso: 'Aprecia de manera crítica manifestaciones artístico-culturales', idarea: 6 },
  { idproceso: 31, descripcion: 'Consideración del contexto cultural:', competenciaProceso: 'Aprecia de manera crítica manifestaciones artístico-culturales', idarea: 6 },
  { idproceso: 32, descripcion: 'Expresión de un punto de vista informado:', competenciaProceso: 'Aprecia de manera crítica manifestaciones artístico-culturales', idarea: 6 },
  { idproceso: 33, descripcion: 'Desafiar e Inspirar:', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 34, descripcion: 'Imaginar y Generar Ideas para su Propia Creación:', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 35, descripcion: 'Planificar su Trabajo', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 36, descripcion: 'Explorar y Experimentar con Materiales', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 37, descripcion: 'Producir Trabajos Preliminares', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 38, descripcion: 'Revisar y Afinar los Detalles de mi Trabajo', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 39, descripcion: 'Presentar y Compartir', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 40, descripcion: 'Reflexionar y Evaluar', competenciaProceso: 'Crea proyectos desde los lenguajes artísticos', idarea: 6 },
  { idproceso: 41, descripcion: 'Antes del discurso', competenciaProceso: 'Se comunica oralmente en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 42, descripcion: 'Durante el discurso', competenciaProceso: 'Se comunica oralmente en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 43, descripcion: 'Después el discurso', competenciaProceso: 'Se comunica oralmente en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 44, descripcion: 'Antes de la lectura,', competenciaProceso: 'Lee diversos tipos de textos en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 45, descripcion: 'Durante la lectura', competenciaProceso: 'Lee diversos tipos de textos en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 46, descripcion: 'Después de la lectura', competenciaProceso: 'Lee diversos tipos de textos en inglés como lengua extranjera', idarea: 7 },
  { idproceso: 47, descripcion: 'Planificación', competenciaProceso: 'Escribe en inglés diversos tipos de textos de forma reflexiva', idarea: 7 },
  { idproceso: 48, descripcion: 'Textualización', competenciaProceso: 'Escribe en inglés diversos tipos de textos de forma reflexiva', idarea: 7 },
  { idproceso: 49, descripcion: 'Revisión', competenciaProceso: 'Escribe en inglés diversos tipos de textos de forma reflexiva', idarea: 7 },
  { idproceso: 50, descripcion: 'Actividad Fisiológica', competenciaProceso: 'Se desenvuelve de manera autónoma a través de su motricidad, Interactúa a través de sus habilidades sociomotrices, Asume una vida saludable', idarea: 8 },
  { idproceso: 51, descripcion: 'Actividad Básica', competenciaProceso: 'Se desenvuelve de manera autónoma a través de su motricidad, Interactúa a través de sus habilidades sociomotrices, Asume una vida saludable', idarea: 8 },
  { idproceso: 52, descripcion: 'Actividad Avanzada', competenciaProceso: 'Se desenvuelve de manera autónoma a través de su motricidad, Interactúa a través de sus habilidades sociomotrices, Asume una vida saludable', idarea: 8 },
  { idproceso: 53, descripcion: 'Actividad de Aplicación', competenciaProceso: 'Se desenvuelve de manera autónoma a través de su motricidad, Interactúa a través de sus habilidades sociomotrices, Asume una vida saludable', idarea: 8 },
  { idproceso: 54, descripcion: 'Actividad de Recuperación', competenciaProceso: 'Se desenvuelve de manera autónoma a través de su motricidad, Interactúa a través de sus habilidades sociomotrices, Asume una vida saludable', idarea: 8 },
  { idproceso: 55, descripcion: 'ver', competenciaProceso: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa, Construye su identidad como persona amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', idarea: 9 },
  { idproceso: 56, descripcion: 'Juzgar', competenciaProceso: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa, Construye su identidad como persona amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', idarea: 9 },
  { idproceso: 57, descripcion: 'Actuar', competenciaProceso: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa, Construye su identidad como persona amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', idarea: 9 },
  { idproceso: 58, descripcion: 'Revisar', competenciaProceso: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa, Construye su identidad como persona amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', idarea: 9 },
  { idproceso: 59, descripcion: 'Celebrar', competenciaProceso: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa, Construye su identidad como persona amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', idarea: 9 },
  { idproceso: 60, descripcion: 'Crea propuesta de valor:', competenciaProceso: 'Gestiona proyectos de emprendimiento económico o social.', idarea: 10 },
  { idproceso: 61, descripcion: 'Aplica habilidades técnicas:', competenciaProceso: 'Gestiona proyectos de emprendimiento económico o social.', idarea: 10 },
  { idproceso: 62, descripcion: 'Trabaja cooperativamente:', competenciaProceso: 'Gestiona proyectos de emprendimiento económico o social.', idarea: 10 },
  { idproceso: 63, descripcion: 'Evalúa los resultados del proyecto de emprendimiento:', competenciaProceso: 'Gestiona proyectos de emprendimiento económico o social.', idarea: 10 },
  { idproceso: 64, descripcion: 'Antes del discurso', competenciaProceso: 'Se comunica oralmente', idarea: 11 },
  { idproceso: 65, descripcion: 'Durante el discurso', competenciaProceso: 'Se comunica oralmente', idarea: 11 },
  { idproceso: 66, descripcion: 'Después el discurso', competenciaProceso: 'Se comunica oralmente', idarea: 11 },
  { idproceso: 67, descripcion: 'Antes de la lectura,', competenciaProceso: 'Lee diversos tipos de textos', idarea: 11 },
  { idproceso: 68, descripcion: 'Durante la lectura', competenciaProceso: 'Lee diversos tipos de textos', idarea: 11 },
  { idproceso: 69, descripcion: 'Después de la lectura', competenciaProceso: 'Lee diversos tipos de textos', idarea: 11 },
  { idproceso: 70, descripcion: 'Planificación', competenciaProceso: 'Escribe diversos tipos de textos', idarea: 11 },
  { idproceso: 71, descripcion: 'Textualización', competenciaProceso: 'Escribe diversos tipos de textos', idarea: 11 },
  { idproceso: 72, descripcion: 'Revisión', competenciaProceso: 'Escribe diversos tipos de textos', idarea: 11 },
  { idproceso: 73, descripcion: 'Vivenciación', competenciaProceso: 'Dimensión personal, Dimensión social, Dimensión de los aprendizajes', idarea: 12 },
  { idproceso: 74, descripcion: 'Reflexión', competenciaProceso: 'Dimensión personal, Dimensión social, Dimensión de los aprendizajes', idarea: 12 },
  { idproceso: 75, descripcion: 'Acompañamiento Cognitivo/Socioafectivo', competenciaProceso: 'Dimensión personal, Dimensión social, Dimensión de los aprendizajes', idarea: 12 },
  { idproceso: 76, descripcion: 'Cierre', competenciaProceso: 'Dimensión personal, Dimensión social, Dimensión de los aprendizajes', idarea: 12 },
]

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client.js')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está definida')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  for (const row of datos) {
    const json = competenciaToJson(row.competenciaProceso)
    await prisma.procesoDidactico.upsert({
      where: { idproceso: row.idproceso },
      create: {
        idproceso: row.idproceso,
        descripcion: row.descripcion,
        competenciaProceso: json,
        idarea: row.idarea,
      },
      update: {
        descripcion: row.descripcion,
        competenciaProceso: json,
        idarea: row.idarea,
      },
    })
  }
  console.log('Seed procesodidactico: 76 filas insertadas/actualizadas.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
