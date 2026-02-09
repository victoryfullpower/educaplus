/**
 * Script para insertar los prompts iniciales en la base de datos
 * Ejecutar con: npx tsx scripts/seed-prompts.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Funciones para convertir JSON a texto (copiadas sin dependencias de Prisma)
function convertSituacionSignificativaJSONToText(): string {
  const templateObj = {
    header: "Actúa como un experto pedagogo del Ministerio de Educación de Perú con más de 30 años de experiencia. Tus estudios de especialización se centran en el Currículo Nacional de la Educación Básica Regular. Tu labor fundamental es desarrollar la REDACCIÓN DE UNA SITUACIÓN SIGNIFICATIVA. Para ello te voy a facilitar lo siguiente:",
    campos: {
      area: "Área: {{area}}",
      grado: "Grado: {{grado}}",
      institucion: "Institución educativa: {{institucion}}",
      problemaPotencialidad: "Problema o potencialidad: {{problemaPotencialidad}}.",
      entorno: "Entorno: Departamento ({{departamento}}), provincia ({{provincia}}) y distrito ({{distrito}}).",
      producto: "Producto: {{producto}}."
    },
    condicionCentral: {
      titulo: "Condición central:",
      descripcion: "Para la redacción de la situación significativa debes considerar el siguiente modelo:",
      ejemplo: {
        titulo: "TÍTULO DE LA SITUACIÓN\n\n\"Promovemos la salud como un bien de todos\"",
        seccion1: "1. LUGAR/CONTEXTO\n\nActualmente, en el Perú,",
        seccion2: "2. PROBLEMA/POTENCIALIDAD\n\n\nalrededor del 40,1 % de los niños menores de 3 años sufren de anemia. Otra cifra a tener en cuenta es la de adolescentes gestantes que también padecen esta enfermedad. Asimismo, la Organización Panamericana de la Salud expresa que la anemia tiene consecuencias graves para la salud física y mental de la persona, así como para su desarrollo.",
        seccion3: "3. RETOS O DESAFÍOS\n\n\n¿Te has preguntado por qué en nuestro país existe un alto índice de anemia? ¿Sabes cómo se produce?\n\nPara obtener respuestas, es necesario explorar el problema de la anemia y reconocer si en nuestra familia o comunidad se presenta ese riesgo de salud, para luego –desde nuestro rol de estudiantes– ayudar a prevenirla.",
        seccion4: "4. PRODUCTO\n\n\nAnte esta situación, ¿qué acciones podríamos promover para prevenir la anemia en nuestra familia o comunidad?"
      }
    },
    otrasCondiciones: [
      "La presentación de la situación significativa debe ser en prosa sin los recuadros",
      "Tu lenguaje debes ser claro, coherente y evitar ambigüedades.",
      "Por favor, no inventar ni imaginar sobre algún asunto del tema.",
      "Tu redacción escrita debe estar delineada a las normas de la Real Academia de la Lengua Española.",
      "La redacción de la situación significativa debe de ser preciso, sin rodeos ni ampliación de ideas",
      "La presentación final del texto no debe tener subtítulos ni recuadro alguno."
    ],
    footer: "Muy agradecido por el excelente trabajo."
  }

  const partesPrompt: string[] = []
  
  if (templateObj.header) {
    partesPrompt.push(templateObj.header)
    partesPrompt.push('')
  }
  
  if (templateObj.campos) {
    Object.values(templateObj.campos).forEach((campo: any) => {
      partesPrompt.push(campo)
    })
    partesPrompt.push('')
  }
  
  if (templateObj.condicionCentral) {
    if (templateObj.condicionCentral.titulo) {
      partesPrompt.push(templateObj.condicionCentral.titulo)
    }
    if (templateObj.condicionCentral.descripcion) {
      partesPrompt.push(templateObj.condicionCentral.descripcion)
      partesPrompt.push('')
    }
    if (templateObj.condicionCentral.ejemplo) {
      const ejemplo = templateObj.condicionCentral.ejemplo
      if (ejemplo.titulo) partesPrompt.push(ejemplo.titulo)
      if (ejemplo.seccion1) partesPrompt.push(ejemplo.seccion1)
      if (ejemplo.seccion2) partesPrompt.push(ejemplo.seccion2)
      if (ejemplo.seccion3) partesPrompt.push(ejemplo.seccion3)
      if (ejemplo.seccion4) partesPrompt.push(ejemplo.seccion4)
    }
  }
  
  partesPrompt.push('')
  
  if (templateObj.otrasCondiciones && Array.isArray(templateObj.otrasCondiciones)) {
    partesPrompt.push('Otras condiciones:')
    templateObj.otrasCondiciones.forEach((condicion: string) => {
      partesPrompt.push(condicion)
    })
    partesPrompt.push('')
  }
  
  if (templateObj.footer) {
    partesPrompt.push(templateObj.footer)
  }
  
  return partesPrompt.join('\n')
}

function convertCampoTematicoJSONToText(): string {
  const templateObj = {
    header: "PROMPT- Extraer el campo temático",
    introduccion: "Actúa como un experto pedagogo del Ministerio de Educación de Perú con más de 30 años de experiencia. Tus estudios de especialización se centran en el Currículo Nacional de la Educación Básica Regular. Tu labor fundamental es EXTRAER LOS TEMAS O CAMPOS TEMÁTICOS de cualquier desempeño.",
    condicionCentral: {
      titulo: "Condición central:",
      descripcion: "Solicitar uno o una lista de DESEMPEÑOS.",
      estructura: "Para la extracción del campo temático del desempeño es necesario guiarte de la siguiente estructura: Habilidad + campo temático + contexto (condición).",
      ejemplo: {
        titulo: "DESEMPEÑO:",
        desempenio: "{{desempenios}}",
        modelo: {
          titulo: "Para la extracción del campo temático debes considerar el siguiente MODELO aplicado al desempeño anterior:",
          habilidad: "HABILIDAD: \"Identifica\"",
          campoTematico: "CAMPO TEMÁTICO: \"información explícita, relevante y complementaria\"",
          contexto: "CONTEXTO (CONDICIÓN): \"seleccionando datos específicos y algunos detalles en diversos tipos de texto de estructura compleja y con información contrapuesta y vocabulario variado\". Si el desempeño no tiene contexto, no influye en el análisis, ni la extracción del campo semántico."
        },
        resultado: "Luego de este análisis el producto o resultado que debes presentar solo el campo temático."
      }
    },
    otrasCondiciones: [
      "Tu lenguaje debes ser claro, coherente y evitar ambigüedades.",
      "Por favor, no inventar ni imaginar sobre algún asunto del tema.",
      "Tu redacción escrita debe estar delineada a las normas de la Real Academia de la Lengua Española."
    ],
    footer: "Muy agradecido por el excelente trabajo."
  }

  const partesPrompt: string[] = []
  
  if (templateObj.header) {
    partesPrompt.push(templateObj.header)
    partesPrompt.push('')
  }
  
  if (templateObj.introduccion) {
    partesPrompt.push(templateObj.introduccion)
    partesPrompt.push('')
  }
  
  if (templateObj.condicionCentral) {
    if (templateObj.condicionCentral.titulo) {
      partesPrompt.push(templateObj.condicionCentral.titulo)
    }
    if (templateObj.condicionCentral.descripcion) {
      partesPrompt.push(templateObj.condicionCentral.descripcion)
      partesPrompt.push('')
    }
    if (templateObj.condicionCentral.estructura) {
      partesPrompt.push(templateObj.condicionCentral.estructura)
      partesPrompt.push('')
    }
    
    if (templateObj.condicionCentral.ejemplo) {
      const ejemplo = templateObj.condicionCentral.ejemplo
      if (ejemplo.titulo) partesPrompt.push(ejemplo.titulo)
      if (ejemplo.desempenio) {
        partesPrompt.push(ejemplo.desempenio)
      }
      partesPrompt.push('')
      if (ejemplo.modelo) {
        if (ejemplo.modelo.titulo) partesPrompt.push(ejemplo.modelo.titulo)
        if (ejemplo.modelo.habilidad) partesPrompt.push(ejemplo.modelo.habilidad)
        if (ejemplo.modelo.campoTematico) partesPrompt.push(ejemplo.modelo.campoTematico)
        if (ejemplo.modelo.contexto) partesPrompt.push(ejemplo.modelo.contexto)
        partesPrompt.push('')
      }
      if (ejemplo.resultado) partesPrompt.push(ejemplo.resultado)
      partesPrompt.push('')
    }
  }
  
  if (templateObj.otrasCondiciones && Array.isArray(templateObj.otrasCondiciones)) {
    partesPrompt.push('Otras condiciones:')
    templateObj.otrasCondiciones.forEach((condicion: string) => {
      partesPrompt.push(condicion)
    })
    partesPrompt.push('')
  }
  
  if (templateObj.footer) {
    partesPrompt.push(templateObj.footer)
  }
  
  return partesPrompt.join('\n')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function seedPrompts() {
  try {
    console.log('🌱 Iniciando inserción de prompts...')

    // Convertir los JSONs a texto
    const situacionSignificativaText = convertSituacionSignificativaJSONToText()
    const campoTematicoText = convertCampoTematicoJSONToText()

    // Verificar si ya existen los prompts
    const existingSitSig = await prisma.prompt.findFirst({
      where: {
        descripcion: {
          contains: 'Situación significativa',
          mode: 'insensitive'
        }
      }
    })

    const existingCampoTem = await prisma.prompt.findFirst({
      where: {
        descripcion: {
          contains: 'campo temático',
          mode: 'insensitive'
        }
      }
    })

    // Insertar o actualizar Situación Significativa
    if (existingSitSig) {
      console.log('📝 Actualizando prompt de Situación Significativa...')
      await prisma.prompt.update({
        where: { idprompt: existingSitSig.idprompt },
        data: {
          contenido: situacionSignificativaText,
          estado: 'activo'
        }
      })
      console.log('✅ Prompt de Situación Significativa actualizado')
    } else {
      console.log('➕ Creando prompt de Situación Significativa...')
      await prisma.prompt.create({
        data: {
          descripcion: 'Situación significativa',
          contenido: situacionSignificativaText,
          estado: 'activo'
        }
      })
      console.log('✅ Prompt de Situación Significativa creado')
    }

    // Insertar o actualizar Campo Temático
    if (existingCampoTem) {
      console.log('📝 Actualizando prompt de Campo Temático...')
      await prisma.prompt.update({
        where: { idprompt: existingCampoTem.idprompt },
        data: {
          contenido: campoTematicoText,
          estado: 'activo'
        }
      })
      console.log('✅ Prompt de Campo Temático actualizado')
    } else {
      console.log('➕ Creando prompt de Campo Temático...')
      await prisma.prompt.create({
        data: {
          descripcion: 'Campo temático',
          contenido: campoTematicoText,
          estado: 'activo'
        }
      })
      console.log('✅ Prompt de Campo Temático creado')
    }

    console.log('🎉 ¡Prompts insertados exitosamente!')
  } catch (error) {
    console.error('❌ Error al insertar prompts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

seedPrompts()
  .then(() => {
    console.log('✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })

