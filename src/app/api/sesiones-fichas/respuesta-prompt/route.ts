import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'

export const dynamic = 'force-dynamic'

const TIEMPOS_POR_DURACION: Record<string, { inicio: number; desarrollo: number; cierre: number }> = {
  '45':  { inicio: 10,  desarrollo: 25, cierre: 10  },
  '90':  { inicio: 15,  desarrollo: 60, cierre: 15  },
  '135': { inicio: 20,  desarrollo: 95, cierre: 20  },
}

const TEMPLATE_NAME = 'PROMT DE SESION DE PROBADO..docx'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { formData, sesionData, includePreviewImage } = body || {}
    const withImage = !!includePreviewImage

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    const duracion = String(formData.duracion || '').trim()
    const tiempos = TIEMPOS_POR_DURACION[duracion] || TIEMPOS_POR_DURACION['45']
    const numsesion = sesionData?.numeroSesion ?? formData.numsesion ?? '1'
    const titulosesion = sesionData?.titulo ?? formData.tituloSesion ?? ''

    const competenciasArr = Array.isArray(sesionData?.competenciasSeleccionadas) ? sesionData.competenciasSeleccionadas : []
    const competencia = competenciasArr.length > 0 ? competenciasArr[0] : ''
    const limpiarBr = (s: string) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
    const capacidadesArr = Array.isArray(sesionData?.capacidadesSeleccionadas) ? sesionData.capacidadesSeleccionadas : []
    const capacidades = capacidadesArr
      .filter((c: string) => c && String(c).trim())
      .map((c: string) => `- ${limpiarBr(c)}`)
      .join('\n')
    const desempeniosArr = Array.isArray(sesionData?.desempeniosSeleccionados) ? sesionData.desempeniosSeleccionados : []
    const desempenios = desempeniosArr
      .filter((d: string) => d && String(d).trim())
      .map((d: string, i: number) => `${i + 1}. ${limpiarBr(d)}`)
      .join('\n')

    let procesosdidacticos = ''
    const areaIdNum = formData.areaId ? parseInt(String(formData.areaId), 10) : 0
    if (areaIdNum > 0) {
      try {
        const procesos = await prisma.procesoDidactico.findMany({
          where: { idarea: areaIdNum },
          orderBy: { idproceso: 'asc' }
        })
        const byCompetencia = new Map<string, string[]>()
        for (const p of procesos) {
          const comps = Array.isArray(p.competenciaProceso)
            ? (p.competenciaProceso as string[])
            : typeof p.competenciaProceso === 'string'
              ? [p.competenciaProceso]
              : []
          const desc = (p.descripcion || '').trim()
          for (const c of comps) {
            const comp = (typeof c === 'string' ? c : String(c)).trim()
            if (!comp) continue
            if (!byCompetencia.has(comp)) byCompetencia.set(comp, [])
            const list = byCompetencia.get(comp)!
            if (!list.includes(desc)) list.push(desc)
          }
        }
        const lineas: string[] = []
        for (const [comp, descripciones] of byCompetencia) {
          lineas.push(`• ${comp}`)
          for (const d of descripciones) {
            lineas.push(`  ◦ ${d}`)
          }
        }
        procesosdidacticos = lineas.join('\n')
      } catch (e) {
        console.error('Error al cargar procesos didácticos:', e)
      }
    }

    let enfoquestransversales = ''
    const areaIdU = formData.areaId || ''
    const gradoIdU = formData.gradoId || ''
    const unidadU = formData.unidad || ''
    if (areaIdU && gradoIdU && unidadU) {
      try {
        const anio = new Date().getFullYear()
        const unidad = await prisma.unidadAprendizaje.findFirst({
          where: {
            idusuario: userId,
            anio,
            areaId: String(areaIdU),
            gradoId: String(gradoIdU),
            unidad: String(unidadU)
          },
          select: { enfoquesTransversales: true }
        })
        const raw = unidad?.enfoquesTransversales
        if (raw && Array.isArray(raw) && raw.length > 0) {
          const items = raw as Array<{ enfoque?: string }>
          const unicos = new Set<string>()
          for (const item of items) {
            const e = (item.enfoque || '').trim()
            if (e) unicos.add(e)
          }
          enfoquestransversales = Array.from(unicos).join('\n')
        }
      } catch (e) {
        console.error('Error al cargar enfoques transversales:', e)
      }
    }

    // Mismo objeto de datos que "Prompt dinámico" para rellenar la misma plantilla
    const data = {
      area: formData.area ?? '',
      grado: formData.grado ?? '',
      ciclo: formData.ciclo ?? '',
      entidadpublica: formData.entidadpublica ?? formData.tipoIE ?? 'Pública',
      numsesion,
      titulosesion,
      duracion: duracion ? `${duracion} minutos` : '',
      inicio: `${tiempos.inicio} minutos`,
      desarrollo: `${tiempos.desarrollo} minutos`,
      cierre: `${tiempos.cierre} minutos`,
      competencia,
      capacidades,
      desempenios,
      enfoquestransversales,
      procesosdidacticos,
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}` },
        { status: 404 }
      )
    }

    // Renderizar la misma plantilla que usa "Prompt dinámico" y extraer el texto
    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const templateDoc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    })
    templateDoc.render(data)
    const docxBuffer = templateDoc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const extractResult = await mammoth.extractRawText({ buffer: docxBuffer as Buffer })
    const promptText = (extractResult.value || '').trim()
    if (!promptText) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del prompt generado' },
        { status: 500 }
      )
    }

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const systemContent = `Eres un experto en diseño de sesiones de aprendizaje. Responde ÚNICAMENTE con una tabla de texto: filas y columnas separadas, SIN mezclar ni combinar celdas.

