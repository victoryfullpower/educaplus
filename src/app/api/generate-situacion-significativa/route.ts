import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { generateSituacionSignificativa } from '@/lib/generate-situacion-significativa'

export async function POST(request: NextRequest) {
  const tiempoInicio = Date.now()
  console.log('⏱️  [INICIO] Iniciando generación de situación significativa...')
  
  try {
    const { unidadData, formData, aiProvider = 'gemini', openaiModel = 'gpt-5.1' } = await request.json()
    console.log(`⏱️  [0.0s] Datos recibidos del cliente`)

    if (!unidadData) {
      return NextResponse.json(
        { error: 'Los datos de la unidad son requeridos' },
        { status: 400 }
      )
    }

    // Validar que al menos una API key esté configurada
    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Debes configurar al menos una API key: GEMINI_API_KEY o OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    // Usar la función helper que lee desde la BD
    const tiempoLecturaInicio = Date.now()
    console.log('⏱️  [LECTURA] Leyendo prompt desde base de datos...')
    
    const tiempoReemplazoInicio = Date.now()
    console.log('⏱️  [REEMPLAZO] Construyendo prompt con variables...')
    
    // Generar la situación significativa usando la función helper
    const { situacionSignificativa, titulo, respuestaCompleta } = await generateSituacionSignificativa(
      unidadData,
      formData,
      aiProvider,
      openaiModel
    )
    
    const tiempoLectura = ((Date.now() - tiempoLecturaInicio) / 1000).toFixed(2)
    const tiempoReemplazo = ((Date.now() - tiempoReemplazoInicio) / 1000).toFixed(2)
    console.log(`⏱️  [${tiempoLectura}s] Prompt leído desde BD y procesado`)
    console.log(`📊 Longitud de la respuesta: ${situacionSignificativa.length} caracteres`)
    
    // El título y la situación significativa ya están procesados por la función helper
    const tituloExtraido = titulo || unidadData?.tituloUnidad || 'Situación Significativa'
    
    // Usar la plantilla Word y reemplazar los placeholders
    const tiempoWordInicio = Date.now()
    console.log('⏱️  [WORD] Cargando plantilla Word...')
    
    // Ruta a la plantilla Word
    const templatePath = path.join(
      process.cwd(),
      'templates',
      '1-PLANIFICACIÓN CURRICULAR ANUAL.docx'
    )

    // Verificar que la plantilla existe
    if (!fs.existsSync(templatePath)) {
      throw new Error('Plantilla Word no encontrada: 1-PLANIFICACIÓN CURRICULAR ANUAL.docx')
    }

    // Leer la plantilla
    const templateContent = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(templateContent)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      },
      nullGetter: function(part) {
        // Si una variable no existe, devolver string vacío
        return ''
      }
    })

    // La situacionSignificativa ya viene limpia (sin saltos de línea) de la función helper
    const respuestaIACleanFinal = situacionSignificativa
    
    console.log(`🧹 [LIMPIEZA] Contenido listo. Longitud: ${respuestaIACleanFinal.length} caracteres`)

    // Preparar los datos para reemplazar en la plantilla
    const templateData = {
      problemapotencialidad0: unidadData?.problemaPotencialidad || '',
      situacionsignificativa0: respuestaIACleanFinal, // Usar la respuesta sin el título y sin saltos de línea
      titulosituacionsignificativa0: tituloExtraido
    }
    
    const tiempoExtraccionTitulo = ((Date.now() - tiempoReemplazoInicio) / 1000).toFixed(2)
    console.log(`⏱️  [${tiempoExtraccionTitulo}s] Procesamiento completado`)

    console.log('⏱️  [WORD] Reemplazando placeholders en la plantilla...')
    console.log('📝 Datos a reemplazar:', {
      problemapotencialidad0: templateData.problemapotencialidad0.substring(0, 50) + '...',
      situacionsignificativa0: templateData.situacionsignificativa0.substring(0, 50) + '...',
      titulosituacionsignificativa0: templateData.titulosituacionsignificativa0
    })

    // Reemplazar las variables en la plantilla
    doc.setData(templateData)

    try {
      doc.render()
    } catch (error: any) {
      console.error('❌ [WORD] Error al renderizar la plantilla:', error)
      
      // Extraer información útil del error
      let errorMessage = 'Error al procesar la plantilla Word'
      let errorDetails = ''
      
      if (error.properties && error.properties.errors) {
        const errors = error.properties.errors
        const errorDescriptions = errors.map((err: any) => {
          if (err.explanation) {
            return `- ${err.explanation} (${err.xtag || 'variable desconocida'})`
          }
          return `- ${err.message || 'Error desconocido'}`
        })
        errorDetails = '\n\nProblemas encontrados:\n' + errorDescriptions.join('\n')
      } else if (error.message) {
        errorDetails = '\n\n' + error.message
      }
      
      throw new Error(`Error al procesar la plantilla Word: ${errorMessage}${errorDetails}`)
    }

    // Generar el buffer del documento
    const docBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    
    const tiempoWord = ((Date.now() - tiempoWordInicio) / 1000).toFixed(2)
    console.log(`⏱️  [WORD] Documento generado en ${tiempoWord}s (Tamaño: ${(docBuffer.length / 1024).toFixed(2)} KB)`)

    // Generar nombre del archivo
    const fileName = `SITUACION_SIGNIFICATIVA_${formData?.area || 'documento'}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')

    const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
    console.log(`✅ [FIN] Proceso completado en ${tiempoTotal}s totales`)
    console.log(`📊 [RESUMEN] Lectura JSON: ${tiempoLectura}s | Reemplazo: ${tiempoReemplazo}s | IA: ${tiempoIATotal}s | Word: ${tiempoWord}s | Total: ${tiempoTotal}s`)

    // Devolver el archivo como respuesta
    // docBuffer es un Buffer de Node.js, NextResponse lo acepta directamente
    return new NextResponse(Buffer.from(docBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    const tiempoError = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
    console.error(`❌ [ERROR] Falló después de ${tiempoError}s:`, error)
    console.error('Error al generar la situación significativa:', error)
    
    let errorMessage = 'Error al generar el documento'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      if (error.stack && process.env.NODE_ENV === 'development') {
        errorDetails = error.stack
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}

