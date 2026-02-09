import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { formData } = requestBody

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    // Validar que el grado esté presente
    const gradoId = formData.gradoId
    if (!gradoId || parseInt(gradoId) < 1 || parseInt(gradoId) > 5) {
      return NextResponse.json(
        { error: 'Grado inválido. Debe ser entre 1 y 5' },
        { status: 400 }
      )
    }

    console.log('🤖 Generando texto por prompt...')

    // Leer directamente el Word del prompt (igual que generate-prompt-word)
    const promptWordPath = path.join(process.cwd(), 'templates', 'PROMT_UNIDAD DE APRENDIZAJE.docx')
    if (!fs.existsSync(promptWordPath)) {
      return NextResponse.json(
        { error: 'Archivo de prompt Word no encontrado' },
        { status: 404 }
      )
    }

    console.log('📄 Leyendo archivo Word directamente...')
    const wordBuffer = fs.readFileSync(promptWordPath)
    const result = await mammoth.extractRawText({ buffer: wordBuffer })
    let promptText = result.value || ''

    // Obtener competencias con capacidades y desempeños para generar las tablas en texto plano
    let competenciasConDatos: Array<{
      competenciaNumero: string;
      competenciaDescripcion: string;
      capacidades: Array<{
        capacidadDescripcion: string;
        desempenios: string[];
      }>;
    }> = []

    const competenciasParaPrompt: Array<{ descripcion: string; numCapacidades: number }> = []
    
    try {
      const areaIdParaPrompt = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
      const gradoIdParaPrompt = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
      
      if (areaIdParaPrompt && gradoIdParaPrompt) {
        console.log(`🔍 Obteniendo competencias con capacidades y desempeños (Área: ${areaIdParaPrompt}, Grado: ${gradoIdParaPrompt})...`)
        
        const competenciasPrompt = await prisma.competencia.findMany({
          where: {
            idarea: parseInt(String(areaIdParaPrompt)),
            idgrado: parseInt(String(gradoIdParaPrompt)),
            transversal: false // Solo competencias no transversales
          },
          include: {
            capacidades: {
              include: {
                desempenios: {
                  orderBy: {
                    id: 'asc'
                  }
                }
              },
              orderBy: {
                id: 'asc'
              }
            }
          },
          orderBy: {
            numeroCompetencia: 'asc'
          }
        })

        console.log(`📋 Encontradas ${competenciasPrompt.length} competencias para el prompt`)
        
        competenciasPrompt.forEach(comp => {
          // Para el prompt simple (solo lista)
          competenciasParaPrompt.push({
            descripcion: comp.descripcion,
            numCapacidades: comp.capacidades.length
          })

          // Para las tablas (datos completos)
          const capacidadesData = comp.capacidades.map(cap => ({
            capacidadDescripcion: cap.descripcion,
            desempenios: cap.desempenios.map(des => des.descripcion)
          }))

          competenciasConDatos.push({
            competenciaNumero: `COMPETENCIA ${comp.numeroCompetencia || comp.id}`,
            competenciaDescripcion: comp.descripcion,
            capacidades: capacidadesData
          })
          
          console.log(`   - ${comp.descripcion}: ${comp.capacidades.length} capacidades, ${comp.capacidades.reduce((sum, cap) => sum + cap.desempenios.length, 0)} desempeños`)
        })
      }
    } catch (error) {
      console.error('Error al obtener competencias para el prompt:', error)
    }

    // Preparar datos para el prompt
    const promptData = {
      area: formData.area || '',
      grado: formData.grado || '',
      ciclo: formData.ciclo || '',
      tipoie: formData.tipoIE === '1' ? 'Pública' : formData.tipoIE === '2' ? 'Privado' : '',
      situacionsignficativa: formData.situacionSignificativa || '',
      numsesiones: formData.sesiones?.length?.toString() || '0',
      producto: formData.producto || '',
      competencias: competenciasParaPrompt.length > 0 ? competenciasParaPrompt : []
    }

    // Reemplazar variables manualmente
    promptText = promptText.replace(/\{\{area\}\}/g, promptData.area)
    promptText = promptText.replace(/\{\{grado\}\}/g, promptData.grado)
    promptText = promptText.replace(/\{\{ciclo\}\}/g, promptData.ciclo)
    promptText = promptText.replace(/\{\{tipoie\}\}/g, promptData.tipoie)
    promptText = promptText.replace(/\{\{situacionsignficativa\}\}/g, promptData.situacionsignficativa)
    promptText = promptText.replace(/\{\{numsesiones\}\}/g, promptData.numsesiones)
    promptText = promptText.replace(/\{\{producto\}\}/g, promptData.producto)

    // Reemplazar loop de competencias
    if (promptData.competencias.length > 0) {
      const competenciasLista = promptData.competencias.map(c => `• ${c.descripcion}: ${c.numCapacidades} capacidades`).join('\n')
      promptText = promptText.replace(/\{\{#competencias\}\}[\s\S]*?\{\{\/competencias\}\}/g, competenciasLista)
    } else {
      promptText = promptText.replace(/\{\{#competencias\}\}[\s\S]*?\{\{\/competencias\}\}/g, '• No se encontraron competencias')
    }

    // Detectar si hay placeholder {{matriz}} para reemplazar con tablas en texto plano
    const tieneMatriz = promptText.includes('{{matriz}}')
    console.log(`🔍 Placeholder {{matriz}} encontrado: ${tieneMatriz}`)

    if (tieneMatriz) {
      // Generar matriz en formato de texto plano para GPT
      let matrizTexto = ''
      
      if (competenciasConDatos.length === 0) {
        matrizTexto = 'No se encontraron competencias para mostrar en la matriz.'
      } else {
        competenciasConDatos.forEach((competencia, compIdx) => {
          if (compIdx > 0) {
            matrizTexto += '\n\n'
          }
          
          matrizTexto += `${competencia.competenciaNumero}: ${competencia.competenciaDescripcion}\n`
          matrizTexto += 'COMPETENCIA | CAPACIDADES | DESEMPEÑOS PRECISADOS\n'
          matrizTexto += '--- | --- | ---\n'
          
          competencia.capacidades.forEach((capacidad, capIdx) => {
            const desempeniosTexto = capacidad.desempenios
              .map((des, idx) => `${idx + 1}. ${des}`)
              .join('; ')
            
            const competenciaTexto = capIdx === 0 ? competencia.competenciaDescripcion : ''
            matrizTexto += `${competenciaTexto} | ${capacidad.capacidadDescripcion} | ${desempeniosTexto}\n`
          })
        })
      }
      
      // Reemplazar {{matriz}} con el texto de la matriz
      promptText = promptText.replace('{{matriz}}', matrizTexto)
      console.log(`✅ Matriz generada en formato texto plano (${matrizTexto.length} caracteres)`)
    }

    // Imprimir el prompt completo en la terminal
    console.log('📝 ========== PROMPT COMPLETO PARA GPT ==========')
    console.log(promptText)
    console.log('📝 ========== FIN DEL PROMPT ==========')
    console.log(`📊 Longitud del prompt: ${promptText.length} caracteres`)

    // Enviar a GPT
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no configurada' },
        { status: 500 }
      )
    }

    console.log('🚀 Enviando prompt a GPT...')
    const startTime = Date.now()
    
    // Crear un AbortController para manejar timeouts más largos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos de timeout (2 minutos)

    let openaiResponse: Response | undefined
    const maxRetries = 3
    let lastError: any = null
    
    // Intentar con reintentos
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt} de ${maxRetries} para conectarse a OpenAI...`)
        
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
        
        // Si la respuesta es exitosa, salir del loop
        if (openaiResponse.ok) {
          clearTimeout(timeoutId)
          const elapsedTime = Date.now() - startTime
          console.log(`✅ Respuesta de GPT recibida en ${elapsedTime}ms (intento ${attempt})`)
          break
        }
        
        // Si no es exitosa pero no es un error de timeout, lanzar el error
        if (attempt === maxRetries) {
          throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
        }
        
        // Esperar antes de reintentar (backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ Esperando ${delay}ms antes de reintentar...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (fetchError: any) {
        lastError = fetchError
        
        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          clearTimeout(timeoutId)
          console.error(`❌ Error al realizar fetch a OpenAI después de ${maxRetries} intentos:`, fetchError)
          
          if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
            return NextResponse.json(
              { 
                error: 'Timeout al conectarse con la API de OpenAI después de varios intentos. Por favor verifica tu conexión a internet e intenta nuevamente.',
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
        
        // Si no es el último intento y es un error de conexión, esperar y reintentar
        if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.name === 'AbortError') {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.log(`⏳ Error de conexión. Esperando ${delay}ms antes de reintentar...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Para otros errores, no reintentar
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
      console.error('❌ Error al obtener respuesta de GPT:', errorData)
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

    console.log('✅ Respuesta de GPT recibida:', gptResponse.length, 'caracteres')
    console.log('📄 Primeros 500 caracteres de la respuesta:', gptResponse.substring(0, 500))
    console.log('📄 Últimos 500 caracteres de la respuesta:', gptResponse.substring(Math.max(0, gptResponse.length - 500)))
    console.log('📊 Respuesta completa de GPT (para depuración):')
    console.log(gptResponse)

    // Función para parsear tablas desde el texto (formato con pipes |)
    const parsearTabla = (lineas: string[]): { esTabla: boolean; filas?: string[][]; numColumnas?: number } => {
      if (lineas.length === 0) return { esTabla: false }
      
      // Detectar si las líneas tienen pipes (formato de tabla)
      const lineasConPipes = lineas.filter(l => l.trim().includes('|') && l.trim().split('|').length > 2)
      
      if (lineasConPipes.length === 0) return { esTabla: false }
      
      // Parsear las filas de la tabla
      const filas: string[][] = []
      let numColumnas = 0
      
      for (const linea of lineasConPipes) {
        // Dividir por pipes y limpiar espacios
        // IMPORTANTE: NO eliminar columnas vacías, solo hacer trim para preservar TODAS las columnas
        const columnas = linea
          .split('|')
          .map(col => col.trim())
          // Remover solo las columnas completamente vacías del inicio y fin (si existen)
        
        // Ignorar líneas separadoras (como |---|---|)
        if (columnas.length > 0 && !columnas.every(col => /^[-:]+$/.test(col))) {
          filas.push(columnas)
          numColumnas = Math.max(numColumnas, columnas.length)
          console.log(`📋 Fila de tabla agregada: ${columnas.length} columnas - ${columnas.slice(0, 2).join(' | ')}...`)
        }
      }
      
      console.log(`📊 Tabla parseada: ${filas.length} filas, ${numColumnas} columnas máximo`)
      
      if (filas.length === 0) return { esTabla: false }
      
      // Normalizar el número de columnas en todas las filas
      filas.forEach(fila => {
        while (fila.length < numColumnas) {
          fila.push('')
        }
      })
      
      return { esTabla: true, filas, numColumnas }
    }

    // Función para crear una tabla de Word con formato profesional
    const crearTablaWord = (filas: string[][], numColumnas: number): Table => {
      const anchoColumna = Math.floor(14869 / numColumnas) // Ancho total de página / número de columnas
      
      const filasTabla = filas.map((fila, indiceFila) => {
        const esEncabezado = indiceFila === 0
        
        return new TableRow({
          children: fila.map((celda, indiceCol) => {
            // Limpiar <br> del texto de la celda, pero preservar TODO el contenido
            let celdaLimpia = (celda || ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
            
            // Si la celda tiene múltiples líneas (por <br> convertidos), crear múltiples párrafos
            const lineasCelda = celdaLimpia.split('\n').filter(l => l.trim() || l === '')
            
            return new TableCell({
              width: { size: anchoColumna, type: WidthType.DXA },
              children: lineasCelda.length > 1 
                ? lineasCelda.map((linea, idx) => 
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: linea || ' ',
                          bold: esEncabezado,
                          size: esEncabezado ? 22 : 20,
                          color: esEncabezado ? 'FFFFFF' : '000000',
                        })
                      ],
                      alignment: AlignmentType.LEFT,
                      spacing: { after: idx < lineasCelda.length - 1 ? 50 : 100, before: idx === 0 ? 100 : 50 },
                    })
                  )
                : [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: celdaLimpia || ' ',
                          bold: esEncabezado,
                          size: esEncabezado ? 22 : 20,
                          color: esEncabezado ? 'FFFFFF' : '000000',
                        })
                      ],
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 100, before: 100 },
                    })
                  ],
              shading: esEncabezado ? {
                type: ShadingType.SOLID,
                color: '0066CC', // Color azul para encabezado
                fill: '0066CC',
              } : undefined,
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
            })
          }),
          height: { value: 400, rule: 'atLeast' },
        })
      })
      
      return new Table({
        rows: filasTabla,
        width: { size: 14869, type: WidthType.DXA },
        columnWidths: new Array(numColumnas).fill(anchoColumna),
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100,
        },
      })
    }

    // Procesar la respuesta de GPT: convertir tablas a formato Word y mantener texto como párrafos
    // IMPORTANTE: Preservar TODO el contenido tal cual llega de GPT
    const lineas = gptResponse.split('\n')
    console.log(`📝 Total de líneas en la respuesta de GPT: ${lineas.length}`)
    const elementos: (Paragraph | Table)[] = []
    let bloqueActual: string[] = []
    
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i]
      const lineaTrim = linea.trim()
      
      // Si la línea está vacía
      if (lineaTrim === '') {
        // Si hay un bloque acumulado, procesarlo
        if (bloqueActual.length > 0) {
          const tablaInfo = parsearTabla(bloqueActual)
          
          if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
            // Crear tabla de Word
            const tabla = crearTablaWord(tablaInfo.filas, tablaInfo.numColumnas)
            elementos.push(tabla)
          } else {
            // Crear párrafos normales
            bloqueActual.forEach(texto => {
              if (texto.trim()) {
                elementos.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: texto.trim(),
                        size: 22,
                      })
                    ],
                    spacing: { after: 160 },
                  })
                )
              }
            })
          }
          bloqueActual = []
        }
        
        // Agregar espacio entre bloques
        elementos.push(
          new Paragraph({
            children: [],
            spacing: { after: 100 },
          })
        )
      } 
      // Si la línea tiene contenido
      else {
        // Detectar si podría ser parte de una tabla (tiene pipes)
        const tienePipes = linea.includes('|')
        
        // Si tiene pipes, agregar al bloque actual
        // Si no tiene pipes pero el bloque actual es tabla, procesar el bloque primero
        if (tienePipes) {
          bloqueActual.push(linea)
        } else {
          // Si hay un bloque con tablas, procesarlo primero
          if (bloqueActual.length > 0) {
            const tablaInfo = parsearTabla(bloqueActual)
            
            if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
              const tabla = crearTablaWord(tablaInfo.filas, tablaInfo.numColumnas)
              elementos.push(tabla)
            } else {
              bloqueActual.forEach(texto => {
                if (texto.trim()) {
                  elementos.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: texto.trim(),
                          size: 22,
                        })
                      ],
                      spacing: { after: 160 },
                    })
                  )
                }
              })
            }
            bloqueActual = []
          }
          
          // Agregar como párrafo normal
          elementos.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: lineaTrim,
                  size: 22,
                })
              ],
              spacing: { after: 160 },
            })
          )
        }
      }
    }
    
    // Procesar el último bloque si queda
    if (bloqueActual.length > 0) {
      const tablaInfo = parsearTabla(bloqueActual)
      
      if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
        const tabla = crearTablaWord(tablaInfo.filas, tablaInfo.numColumnas)
        elementos.push(tabla)
      } else {
        bloqueActual.forEach(texto => {
          if (texto.trim()) {
            elementos.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: texto.trim(),
                    size: 22,
                  })
                ],
                spacing: { after: 160 },
              })
            )
          }
        })
      }
    }

    // Si no hay elementos, crear uno con el texto completo
    if (elementos.length === 0) {
      elementos.push(
        new Paragraph({
          children: [
            new TextRun({
              text: gptResponse,
              size: 22,
            })
          ]
        })
      )
    }
    
    const numTablas = elementos.filter(e => e instanceof Table).length
    const numParrafos = elementos.filter(e => e instanceof Paragraph).length
    console.log(`📝 Se crearon ${numParrafos} párrafos y ${numTablas} tablas para el documento Word`)

    // Crear el documento Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: elementos,
        },
      ],
    })

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc)

    // Generar nombre del archivo
    const areaNombre = (formData.area || 'COMUNICACION').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const gradoNombre = (formData.grado || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const unidadNombre = formData.unidad || '0'
    const fileName = `texto-generado-${unidadNombre}-${areaNombre}-${gradoNombre}-${Date.now()}.docx`

    console.log('✅ Documento Word generado:', fileName, 'Tamaño:', buffer.length, 'bytes')

    // Devolver el documento Word
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('❌ Error al generar texto por prompt:', error)
    return NextResponse.json(
      { 
        error: 'Error al generar el texto por prompt', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}