REGLAS ESTRICTAS DE FORMATO:
1. Una línea = una fila. Nunca pongas varias filas en una sola línea ni mezcles el contenido de columnas.
2. Cada fila tiene exactamente 4 celdas separadas por el carácter | (barra vertical).
3. La primera línea debe ser SIEMPRE la cabecera:
MOMENTOS | PROCESOS PEDAGÓGICOS | ACTIVIDADES DE APRENDIZAJE | TIEMPO

4. A partir de la segunda línea, cada fila de datos con 4 celdas separadas por |. Ejemplo correcto (cada línea es una fila):
INICIO | Motivación | 1. El docente proyecta un video... | 4 min
INICIO | Motivación | 2. Lectura breve situacional... | 2 min
INICIO | Saberes previos | 1. ¿Qué sabes sobre las causas...? | 5 min
INICIO | Saberes previos | 2. ¿Qué medidas conoces...? | 3 min
DESARROLLO | Problematización / Conflicto cognitivo | Planteamiento retador: ¿Cómo diseñarás...? | 10 min
DESARROLLO | Propósito y organización | Propósito: Identificar causas... Organización: Trabajo en parejas. | 5 min
CIERRE | Metacognición | 1. Pregunta de cierre... | 5 min

5. NO combines: cada actividad o ítem en su propia fila. Cada celda con un solo valor (momento, proceso, actividad, tiempo).
6. En PROCESOS PEDAGÓGICOS usa exactamente: Motivación, Saberes previos, Problematización / Conflicto cognitivo, Propósito y organización, Análisis, Metacognición, etc., según corresponda.
7. En MOMENTOS: solo INICIO, DESARROLLO o CIERRE. Si varias filas son del mismo momento y proceso, repite el momento y proceso en cada fila (no dejes celdas vacías para continuar).
8. No escribas nada antes ni después de la tabla. Sin títulos extra ni explicaciones.`

    // Solo se acepta gpt-5-mini para respuesta prompt
    const MODELO_OBLIGATORIO = 'gpt-5-mini'
    const requestConfig: Record<string, unknown> = {
      model: MODELO_OBLIGATORIO,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: promptText }
      ],
      top_p: 1,
      max_completion_tokens: 16384
    }

    let completion = await openaiClient.chat.completions.create(requestConfig as any)
    let gptResponse = (completion.choices?.[0]?.message?.content || '').trim()

    if (!gptResponse) {
      console.warn('[respuesta-prompt] Primera llamada sin contenido. finish_reason:', completion.choices?.[0]?.finish_reason, 'Reintentando una vez...')
      completion = await openaiClient.chat.completions.create(requestConfig as any)
      gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
    }

    if (!gptResponse) {
      const choice = completion.choices?.[0]
      console.error('[respuesta-prompt] gpt-5-mini devolvió contenido vacío después del reintento.', {
        finish_reason: choice?.finish_reason,
        usage: (completion as any).usage,
        has_message: !!choice?.message,
        message_keys: choice?.message ? Object.keys(choice.message) : []
      })
      return NextResponse.json(
        { error: 'La IA no generó ninguna respuesta. Puede ser límite de uso, filtro de contenido o el modelo no respondió. Prueba de nuevo en un momento.' },
        { status: 500 }
      )
    }

    const textoLimpio = gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
    const lineas = textoLimpio.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
    if (lineas.length === 0) lineas.push('(Sin contenido)')

    const fontSize = 16
    const sepPipe = lineas.some((l: string) => l.includes('|'))
    const sepTab = !sepPipe && lineas.some((l: string) => l.includes('\t'))
    const separator = sepPipe ? '|' : sepTab ? '\t' : null

    const celdasPorFila: string[][] = separator
      ? lineas.map((l: string) => l.split(separator).map((c: string) => c.trim()))
      : lineas.map((l: string) => [l])

    const numCols = Math.max(1, ...celdasPorFila.map((f: string[]) => f.length))
    celdasPorFila.forEach((f: string[]) => {
      while (f.length < numCols) f.push('')
    })

    const anchoCol = Math.floor(100 / numCols)
    const filasTabla: TableRow[] = celdasPorFila.map((fila: string[], idx: number) =>
      new TableRow({
        children: fila.map((celda: string) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: celda || ' ',
                    size: fontSize,
                    color: '000000'
                  })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 60, before: 40 }
              })
            ],
            width: { size: anchoCol, type: WidthType.PERCENTAGE }
          })
        )
      })
    )

    const tablaRespuesta = new Table({
      rows: filasTabla,
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array(numCols).fill(Math.floor(9600 / numCols)),
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '333333' }
      }
    })

    const gptOutputDocument = new Document({
      sections: [{
        properties: {},
        children: [tablaRespuesta]
      }]
    })

    const buffer = await Packer.toBuffer(gptOutputDocument)
    const ts = Date.now()
    const baseName = `Respuesta_Prompt_Sesion_${(formData.area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`

    if (withImage) {
      const cellW = 200
      const cellH = 24
      const fontSize = 10
      const numRows = celdasPorFila.length
      const tableWidth = numCols * cellW
      const tableHeight = numRows * cellH
      const pad = 24
      const escapeXml = (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${tableWidth + pad * 2}" height="${tableHeight + pad * 2}" viewBox="0 0 ${tableWidth + pad * 2} ${tableHeight + pad * 2}">
  <style>text { font-family: Arial, sans-serif; font-size: ${fontSize}px; fill: #000; }</style>
  <g transform="translate(${pad},${pad})">
    <rect x="0" y="0" width="${tableWidth}" height="${tableHeight}" fill="#fff" stroke="#333" stroke-width="1"/>
`
      for (let c = 1; c < numCols; c++) {
        const x = c * cellW
        svg += `    <line x1="${x}" y1="0" x2="${x}" y2="${tableHeight}" stroke="#333" stroke-width="1"/>\n`
      }
      for (let r = 1; r < numRows; r++) {
        const y = r * cellH
        svg += `    <line x1="0" y1="${y}" x2="${tableWidth}" y2="${y}" stroke="#333" stroke-width="1"/>\n`
      }
      celdasPorFila.forEach((fila: string[], row: number) => {
        fila.forEach((celda: string, col: number) => {
          const x = col * cellW + 6
          const y = row * cellH + fontSize + 5
          const text = escapeXml(celda || ' ').slice(0, 120)
          svg += `    <text x="${x}" y="${y}">${text}</text>\n`
        })
      })
      svg += `  </g>\n</svg>`
      const docxBase64 = Buffer.from(buffer as Buffer).toString('base64')
      const imageBase64 = Buffer.from(svg, 'utf-8').toString('base64')
      const fileNameImage = `${baseName}_vista_previa.svg`
      return NextResponse.json({
        docxBase64,
        imageBase64,
        fileNameDocx,
        fileNameImage,
        mimeImage: 'image/svg+xml',
        tableText: gptResponse,
      })
    }

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`,
      },
    })
  } catch (error) {
    console.error('Error en respuesta-prompt:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar la respuesta del prompt', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
