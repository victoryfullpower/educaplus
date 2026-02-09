import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const requestBody = await request.json()
    const { formData } = requestBody

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    // Leer la plantilla Word de enfoques
    const templatePath = path.join(process.cwd(), 'templates', 'PROMPT- Enfoques transversales_ok.docx')
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Archivo de plantilla Word no encontrado' },
        { status: 404 }
      )
    }

    // Obtener título de la unidad del plan anual
    let tituloUnidad = ''
    const unidad = formData.unidad
    const areaId = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
    const gradoId = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
    const anio = formData.anio || new Date().getFullYear()

    if (unidad && areaId && gradoId) {
      try {
        const planAnual = await prisma.planAnual.findFirst({
          where: {
            idusuario: userId,
            anio: parseInt(String(anio)),
            areaId: String(areaId),
            gradoId: String(gradoId)
          }
        })

        if (planAnual && planAnual.unidades) {
          const unidades = Array.isArray(planAnual.unidades) 
            ? planAnual.unidades 
            : JSON.parse(planAnual.unidades as string)

          const unidadNumero = parseInt(String(unidad), 10)
          let unidadData = null

          if (Array.isArray(unidades) && unidades[unidadNumero]) {
            unidadData = unidades[unidadNumero]
          } else if (Array.isArray(unidades)) {
            unidadData = unidades.find((u: any) => 
              u.numeroUnidad === unidadNumero || 
              u.unidad === unidadNumero ||
              u.numero === unidadNumero
            )
          }

          if (unidadData && unidadData.tituloUnidad) {
            tituloUnidad = unidadData.tituloUnidad
          }
        }
      } catch (error) {
        // Error silencioso
      }
    }

    // Obtener TODOS los enfoques transversales de la BD (sin filtrar por grado)
    let enfoquesTexto = ''
    try {
      const todosLosEnfoques = await prisma.enfoqueTransversal.findMany({
        orderBy: { idenfoque: 'asc' }
      })

      // Formatear los enfoques como lista
      const enfoquesLista = todosLosEnfoques.map((enfoque, index) => {
        return `${index + 1}. ${enfoque.descripcion}`
      })

      enfoquesTexto = enfoquesLista.join('\n')
    } catch (error) {
      enfoquesTexto = 'No se pudieron obtener los enfoques transversales'
    }

    // Leer el template Word y extraer el texto
    const wordBuffer = fs.readFileSync(templatePath)
    const result = await mammoth.extractRawText({ buffer: wordBuffer })
    let promptText = result.value || ''

    // Reemplazar variables en el prompt
    promptText = promptText.replace(/\{\{area\}\}/g, formData.area || '')
    promptText = promptText.replace(/\{\{grado\}\}/g, formData.grado || '')
    promptText = promptText.replace(/\{\{titulounidad\}\}/g, tituloUnidad || (formData.unidad && formData.area ? `Unidad ${formData.unidad}: ${formData.area}` : ''))
    promptText = promptText.replace(/\{\{situacion\}\}/g, formData.situacionSignificativa || '')
    promptText = promptText.replace(/\{\{enfoques\}\}/g, enfoquesTexto)

    // Enviar el prompt a GPT-mini
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos

    let openaiResponse: Response | undefined
    const maxRetries = 3
    let lastError: any = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: promptText
              }
            ],
            max_tokens: 4000,
            temperature: 0.7,
          }),
          signal: controller.signal,
        })
        
        if (openaiResponse.ok) {
          clearTimeout(timeoutId)
          break
        }
        
        if (attempt === maxRetries) {
          throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (fetchError: any) {
        lastError = fetchError
        
        if (attempt === maxRetries) {
          clearTimeout(timeoutId)
          
          if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
            return NextResponse.json(
              { 
                error: 'Timeout al conectarse con la API de OpenAI. Por favor intenta nuevamente.',
                details: process.env.NODE_ENV === 'development' ? fetchError.message : undefined
              },
              { status: 504 }
            )
          }
          
          return NextResponse.json(
            { 
              error: 'Error al comunicarse con la API de OpenAI. Por favor intenta nuevamente.',
              details: process.env.NODE_ENV === 'development' ? fetchError.message : undefined
            },
            { status: 500 }
          )
        }
        
        if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.name === 'AbortError') {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        throw fetchError
      }
    }

    if (!openaiResponse || !openaiResponse.ok) {
      if (!openaiResponse) {
        return NextResponse.json(
          { error: 'No se pudo obtener respuesta de OpenAI después de múltiples intentos' },
          { status: 500 }
        )
      }
      const errorData = await openaiResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: `Error al comunicarse con GPT: ${errorData.error?.message || openaiResponse.statusText}` },
        { status: openaiResponse.status }
      )
    }

    const gptData = await openaiResponse.json()
    const gptResponse = gptData.choices?.[0]?.message?.content || ''

    if (!gptResponse) {
      return NextResponse.json(
        { error: 'GPT no generó ninguna respuesta' },
        { status: 500 }
      )
    }

    // Limpiar <br> tags del texto
    let textoLimpio = gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')

    // Dividir el texto en párrafos
    const parrafos = textoLimpio.split('\n').filter((p: string) => p.trim() || p === '')

    // Crear el documento Word con la respuesta de GPT
    const doc = new Document({
      sections: [{
        properties: {},
        children: parrafos.map((parrafo: string) => 
          new Paragraph({
            children: [
              new TextRun({
                text: parrafo || ' ',
                size: 20, // Tamaño 10pt (20 en unidades de Word)
                color: '000000'
              })
            ],
            spacing: { after: 200, before: 100 },
            alignment: AlignmentType.LEFT
          })
        )
      }]
    })

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc)

    // Configurar headers para descarga
    const fileName = `enfoques-generados-${formData.unidad || '0'}-${Date.now()}.docx`
    
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Error al generar enfoques con IA:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar los enfoques con IA', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}

