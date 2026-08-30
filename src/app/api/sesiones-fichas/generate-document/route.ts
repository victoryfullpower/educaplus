import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  marcarTrialConsumido,
  MSG_TRIAL_AGOTADO,
  puedeGenerarConTrial,
  tieneSuscripcionActivaPara,
  consumirCreditoRegeneracion,
  validarRegeneracionIA
} from '@/lib/acceso-usuario'
import { assertPuedeCrearSesion } from '@/lib/limites-plan-anual'
import {
  MSG_TRIAL_SOLO_SESION_1,
  sesionPermitidaEnTrial
} from '@/lib/acceso-trial'
import {
  CODE_PDF_TRIAL_NO_DISPONIBLE,
  MSG_PDF_TRIAL_NO_DISPONIBLE,
  prepararEntregaDocumento
} from '@/lib/entrega-documento-trial'
import { parsearFilasTabla } from '@/lib/respuesta-prompt-word'

const PROMPT_SESION_TEMPLATE = 'PROMT DE SESION DE PROBADO..docx'
const MODELO_GPT = 'gpt-4o-mini'

function nombreSesionParaDocumento(s: string): string {
  return String(s ?? '').trim().toLocaleUpperCase('es-PE')
}

type EnfoqueTransversalUnidad = {
  enfoque: string
  valor: string
  actitud: string
}

async function cargarEnfoquesTransversalesDeUnidad(
  userId: number,
  areaId: string,
  gradoId: string,
  unidad: string
): Promise<EnfoqueTransversalUnidad[]> {
  const anio = new Date().getFullYear()
  const unidadRow = await prisma.unidadAprendizaje.findFirst({
    where: {
      idusuario: userId,
      anio,
      areaId: String(areaId),
      gradoId: String(gradoId),
      unidad: String(unidad)
    },
    select: { enfoquesTransversales: true }
  })
  const raw = unidadRow?.enfoquesTransversales
  if (!raw || !Array.isArray(raw)) return []

  return (raw as Array<{ enfoque?: string; valor?: string; actitud?: string }>)
    .map((item) => ({
      enfoque: String(item.enfoque ?? '').trim(),
      valor: String(item.valor ?? '').trim(),
      actitud: String(item.actitud ?? '').trim()
    }))
    .filter((item) => item.enfoque && (item.valor || item.actitud))
}

function seleccionarEnfoqueAleatorio(
  items: EnfoqueTransversalUnidad[]
): EnfoqueTransversalUnidad[] {
  const porEnfoque = new Map<string, EnfoqueTransversalUnidad[]>()
  for (const item of items) {
    if (!porEnfoque.has(item.enfoque)) porEnfoque.set(item.enfoque, [])
    porEnfoque.get(item.enfoque)!.push(item)
  }
  const claves = Array.from(porEnfoque.keys())
  if (claves.length === 0) return []
  const elegida = claves[Math.floor(Math.random() * claves.length)]
  return porEnfoque.get(elegida) || []
}

function insertarTablaEnPlaceholder(
  doc: Docxtemplater,
  marcadores: string[],
  tablaXML: string
): void {
  if (!tablaXML.startsWith('<w:tbl>') || !tablaXML.endsWith('</w:tbl>')) return
  const zip = doc.getZip()
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) return

  let xmlContent = documentFile.asText()
  let idx = -1
  for (const marcador of marcadores) {
    idx = xmlContent.indexOf(marcador)
    if (idx !== -1) break
  }
  if (idx === -1) return

  let paraStart = -1
  for (let i = idx; i >= 0; i--) {
    if (xmlContent.substring(i, i + 4) === '<w:p') {
      const ch = xmlContent.charAt(i + 4)
      if (ch === ' ' || ch === '>') {
        paraStart = i
        break
      }
    }
  }
  const paraEnd = xmlContent.indexOf('</w:p>', idx)
  if (paraStart === -1 || paraEnd === -1 || paraEnd <= paraStart) return

  xmlContent =
    xmlContent.substring(0, paraStart) + tablaXML + xmlContent.substring(paraEnd + 6)
  zip.file('word/document.xml', xmlContent)
}

function generarTablaEnfoquesTransversalesSesion(
  items: EnfoqueTransversalUnidad[],
  escaparXML: (s: string) => string,
  tblW: string,
  col1W: string,
  col2W: string,
  col3W: string
): string {
  const colorVerde = '00B050'
  const bordesTbl =
    `<w:tblBorders>` +
    `<w:top w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `<w:left w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `<w:bottom w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `<w:right w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `<w:insideH w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `<w:insideV w:val="double" w:sz="4" w:space="0" w:color="${colorVerde}"/>` +
    `</w:tblBorders>`
  const bordesCelda = (leftSz = '4') =>
    `<w:tcBorders>` +
    `<w:top w:val="double" w:sz="4" w:color="${colorVerde}"/>` +
    `<w:left w:val="double" w:sz="${leftSz}" w:color="${colorVerde}"/>` +
    `<w:bottom w:val="double" w:sz="4" w:color="${colorVerde}"/>` +
    `<w:right w:val="double" w:sz="4" w:color="${colorVerde}"/>` +
    `</w:tcBorders>`
  const shdHeader = '<w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/>'
  const shdBlanco = '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>'

  const rPrCelda =
    '<w:rPr><w:rFonts w:ascii="Arial Nova Cond Light" w:hAnsi="Arial Nova Cond Light"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'
  const rPrHeader =
    '<w:rPr><w:rFonts w:ascii="Arial Nova Cond Light" w:hAnsi="Arial Nova Cond Light" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'
  const pPrCol1Col2 =
    '<w:pPr><w:tabs><w:tab w:val="left" w:pos="1560"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:jc w:val="center"/>' +
    rPrCelda +
    '</w:pPr>'
  const pPrCol3 =
    '<w:pPr><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/><w:adjustRightInd w:val="0"/><w:spacing w:line="276" w:lineRule="auto"/><w:jc w:val="both"/>' +
    rPrCelda +
    '</w:pPr>'

  const tblStart =
    `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${tblW}" w:type="dxa"/><w:jc w:val="center"/>${bordesTbl}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${col1W}"/><w:gridCol w:w="${col2W}"/><w:gridCol w:w="${col3W}"/></w:tblGrid>`

  const headerRow =
    `<w:tr><w:trPr><w:trHeight w:val="227"/></w:trPr>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col1W}" w:type="dxa"/>${shdHeader}${bordesCelda('8')}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/>${rPrHeader}</w:pPr><w:r>${rPrHeader}<w:t>ENFOQUES TRANSVERSALES</w:t></w:r></w:p></w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col2W}" w:type="dxa"/>${shdHeader}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/>${rPrHeader}</w:pPr><w:r>${rPrHeader}<w:t>VALOR</w:t></w:r></w:p></w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col3W}" w:type="dxa"/>${shdHeader}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/>${rPrHeader}</w:pPr><w:r>${rPrHeader}<w:t>ACTITUDES DEMOSTRABLES</w:t></w:r></w:p></w:tc>` +
    `</w:tr>`

  const filaEstatica =
    `<w:tr><w:trPr><w:trHeight w:val="448"/></w:trPr>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col1W}" w:type="dxa"/>${shdBlanco}${bordesCelda('8')}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol1Col2}<w:r>${rPrCelda}<w:t>Búsqueda de la excelencia</w:t></w:r></w:p></w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col2W}" w:type="dxa"/>${shdBlanco}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol1Col2}<w:r>${rPrCelda}<w:t>Superación personal</w:t></w:r></w:p></w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="${col3W}" w:type="dxa"/>${shdBlanco}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol3}<w:r>${rPrCelda}<w:t>Docentes y estudiantes utilizan sus cualidades y recursos al máximo posible para cumplir con éxito las metas que se proponen a nivel personal y colectivo.</w:t></w:r></w:p></w:tc>` +
    `</w:tr>`

  let filasBD = ''
  items.forEach((item, index) => {
    const enfoqueEscapado = escaparXML(item.enfoque)
    const valorEscapado = escaparXML(item.valor)
    const actitudEscapada = escaparXML(item.actitud)
    const esPrimeraFila = index === 0

    filasBD += '<w:tr><w:trPr><w:trHeight w:val="448"/></w:trPr>'
    if (esPrimeraFila) {
      filasBD += `<w:tc><w:tcPr><w:tcW w:w="${col1W}" w:type="dxa"/><w:vMerge w:val="restart"/>${shdBlanco}${bordesCelda('8')}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol1Col2}<w:r>${rPrCelda}<w:t>${enfoqueEscapado}</w:t></w:r></w:p></w:tc>`
    } else {
      filasBD += `<w:tc><w:tcPr><w:vMerge/>${bordesCelda('8')}</w:tcPr><w:p/></w:tc>`
    }
    filasBD += `<w:tc><w:tcPr><w:tcW w:w="${col2W}" w:type="dxa"/>${shdBlanco}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol1Col2}<w:r>${rPrCelda}<w:t>${valorEscapado}</w:t></w:r></w:p></w:tc>`
    filasBD += `<w:tc><w:tcPr><w:tcW w:w="${col3W}" w:type="dxa"/>${shdBlanco}${bordesCelda()}<w:vAlign w:val="center"/></w:tcPr><w:p>${pPrCol3}<w:r>${rPrCelda}<w:t>${actitudEscapada}</w:t></w:r></w:p></w:tc>`
    filasBD += '</w:tr>'
  })

  return `${tblStart}${headerRow}${filaEstatica}${filasBD}</w:tbl>`
}

const SYSTEM_PROMPT_SESION_TABLA = `Eres un experto en diseño de sesiones de aprendizaje. Responde ÚNICAMENTE con una tabla de texto: filas y columnas separadas, SIN mezclar ni combinar celdas.

REGLAS ESTRICTAS DE FORMATO:
1. Una línea = una fila. Nunca pongas varias filas en una sola línea ni mezcles el contenido de columnas.
2. Cada fila tiene exactamente 4 celdas separadas por el carácter | (barra vertical).
3. La primera línea debe ser SIEMPRE la cabecera:
MOMENTOS | PROCESOS PEDAGÓGICOS | ACTIVIDADES DE APRENDIZAJE | TIEMPO

4. A partir de la segunda línea, cada fila de datos con 4 celdas separadas por |.
5. NO combines: cada actividad o ítem en su propia fila.
6. En PROCESOS PEDAGÓGICOS usa: Motivación, Saberes previos, Problematización / Conflicto cognitivo, Propósito y organización, Análisis, Metacognición, etc.
7. En MOMENTOS: solo INICIO, DESARROLLO o CIERRE.
8. No escribas nada antes ni después de la tabla.`

async function renderPromptSesionDocx(data: Record<string, string>): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'templates', PROMPT_SESION_TEMPLATE)
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Plantilla no encontrada: ${PROMPT_SESION_TEMPLATE}`)
  }
  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)
  const templateDoc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  })
  templateDoc.render(data)
  return templateDoc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  }) as Buffer
}

async function extraerPromptDesdeWord(data: Record<string, string>): Promise<string> {
  const docxBuffer = await renderPromptSesionDocx(data)
  const extractResult = await mammoth.extractRawText({ buffer: docxBuffer })
  return (extractResult.value || '').trim()
}

async function construirPromptDataSesion(params: {
  formData: Record<string, unknown>
  sesionData?: Record<string, unknown>
  unidadData?: Record<string, unknown>
  userId: number
  competencia: string
  capacidades: string
  desempenio: string
  numsesion: string
  nombresesion: string
  enfoquesTransversalesSeleccionados?: EnfoqueTransversalUnidad[]
}): Promise<Record<string, string>> {
  const {
    formData,
    sesionData,
    unidadData,
    userId,
    competencia,
    capacidades,
    desempenio,
    numsesion,
    nombresesion,
    enfoquesTransversalesSeleccionados = []
  } = params

  const duracion = String(formData.duracion || '').trim()
  const tiempos = TIEMPOS_POR_DURACION[duracion] || TIEMPOS_POR_DURACION['45']

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
        for (const d of descripciones) lineas.push(`  ◦ ${d}`)
      }
      procesosdidacticos = lineas.join('\n')
    } catch (e) {
      console.error('Error al cargar procesos didácticos:', e)
    }
  }

  let enfoquestransversales = ''
  if (enfoquesTransversalesSeleccionados.length > 0) {
    enfoquestransversales = enfoquesTransversalesSeleccionados[0].enfoque
  } else {
    const areaIdU = formData.areaId || unidadData?.areaId || ''
    const gradoIdU = formData.gradoId || unidadData?.gradoId || ''
    const unidadU = formData.unidad || unidadData?.unidad || ''
    if (areaIdU && gradoIdU && unidadU) {
      try {
        const todos = await cargarEnfoquesTransversalesDeUnidad(
          userId,
          String(areaIdU),
          String(gradoIdU),
          String(unidadU)
        )
        const seleccionados = seleccionarEnfoqueAleatorio(todos)
        enfoquestransversales = seleccionados[0]?.enfoque || ''
      } catch (e) {
        console.error('Error al cargar enfoques transversales:', e)
      }
    }
  }

  const limpiarBrPrompt = (s: string) =>
    (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
  const capacidadesPrompt =
    sesionData?.capacidadesSeleccionadas && Array.isArray(sesionData.capacidadesSeleccionadas)
      ? (sesionData.capacidadesSeleccionadas as string[])
          .filter((c: string) => c && String(c).trim())
          .map((c: string) => `- ${limpiarBrPrompt(c)}`)
          .join('\n')
      : capacidades.replace(/^•\s*/gm, '- ')
  const desempeniosPrompt =
    sesionData?.desempeniosSeleccionados && Array.isArray(sesionData.desempeniosSeleccionados)
      ? (sesionData.desempeniosSeleccionados as string[])
          .filter((d: string) => d && String(d).trim())
          .map((d: string, i: number) => `${i + 1}. ${limpiarBrPrompt(d)}`)
          .join('\n')
      : desempenio

  return {
    area: String(formData.area ?? ''),
    grado: String(formData.grado ?? ''),
    ciclo: String(formData.ciclo ?? ''),
    entidadpublica: String(formData.entidadpublica ?? formData.tipoIE ?? 'Pública'),
    numsesion,
    titulosesion: nombresesion,
    duracion: duracion ? `${duracion} minutos` : '',
    inicio: `${tiempos.inicio} minutos`,
    desarrollo: `${tiempos.desarrollo} minutos`,
    cierre: `${tiempos.cierre} minutos`,
    competencia,
    capacidades: capacidadesPrompt,
    desempenios: desempeniosPrompt,
    enfoquestransversales,
    procesosdidacticos
  }
}

async function llamarGpt(systemContent: string, promptText: string): Promise<string> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const requestConfig = {
    model: MODELO_GPT,
    messages: [
      { role: 'system' as const, content: systemContent },
      { role: 'user' as const, content: promptText }
    ],
    top_p: 1,
    max_completion_tokens: 16384
  }
  let completion = await openaiClient.chat.completions.create(requestConfig)
  let texto = (completion.choices?.[0]?.message?.content || '').trim()
  if (!texto) {
    completion = await openaiClient.chat.completions.create(requestConfig)
    texto = (completion.choices?.[0]?.message?.content || '').trim()
  }
  if (!texto) throw new Error('GPT no generó ninguna respuesta')
  return texto
}

function sanitizeTextoWord(s: string): string {
  return String(s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\uFFFD/g, '')
}

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const TIEMPOS_POR_DURACION: Record<string, { inicio: number; desarrollo: number; cierre: number }> = {
  '45':  { inicio: 10,  desarrollo: 25, cierre: 10  },
  '90':  { inicio: 15,  desarrollo: 60, cierre: 15  },
  '135': { inicio: 20,  desarrollo: 95, cierre: 20  },
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const {
      formData,
      sesionData,
      unidadData,
      tableTextFromPrompt,
      contenidoDesdeBD,
      forzarRegeneracion: forzarRegeneracionRaw,
      formato
    } = await request.json()
    const forzarRegeneracion = !!forzarRegeneracionRaw

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    const areaIdAcceso = unidadData?.areaId ?? formData.areaId ?? null
    const gradoIdAcceso = unidadData?.gradoId ?? formData.gradoId ?? null
    const tieneSuscripcion = await tieneSuscripcionActivaPara(
      userId,
      areaIdAcceso != null ? String(areaIdAcceso) : null,
      gradoIdAcceso != null ? String(gradoIdAcceso) : null
    )
    const numeroSesionEarly =
      parseInt(String(sesionData?.numeroSesion ?? formData?.numsesesion ?? '1'), 10) || 1
    const soloExportarSesion =
      !forzarRegeneracion &&
      contenidoDesdeBD &&
      typeof contenidoDesdeBD === 'object' &&
      (contenidoDesdeBD.motivacion != null ||
        contenidoDesdeBD.saberes != null ||
        contenidoDesdeBD.proposito != null ||
        contenidoDesdeBD.desarrollo != null ||
        contenidoDesdeBD.desarrolloantes != null ||
        contenidoDesdeBD.desarrollodurante != null ||
        contenidoDesdeBD.desarrollodespues != null)

    let suscripcionRegenId: number | null = null
    if (forzarRegeneracion && tieneSuscripcion) {
      const regen = await validarRegeneracionIA(
        userId,
        areaIdAcceso != null ? String(areaIdAcceso) : null,
        gradoIdAcceso != null ? String(gradoIdAcceso) : null
      )
      if (!regen.ok) {
        return NextResponse.json({ error: regen.error, code: regen.code }, { status: 403 })
      }
      suscripcionRegenId = regen.suscripcionId
    }

    if (tieneSuscripcion && !soloExportarSesion && !forzarRegeneracion) {
      const limiteSesion = await assertPuedeCrearSesion(userId)
      if (!limiteSesion.ok) {
        return NextResponse.json(
          { error: limiteSesion.error, code: limiteSesion.code },
          { status: 403 }
        )
      }
    }

    const consumirTrialSesion = !tieneSuscripcion
    if (consumirTrialSesion) {
      if (!sesionPermitidaEnTrial(numeroSesionEarly)) {
        return NextResponse.json(
          { error: MSG_TRIAL_SOLO_SESION_1, code: 'TRIAL_UNA_SESION' },
          { status: 403 }
        )
      }
      if (!soloExportarSesion) {
        const puedeTrial = await puedeGenerarConTrial(userId, 'sesion')
        if (!puedeTrial) {
          return NextResponse.json(
            { error: MSG_TRIAL_AGOTADO, code: 'TRIAL_AGOTADO_SESION' },
            { status: 403 }
          )
        }
      }
    }

    const tInicio = Date.now()
    let tUltimo = tInicio

    // Obtener competencias transversales por grado (para {{tablacompetencias}})
    type CompTransversalRow = { competenciadescripcion: string; capacidades: Array<{ capacidad: string; primerDesempenio: string }> }
    let competenciasTransversalesParaTabla: CompTransversalRow[] = []
    const gradoIdNum = formData.gradoId != null ? parseInt(String(formData.gradoId), 10) : NaN
    if (!isNaN(gradoIdNum)) {
      try {
        const comptransversales = await prisma.comptransversal.findMany({
          where: { idgrado: gradoIdNum },
          include: {
            capacidadtransversales: {
              include: {
                desempeniotransversales: { orderBy: { iddesempeniotransversal: 'asc' } }
              },
              orderBy: { idcapacidadtransversal: 'asc' }
            }
          },
          orderBy: { idcomtransversal: 'asc' }
        })
        competenciasTransversalesParaTabla = comptransversales.map(comp => ({
          competenciadescripcion: comp.descripcion || '',
          capacidades: comp.capacidadtransversales.map(cap => ({
            capacidad: cap.descripcion || '',
            primerDesempenio: (cap.desempeniotransversales[0]?.descripcion) || ''
          })).filter(c => c.capacidad || c.primerDesempenio)
        })).filter(c => c.competenciadescripcion && c.capacidades.length > 0)
      } catch (e) {
        console.error('Error al cargar competencias transversales por grado:', e)
      }
    }
    console.log(`[generate-document] Competencias transversales: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    let enfoquesTransversalesParaTabla: EnfoqueTransversalUnidad[] = []
    const areaIdUnidad = String(unidadData?.areaId ?? formData.areaId ?? '')
    const gradoIdUnidad = String(unidadData?.gradoId ?? formData.gradoId ?? '')
    const unidadNombre = String(unidadData?.unidad ?? formData.unidad ?? '')
    if (areaIdUnidad && gradoIdUnidad && unidadNombre) {
      try {
        const todosEnfoques = await cargarEnfoquesTransversalesDeUnidad(
          userId,
          areaIdUnidad,
          gradoIdUnidad,
          unidadNombre
        )
        enfoquesTransversalesParaTabla = seleccionarEnfoqueAleatorio(todosEnfoques)
        if (enfoquesTransversalesParaTabla.length > 0) {
          console.log(
            `[generate-document] Enfoque transversal aleatorio: "${enfoquesTransversalesParaTabla[0].enfoque}" (${enfoquesTransversalesParaTabla.length} fila(s))`
          )
        }
      } catch (e) {
        console.error('Error al cargar enfoques transversales de la unidad:', e)
      }
    }

    // Ruta a la plantilla
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'FORMATO DE SESIÓN.docx'
    )

    // Verificar que la plantilla existe
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada: FORMATO DE SESIÓN.docx' },
        { status: 404 }
      )
    }

    // Leer la plantilla
    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
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
      },
      errorLogging: true
    })
    console.log(`[generate-document] Lectura plantilla + init doc: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Determinar número de sesión y nombre de sesión
    let numsesion = ''
    let nombresesion = ''
    let competencia = ''
    let standares = ''
    let capacidades = ''
    let desempenio = ''
    let campotematico = ''
    let evidencia = ''
    let criterios = ''
    
    if (formData.continuarUnidad && sesionData) {
      // Si viene de una sesión guardada
      numsesion = sesionData.numeroSesion || '1'
      nombresesion = sesionData.titulo || formData.tituloSesion || ''
      
      // Función auxiliar para limpiar etiquetas <br>
      const limpiarBr = (texto: string): string => {
        if (!texto) return ''
        return texto.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
      }
      
      // Obtener datos directamente de la sesión guardada
      // Formatear capacidades con viñetas y saltos de línea
      if (sesionData.capacidadesSeleccionadas && Array.isArray(sesionData.capacidadesSeleccionadas)) {
        capacidades = sesionData.capacidadesSeleccionadas
          .filter((cap: string) => cap && cap.trim())
          .map((cap: string) => {
            const capLimpio = limpiarBr(cap)
            return capLimpio ? `• ${capLimpio}` : ''
          })
          .filter((cap: string) => cap)
          .join('\n')
      }
      
      // Formatear desempeños con viñetas y saltos de línea (igual que capacidades)
      if (sesionData.desempeniosSeleccionados && Array.isArray(sesionData.desempeniosSeleccionados)) {
        desempenio = sesionData.desempeniosSeleccionados
          .filter((des: string) => des && des.trim())
          .map((des: string) => {
            const desLimpio = limpiarBr(des)
              .replace(/^\d+\.\s*/, '')
              .trim()
            if (!desLimpio) return ''
            return desLimpio.startsWith('•') ? desLimpio : `• ${desLimpio}`
          })
          .filter((des: string) => des)
          .join('\n')
      }
      
      // Campo temático (texto directo, limpiar <br>)
      campotematico = limpiarBr(sesionData.campoTematico || '')
      
      // Evidencias (texto directo, limpiar <br>)
      evidencia = limpiarBr(sesionData.evidencias || '')
      
      // Criterios con viñetas y saltos de línea
      if (sesionData.criterios) {
        // Si es un string, puede venir con saltos de línea o separado
        if (typeof sesionData.criterios === 'string') {
          const criteriosLimpio = limpiarBr(sesionData.criterios)
          const criteriosArray = criteriosLimpio.split('\n').filter((c: string) => c.trim())
          criterios = criteriosArray
            .map((c: string) => {
              const criterioLimpio = c.trim()
              // Si ya tiene viñeta, mantenerla, si no, agregarla
              return criterioLimpio.startsWith('•') ? criterioLimpio : `• ${criterioLimpio}`
            })
            .join('\n')
        } else if (Array.isArray(sesionData.criterios)) {
          criterios = sesionData.criterios
            .filter((c: string) => c && c.trim())
            .map((c: string) => {
              const criterioLimpio = limpiarBr(c).trim()
              return criterioLimpio.startsWith('•') ? criterioLimpio : `• ${criterioLimpio}`
            })
            .filter((c: string) => c)
            .join('\n')
        }
      }
      
      // Obtener competencia y estándares desde la unidad de aprendizaje
      if (unidadData && unidadData.areaId && unidadData.gradoId && unidadData.unidad) {
        try {
          const anio = new Date().getFullYear()
          const unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
            where: {
              idusuario: userId,
              anio: anio,
              areaId: unidadData.areaId,
              gradoId: unidadData.gradoId,
              unidad: unidadData.unidad
            }
          })
          
          if (unidadAprendizaje && unidadAprendizaje.competencias) {
            // competencias es un JSON array con estructura: [{ competencianro, competenciadescripcion, estandares }]
            const competenciasArray = unidadAprendizaje.competencias as Array<{
              competencianro: string
              competenciadescripcion: string
              estandares: string
            }>
            
            // Obtener la primera competencia de la sesión (si hay competencias en sesionData)
            if (sesionData.competenciasSeleccionadas && sesionData.competenciasSeleccionadas.length > 0) {
              const competenciaSesion = sesionData.competenciasSeleccionadas[0] // Primera competencia de la sesión
              
              // Buscar la competencia en el array de competencias guardadas
              const competenciaEncontrada = competenciasArray.find((comp: any) => {
                // Comparar por descripción (puede ser exacta o parcial)
                const descripcionComp = comp.competenciadescripcion || ''
                return descripcionComp === competenciaSesion || 
                       descripcionComp.includes(competenciaSesion) || 
                       competenciaSesion.includes(descripcionComp)
              })
              
              if (competenciaEncontrada) {
                competencia = competenciaEncontrada.competenciadescripcion || ''
                standares = competenciaEncontrada.estandares || ''
              } else if (competenciasArray.length > 0) {
                // Si no se encuentra, usar la primera competencia disponible
                competencia = competenciasArray[0].competenciadescripcion || ''
                standares = competenciasArray[0].estandares || ''
              }
            } else if (competenciasArray.length > 0) {
              // Si no hay competencias en la sesión, usar la primera competencia disponible
              competencia = competenciasArray[0].competenciadescripcion || ''
              standares = competenciasArray[0].estandares || ''
            }
          }
        } catch (error) {
          console.error('Error al obtener competencia y estándares:', error)
        }
      }
    } else {
      // Si es una sesión nueva
      numsesion = '1'
      nombresesion = formData.tituloSesion || ''
    }

    // Si standares sigue vacío, obtener desde Competencia/Estandar por areaId, gradoId (y nivel) y competencia seleccionada
    if (!standares || !standares.trim()) {
      const areaIdNum = formData.areaId ? parseInt(String(formData.areaId), 10) : (unidadData?.areaId ? parseInt(String(unidadData.areaId), 10) : 0)
      const gradoIdNum = formData.gradoId ? parseInt(String(formData.gradoId), 10) : (unidadData?.gradoId ? parseInt(String(unidadData.gradoId), 10) : 0)
      const competenciaBuscar = (sesionData?.competenciasSeleccionadas && Array.isArray(sesionData.competenciasSeleccionadas) && sesionData.competenciasSeleccionadas.length > 0)
        ? String(sesionData.competenciasSeleccionadas[0]).trim()
        : ''
      console.log('[generate-document] standares vacío - intentando fallback BD. areaIdNum:', areaIdNum, 'gradoIdNum:', gradoIdNum, 'competenciaBuscar:', competenciaBuscar ? competenciaBuscar.substring(0, 60) + '...' : '(vacío)')
      if (areaIdNum > 0 && gradoIdNum > 0) {
        try {
          // Incluir idnivel: Competencia exige nivel; intentar "Secundaria" o cualquier nivel
          let nivel = await prisma.nivel.findFirst({ where: { descripcion: { contains: 'Secundaria', mode: 'insensitive' } } })
          if (!nivel) nivel = await prisma.nivel.findFirst()
          const whereCompetencia: { idarea: number; idgrado: number; idnivel?: number; transversal?: boolean } = {
            idarea: areaIdNum,
            idgrado: gradoIdNum,
            transversal: false
          }
          if (nivel) whereCompetencia.idnivel = nivel.id

          let lista = await prisma.competencia.findMany({
            where: whereCompetencia,
            include: { estandares: { orderBy: { ordenamiento: 'asc' } } }
          })
          // Si con nivel no hay resultados, buscar solo por área y grado
          if (lista.length === 0) {
            lista = await prisma.competencia.findMany({
              where: { idarea: areaIdNum, idgrado: gradoIdNum },
              include: { estandares: { orderBy: { ordenamiento: 'asc' } } }
            })
          }

          let compElegida = lista.find((c) => c.estandares && c.estandares.length > 0) || lista[0]
          if (competenciaBuscar && lista.length > 1) {
            const encontrada = lista.find((c) => {
              const d = (c.descripcion || '').trim()
              return d === competenciaBuscar || d.includes(competenciaBuscar) || competenciaBuscar.includes(d)
            })
            if (encontrada && encontrada.estandares && encontrada.estandares.length > 0) compElegida = encontrada
            else if (encontrada) compElegida = encontrada
          }

          if (compElegida && compElegida.estandares && compElegida.estandares.length > 0) {
            competencia = competencia || (compElegida.descripcion ?? '')
            standares = compElegida.estandares
              .map((est, i) => `${i + 1}. ${(est.descripcion || '').trim()}`)
              .join('\n')
            console.log(`[generate-document] Estándares obtenidos desde BD (Competencia id=${compElegida.id}): ${compElegida.estandares.length} estándar(es)`)
          } else {
            console.log('[generate-document] Fallback BD: lista competencias=', lista.length, 'compElegida=', compElegida?.id, 'estandares en compElegida=', compElegida?.estandares?.length ?? 0)
          }
        } catch (e) {
          console.error('[generate-document] Error al obtener estándares desde Competencia:', e)
        }
      } else {
        console.log('[generate-document] Fallback BD no ejecutado: areaIdNum o gradoIdNum inválidos (<=0)')
      }
    }

    console.log(`[generate-document] Datos sesión (numsesion, competencias, etc.): ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    const promptDataSesion = await construirPromptDataSesion({
      formData,
      sesionData,
      unidadData,
      userId,
      competencia,
      capacidades,
      desempenio,
      numsesion,
      nombresesion,
      enfoquesTransversalesSeleccionados: enfoquesTransversalesParaTabla
    })

    // Si el front envía contenido guardado en BD, usarlo y no llamar a la IA
    const usarContenidoBD = contenidoDesdeBD && typeof contenidoDesdeBD === 'object' &&
      (contenidoDesdeBD.motivacion != null || contenidoDesdeBD.saberes != null || contenidoDesdeBD.proposito != null ||
       contenidoDesdeBD.desarrollo != null || contenidoDesdeBD.desarrolloantes != null || contenidoDesdeBD.desarrollodurante != null || contenidoDesdeBD.desarrollodespues != null)

    let tableText =
      typeof tableTextFromPrompt === 'string' && tableTextFromPrompt.trim()
        ? tableTextFromPrompt.trim()
        : ''
    // Respuesta cruda de GPT (tal cual la devuelve), para descargar un Word idéntico
    let respuestaGptCruda = tableText
    let tiempoIAms = 0
    if (!usarContenidoBD && !tableText) {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          {
            error: 'OPENAI_API_KEY no está configurada. La sesión requiere GPT.',
            code: 'OPENAI_API_KEY_MISSING'
          },
          { status: 503 }
        )
      }
      try {
        const promptText = await extraerPromptDesdeWord(promptDataSesion)
        if (!promptText) {
          return NextResponse.json(
            { error: 'No se pudo extraer el prompt de sesión.', code: 'PROMPT_VACIO' },
            { status: 500 }
          )
        }
        const inicioIA = Date.now()
        tableText = await llamarGpt(SYSTEM_PROMPT_SESION_TABLA, promptText)
        respuestaGptCruda = tableText
        tiempoIAms = Date.now() - inicioIA
        console.log(
          `[generate-document] IA sesión (gpt), PROMT PROBADO: ${promptText.length}c → respuesta ${tableText.length}c (${tiempoIAms} ms)`
        )
      } catch (err) {
        console.error('Error al llamar GPT en generar documento sesión:', err)
        const mensaje =
          err instanceof Error ? err.message : 'No se pudo generar la sesión con GPT'
        return NextResponse.json(
          { error: mensaje, code: 'GPT_SESION_ERROR' },
          { status: 503 }
        )
      }
    }
    tUltimo = Date.now()

    // Quitar posible bloque de código markdown que devuelve la IA
    if (tableText && /^```/.test(tableText)) {
      tableText = tableText.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    // Extraer motivación, saberes, problematización, propósito y desarrollo
    if (tableText && /^```/.test(tableText)) {
      tableText = tableText.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    // Extraer motivación, saberes, problematización, propósito y "Antes de la expresión oral" (máx. 3 filas → desarrolloantes)
    let motivacion = ''
    let saberes = ''
    let problematizacion = ''
    let proposito = ''
    let desarrollo = ''
    let desarrolloantes = ''
    let desarrollodurante = ''
    let desarrollodespues = ''
    let metacognicion = ''
    const sinPrefijoProposito = (s: string) => (String(s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim())
    // Quita etiquetas tipo "Pregunta experiencial:", "Pregunta conceptual/analítica:", "Pregunta procedimental:" dejando solo la pregunta.
    const soloPreguntas = (s: string) =>
      String(s || '')
        .replace(/Pregunta[^:\n]*:\s*/gi, '')
        .replace(/[ \t]{2,}/g, ' ')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join('\n')
        .trim()
    if (usarContenidoBD) {
      motivacion = (contenidoDesdeBD.motivacion ?? '').toString()
      saberes = (contenidoDesdeBD.saberes ?? '').toString()
      problematizacion = (contenidoDesdeBD.problematizacion ?? '').toString()
      proposito = sinPrefijoProposito((contenidoDesdeBD.proposito ?? '').toString())
      desarrollo = (contenidoDesdeBD.desarrollo ?? '').toString()
      desarrolloantes = (contenidoDesdeBD.desarrolloantes ?? '').toString()
      desarrollodurante = (contenidoDesdeBD.desarrollodurante ?? '').toString()
      desarrollodespues = (contenidoDesdeBD.desarrollodespues ?? '').toString()
      metacognicion = (contenidoDesdeBD.metacognicion ?? '').toString()
      console.log('[generate-document] Usando contenido desde BD (sin llamar a la IA)')
    }
    if (tableText && !usarContenidoBD) {
      const norm = (s: string) =>
        (s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      const soloLetrasYEspacios = (s: string) => (s || '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
      const lineas = tableText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)

      /** Celdas: MOMENTOS | PROCESOS | ACTIVIDAD | TIEMPO (soporta markdown con | extremos y tabs). */
      const celdasDeLinea = (linea: string): string[] | null => {
        const celdas = parsearFilasTabla(linea)
        if (celdas.length < 3) return null
        const unidos = celdas.join(' ').replace(/\s/g, '')
        if (/^[-:|]+$/.test(unidos)) return null
        const cabeza = norm(celdas[0] || '')
        const proc = norm(celdas[1] || '')
        if (
          (cabeza.includes('momento') || cabeza === 'momentos') &&
          (proc.includes('proceso') || proc.includes('pedagogico'))
        ) {
          return null
        }
        return celdas
      }

      const filasMotivacion: string[] = []
      const partesSaberes: string[] = []
      const partesProblematizacion: string[] = []
      const partesProposito: string[] = []
      const filasAntesExpresionOral: string[] = []
      const filasDuranteExpresionOral: string[] = []
      const filasDespuesExpresionOral: string[] = []
      let enMotivacion = false
      let enSaberesPrevios = false
      let enProblematizacion = false
      let enProposito = false
      let enAntesExpresionOral = false
      let enDuranteExpresionOral = false
      let enDespuesExpresionOral = false

      for (const linea of lineas) {
        const celdas = celdasDeLinea(linea)
        if (!celdas) continue

        const colProcesos = celdas[1] || ''
        const colProcesosNorm = norm(colProcesos)
        const actividad =
          celdas.length >= 4
            ? celdas.slice(2, -1).join(' ').trim()
            : (celdas[2] || '').trim()
        const colProcesosNormClean = colProcesosNorm.replace(/\s+/g, ' ').trim()
        const esMotivacion = colProcesosNorm.includes('motivacion') || colProcesosNorm.startsWith('motiv')
        const procClean = soloLetrasYEspacios(colProcesosNormClean)
        const esAntesExpresionOral =
          procClean === 'antes de la expresion oral' ||
          procClean.startsWith('antes de la expresion oral') ||
          (procClean.includes('antes') &&
            procClean.includes('expresion') &&
            procClean.includes('oral') &&
            !procClean.includes('durante') &&
            !procClean.includes('despues'))
        const esDuranteExpresionOral =
          procClean.includes('durante') &&
          procClean.includes('expresion') &&
          procClean.includes('oral') &&
          !procClean.includes('antes') &&
          !procClean.includes('despues')
        const esDespuesExpresionOral =
          procClean.includes('despues') &&
          procClean.includes('expresion') &&
          procClean.includes('oral') &&
          !procClean.includes('antes') &&
          !procClean.includes('durante')

        if (esMotivacion) {
          enMotivacion = true
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
          if (actividad) filasMotivacion.push(actividad)
        } else if (colProcesosNorm.includes('saberes previos')) {
          enMotivacion = false
          enSaberesPrevios = true
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
          if (actividad) partesSaberes.push(actividad)
        } else if (
          colProcesosNorm.includes('problematizacion') ||
          colProcesosNorm.includes('problemat') ||
          colProcesosNorm.includes('conflicto cognitivo') ||
          /problemat/i.test(colProcesos)
        ) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = true
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
          if (actividad) partesProblematizacion.push(actividad)
        } else if (esAntesExpresionOral) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = true
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
          if (actividad) filasAntesExpresionOral.push(actividad)
        } else if (esDuranteExpresionOral) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = true
          enDespuesExpresionOral = false
          if (actividad) filasDuranteExpresionOral.push(actividad)
        } else if (esDespuesExpresionOral) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = true
          if (actividad) filasDespuesExpresionOral.push(actividad)
        } else if (
          colProcesosNorm.includes('proposito y organizacion') ||
          colProcesosNorm.includes('proposito') ||
          /prop[oó]sito/i.test(colProcesos)
        ) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = true
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
          if (actividad) partesProposito.push(actividad)
        } else if (colProcesos) {
          enMotivacion = false
          enSaberesPrevios = false
          enProblematizacion = false
          enProposito = false
          enAntesExpresionOral = false
          enDuranteExpresionOral = false
          enDespuesExpresionOral = false
        } else {
          if (enMotivacion && actividad) filasMotivacion.push(actividad)
          if (enSaberesPrevios && actividad) partesSaberes.push(actividad)
          if (enProblematizacion && actividad) partesProblematizacion.push(actividad)
          if (enProposito && actividad) partesProposito.push(actividad)
          if (enAntesExpresionOral && actividad) filasAntesExpresionOral.push(actividad)
          if (enDuranteExpresionOral && actividad) filasDuranteExpresionOral.push(actividad)
          if (enDespuesExpresionOral && actividad) filasDespuesExpresionOral.push(actividad)
        }
      }

      if (filasMotivacion.length > 0) motivacion = filasMotivacion.join('\n')
      if (partesSaberes.length > 0) saberes = soloPreguntas(partesSaberes.join('\n'))
      if (partesProblematizacion.length > 0) problematizacion = partesProblematizacion.join('\n')
      if (partesProposito.length > 0) proposito = sinPrefijoProposito(partesProposito.join('\n'))
      if (filasAntesExpresionOral.length > 0) {
        desarrolloantes = filasAntesExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }
      if (filasDuranteExpresionOral.length > 0) {
        desarrollodurante = filasDuranteExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }
      if (filasDespuesExpresionOral.length > 0) {
        desarrollodespues = filasDespuesExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }

      // {{desarrollo}}: filas MOMENTOS=DESARROLLO, agrupadas por PROCESOS PEDAGÓGICOS
      const filasDesarrollo: Array<{ proceso: string; actividad: string }> = []
      for (const linea of lineas) {
        const celdas = celdasDeLinea(linea)
        if (!celdas || celdas.length < 3) continue
        const momentoRaw = norm((celdas[0] || '').trim())
        const esMomentoDesarrollo = momentoRaw === 'desarrollo' || momentoRaw.startsWith('desarrollo')
        if (!esMomentoDesarrollo) continue
        const colProcesosNorm = norm((celdas[1] || '').trim())
        if (colProcesosNorm === 'procesos pedagogicos') continue
        const proceso = (celdas[1] || '').trim()
        const actividad =
          celdas.length >= 4
            ? celdas.slice(2, -1).join(' ').trim()
            : (celdas[2] || '').trim()
        if (!proceso || !actividad) continue
        filasDesarrollo.push({ proceso, actividad })
      }
      const gruposDesarrollo = new Map<string, string[]>()
      for (const { proceso, actividad } of filasDesarrollo) {
        const arr = gruposDesarrollo.get(proceso) || []
        if (arr.length < 3) arr.push(actividad)
        gruposDesarrollo.set(proceso, arr)
      }
      if (gruposDesarrollo.size > 0) {
        const quitarLlaves = (s: string) => (s || '').replace(/^\{+|\}+$/g, '').trim()
        desarrollo = Array.from(gruposDesarrollo.entries())
          .map(([titulo, actividades]) => `${quitarLlaves(titulo)}\n${actividades.map((a) => '- ' + a).join('\n')}`)
          .join('\n\n')
      }

      // {{metacognicion}}: filas cuyo PROCESO PEDAGÓGICO sea "Metacognición"
      const filasMetacognicion: string[] = []
      for (const linea of lineas) {
        const celdas = celdasDeLinea(linea)
        if (!celdas || celdas.length < 3) continue
        const colProcesosSinAcento = (celdas[1] || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
        if (!colProcesosSinAcento.includes('metacognicion')) continue
        const actividad =
          celdas.length >= 4
            ? celdas.slice(2, -1).join(' ').trim()
            : (celdas[2] || '').trim()
        if (actividad) filasMetacognicion.push(actividad)
      }
      if (filasMetacognicion.length > 0) metacognicion = filasMetacognicion.join('\n')

      console.log(
        `[generate-document] Tabla: ${lineas.length} líneas. motiv=${filasMotivacion.length} saberes=${partesSaberes.length} probl=${partesProblematizacion.length} prop=${partesProposito.length}. {{desarrollo}}: ${gruposDesarrollo.size} procesos (${desarrollo.length}c), antes/durante/después: ${filasAntesExpresionOral.length}/${filasDuranteExpresionOral.length}/${filasDespuesExpresionOral.length}, metacognición: ${filasMetacognicion.length}`
      )
    }
    console.log(`[generate-document] Parseo respuesta IA: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Guardar en BD la sesión con el contenido extraído (motivación, saberes, etc.) para poder reutilizarlo sin llamar a la IA
    const areaIdGuardar = (unidadData?.areaId ?? formData.areaId) ? String(unidadData?.areaId ?? formData.areaId) : null
    const gradoIdGuardar = (unidadData?.gradoId ?? formData.gradoId) ? String(unidadData?.gradoId ?? formData.gradoId) : null
    const unidadGuardar = (unidadData?.unidad ?? formData.unidad) != null ? String(unidadData?.unidad ?? formData.unidad) : null
    const numeroSesionInt = parseInt(String(numsesion || '1'), 10) || 1
    const tieneIdentificadores = areaIdGuardar && gradoIdGuardar && unidadGuardar

    if (tieneIdentificadores) {
      try {
        const anio = new Date().getFullYear()
        let unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
          where: {
            idusuario: userId,
            anio,
            areaId: areaIdGuardar,
            gradoId: gradoIdGuardar,
            unidad: unidadGuardar
          }
        })
        if (!unidadAprendizaje) {
          unidadAprendizaje = await prisma.unidadAprendizaje.create({
            data: {
              idusuario: userId,
              anio,
              areaId: areaIdGuardar,
              gradoId: gradoIdGuardar,
              unidad: unidadGuardar,
              area: formData.area ?? undefined,
              grado: formData.grado ?? undefined,
              institucion: formData.institucion ?? undefined,
              director: formData.director ?? undefined,
              docente: formData.docente ?? undefined,
              duracion: formData.duracion ?? undefined
            }
          })
          console.log('[generate-document] Unidad de aprendizaje creada para guardar sesión:', unidadAprendizaje.id)
        }
        // Prioridad: contenidoDesdeBD.standar > standares recién obtenidos > mantener el que ya tiene la sesión (no sobrescribir con vacío)
        let standarToSave = (usarContenidoBD && contenidoDesdeBD && typeof contenidoDesdeBD === 'object' && contenidoDesdeBD.standar != null && String(contenidoDesdeBD.standar).trim() !== '')
          ? String(contenidoDesdeBD.standar).trim()
          : (standares && standares.trim() ? standares.trim() : '')
        if (!standarToSave) {
          const sesionExistente = await prisma.sesion.findUnique({
            where: {
              idunidadaprendizaje_numeroSesion: {
                idunidadaprendizaje: unidadAprendizaje.id,
                numeroSesion: numeroSesionInt
              }
            },
            select: { standar: true }
          })
          if (sesionExistente?.standar && String(sesionExistente.standar).trim()) {
            standarToSave = String(sesionExistente.standar).trim()
            console.log('[generate-document] Manteniendo standar ya guardado en la sesión (no se pudo resolver en esta generación)')
          }
        }
        console.log('[generate-document] Campo standar - standares (variable):', standares ? `${standares.length} caracteres` : '(vacío)', standares ? standares.substring(0, 120) + (standares.length > 120 ? '...' : '') : '')
        console.log('[generate-document] Campo standar - standarToSave que se envía al upsert:', standarToSave ? `${standarToSave.length} caracteres` : '(vacío/null)', standarToSave ? standarToSave.substring(0, 120) + (standarToSave.length > 120 ? '...' : '') : '')
        await prisma.sesion.upsert({
          where: {
            idunidadaprendizaje_numeroSesion: {
              idunidadaprendizaje: unidadAprendizaje.id,
              numeroSesion: numeroSesionInt
            }
          },
          create: {
            idunidadaprendizaje: unidadAprendizaje.id,
            numeroSesion: numeroSesionInt,
            area: formData.area ?? undefined,
            areaId: areaIdGuardar,
            grado: formData.grado ?? undefined,
            gradoId: gradoIdGuardar,
            ciclo: formData.ciclo ?? undefined,
            institucion: formData.institucion ?? undefined,
            director: formData.director ?? undefined,
            docente: formData.docente ?? undefined,
            duracion: formData.duracion ?? undefined,
            fecha: formData.fecha ?? undefined,
            unidad: unidadGuardar,
            titulo: (nombresesion || formData.tituloSesion) ?? undefined,
            campoTematico: sesionData?.campoTematico ?? undefined,
            criterios: sesionData?.criterios ?? undefined,
            evidencias: sesionData?.evidencias ?? undefined,
            competenciasSeleccionadas: sesionData?.competenciasSeleccionadas ?? undefined,
            capacidadesSeleccionadas: sesionData?.capacidadesSeleccionadas ?? undefined,
            desempeniosSeleccionados: sesionData?.desempeniosSeleccionados ?? undefined,
            motivacion: motivacion || null,
            saberes: saberes || null,
            problematizacion: problematizacion || null,
            proposito: proposito || null,
            standar: standarToSave || null,
            desarrollo: desarrollo || null,
            desarrolloantes: desarrolloantes || null,
            desarrollodurante: desarrollodurante || null,
            desarrollodespues: desarrollodespues || null,
            metacognicion: metacognicion || null
          },
          update: {
            titulo: (nombresesion || formData.tituloSesion) ?? undefined,
            campoTematico: sesionData?.campoTematico ?? undefined,
            criterios: sesionData?.criterios ?? undefined,
            evidencias: sesionData?.evidencias ?? undefined,
            competenciasSeleccionadas: sesionData?.competenciasSeleccionadas ?? undefined,
            capacidadesSeleccionadas: sesionData?.capacidadesSeleccionadas ?? undefined,
            desempeniosSeleccionados: sesionData?.desempeniosSeleccionados ?? undefined,
            motivacion: motivacion || null,
            saberes: saberes || null,
            problematizacion: problematizacion || null,
            proposito: proposito || null,
            standar: standarToSave || null,
            desarrollo: desarrollo || null,
            desarrolloantes: desarrolloantes || null,
            desarrollodurante: desarrollodurante || null,
            desarrollodespues: desarrollodespues || null,
            metacognicion: metacognicion || null
          }
        })
        console.log('[generate-document] Sesión guardada/actualizada en BD:', unidadAprendizaje.id, 'nº', numeroSesionInt)
      } catch (err) {
        console.error('[generate-document] Error al guardar sesión en BD:', err)
        // No fallar la generación del documento si falla el guardado
      }
    } else {
      console.log('[generate-document] Sin areaId/gradoId/unidad, no se guarda sesión en BD')
    }

    // Placeholder para {{tablacompetencias}} y {{enfoquetransversales}}
    const TABLA_COMPETENCIAS_PLACEHOLDER = '__TABLA_COMPETENCIAS_PLACEHOLDER__'
    const TABLA_ENFOQUES_TRANSVERSALES_PLACEHOLDER =
      '__TABLA_ENFOQUES_TRANSVERSALES_PLACEHOLDER__'

    // Preparar los datos para reemplazar en la plantilla
    const data: any = {
      numsesion: numsesion,
      nombresesion: nombreSesionParaDocumento(nombresesion),
      institucion: formData.institucion || '',
      area: formData.area || '',
      grado: formData.grado || '',
      ciclo: formData.ciclo || '',
      director: formData.director || '',
      docente: formData.docente || '',
      fecha: formData.fecha || '',
      minutos: formData.duracion || '',
      competencia: competencia,
      standares: standares,
      capacidades: capacidades,
      desempenio: desempenio,
      campotematico: campotematico,
      evidencia: evidencia,
      criterios: criterios,
      motivacion: sanitizeTextoWord(motivacion),
      saberes: sanitizeTextoWord(saberes),
      problematizacion: sanitizeTextoWord(problematizacion),
      proposito: sanitizeTextoWord(proposito),
      desarrollo: sanitizeTextoWord(desarrollo),
      desarrolloantes: sanitizeTextoWord(desarrolloantes),
      desarrollodurante: sanitizeTextoWord(desarrollodurante),
      desarrollodespues: sanitizeTextoWord(desarrollodespues),
      metacognicion: sanitizeTextoWord(metacognicion),
      tablacompetencias: TABLA_COMPETENCIAS_PLACEHOLDER,
      enfoquetransversales: TABLA_ENFOQUES_TRANSVERSALES_PLACEHOLDER
    }

    // Reemplazar las variables en la plantilla (nueva API sin setData)
    try {
      doc.render(data)
      console.log(`[generate-document] doc.render(data): ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
      tUltimo = Date.now()
    } catch (error: any) {
      console.error('Error al renderizar la plantilla:', error)
      
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
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
        },
        { status: 500 }
      )
    }

    // Aplicar alineación a la izquierda para el campo {{standares}}
    // Modificar el XML del documento después del render para aplicar alineación
    if (standares && standares.trim()) {
      try {
        const zip = doc.getZip()
        const documentXml = zip.files['word/document.xml']
        
        if (documentXml) {
          let xmlContent = documentXml.asText()
          
          // Buscar párrafos que contengan el texto de estándares
          // Usar las primeras palabras del texto para identificar el párrafo
          const primerasPalabras = standares.trim().split(/\s+/).slice(0, 2).join(' ')
          
          if (primerasPalabras) {
            // Escapar caracteres especiales para regex
            const textoBusqueda = primerasPalabras.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            
            // Buscar todos los párrafos que contengan este texto
            // Patrón: <w:p...>...contenido con el texto...</w:p>
            const regex = new RegExp(
              `(<w:p(?:[^>]*)>)((?:(?!</w:p>).)*?${textoBusqueda}(?:(?!</w:p>).)*?</w:p>)`,
              'gis'
            )
            
            xmlContent = xmlContent.replace(regex, (match, pTag, pContent) => {
              // Aplicar alineación a la izquierda
              if (pTag.includes('<w:pPr>')) {
                // Si ya tiene w:pPr, modificar o agregar w:jc
                if (pTag.includes('<w:jc')) {
                  // Reemplazar cualquier alineación existente por left
                  return pTag.replace(/<w:jc[^>]*\/?>/, '<w:jc w:val="left"/>') + pContent
                } else {
                  // Agregar w:jc dentro de w:pPr
                  return pTag.replace('</w:pPr>', '<w:jc w:val="left"/></w:pPr>') + pContent
                }
              } else {
                // Si no tiene w:pPr, agregarlo con alineación a la izquierda
                return pTag.replace('>', '><w:pPr><w:jc w:val="left"/></w:pPr>') + pContent
              }
            })
            
            // Actualizar el XML en el zip
            zip.file('word/document.xml', xmlContent)
          }
        }
      } catch (xmlError) {
        console.error('Error al modificar XML para alineación de estándares:', xmlError)
        // Continuar aunque haya error en la modificación del XML
      }
    }

    // Reemplazar {{tablacompetencias}} por la tabla de competencias transversales (en función del grado)
    const escaparXML = (s: string): string => {
      if (!s) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    // Ancho tabla reducido (dxa). Total 10000; columnas 3333, 3333, 3334. Texto a 8pt (w:sz="16")
    const TBL_W = '10000'
    const COL1_W = '3333'
    const COL2_W = '3333'
    const COL3_W = '3334'
    const generarTablaCompetenciasTransversales = (): string => {
      const headerRow = `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${COL1_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>COMPETENCIAS TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${COL2_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>CAPACIDADES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${COL3_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>DESEMPEÑOS PRECISADOS</w:t></w:r></w:p></w:tc></w:tr>`
      if (competenciasTransversalesParaTabla.length === 0) {
        return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${COL1_W}"/><w:gridCol w:w="${COL2_W}"/><w:gridCol w:w="${COL3_W}"/></w:tblGrid>${headerRow}</w:tbl>`
      }
      let tablaXML = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${COL1_W}"/><w:gridCol w:w="${COL2_W}"/><w:gridCol w:w="${COL3_W}"/></w:tblGrid>` + headerRow
      competenciasTransversalesParaTabla.forEach((comp, compIndex) => {
        const competenciaEscapada = escaparXML(comp.competenciadescripcion)
        comp.capacidades.forEach((cap, capIndex) => {
          const capacidadEscapada = escaparXML(cap.capacidad)
          const desempenioEscapado = escaparXML(cap.primerDesempenio)
          const esPrimeraFilaCompetencia = capIndex === 0
          tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
          if (esPrimeraFilaCompetencia) {
            tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL1_W}" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${competenciaEscapada}</w:t></w:r></w:p></w:tc>`
          } else {
            tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
          }
          tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL2_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${capacidadEscapada}</w:t></w:r></w:p></w:tc>`
          tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL3_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${desempenioEscapado}</w:t></w:r></w:p></w:tc>`
          tablaXML += `</w:tr>`
        })
      })
      tablaXML += '</w:tbl>'
      return tablaXML
    }
    const tablaCompetenciasXML = generarTablaCompetenciasTransversales()
    try {
      insertarTablaEnPlaceholder(doc, [
        TABLA_COMPETENCIAS_PLACEHOLDER,
        'TABLA_COMPETENCIAS_PLACEHOLDER',
        '{{tablacompetencias}}'
      ], tablaCompetenciasXML)
    } catch (err) {
      console.error('Error al insertar tabla de competencias transversales:', err)
    }

    const tablaEnfoquesXML = generarTablaEnfoquesTransversalesSesion(
      enfoquesTransversalesParaTabla,
      escaparXML,
      '10475',
      '2537',
      '1843',
      '6095'
    )
    try {
      insertarTablaEnPlaceholder(doc, [
        TABLA_ENFOQUES_TRANSVERSALES_PLACEHOLDER,
        'TABLA_ENFOQUES_TRANSVERSALES_PLACEHOLDER',
        '{{enfoquetransversales}}'
      ], tablaEnfoquesXML)
    } catch (err) {
      console.error('Error al insertar tabla de enfoques transversales:', err)
    }

    // Generar el buffer del documento
    const docBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    console.log(`[generate-document] XML estándares + tabla competencias + zip.generate: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    const totalMs = Date.now() - tInicio
    console.log(`[generate-document] TOTAL desde click: ${(totalMs / 1000).toFixed(2)} s (${totalMs} ms) | IA = ${tiempoIAms} ms (${totalMs > 0 ? ((tiempoIAms / totalMs) * 100).toFixed(0) : 0}%)`)

    // Generar nombre del archivo
    const fileName = `SESION_${formData.area || 'documento'}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')

    if (consumirTrialSesion && !soloExportarSesion) {
      await marcarTrialConsumido(userId, 'sesion')
    }

    if (suscripcionRegenId != null) {
      await consumirCreditoRegeneracion(suscripcionRegenId)
    }

    let entrega
    try {
      if (consumirTrialSesion) {
        console.log('🔒 Modo prueba: convirtiendo sesión a PDF protegido...')
      }
      entrega = await prepararEntregaDocumento(
        docBuffer as Buffer,
        fileName,
        consumirTrialSesion
      )
    } catch (pdfError) {
      console.error('Error al generar PDF protegido (modo prueba, sesión):', pdfError)
      return NextResponse.json(
        { error: MSG_PDF_TRIAL_NO_DISPONIBLE, code: CODE_PDF_TRIAL_NO_DISPONIBLE },
        { status: 503 }
      )
    }

    const respuestaCrudaHeader: Record<string, string> = {}
    if (!consumirTrialSesion && respuestaGptCruda && respuestaGptCruda.trim()) {
      respuestaCrudaHeader['X-Sesion-Respuesta-Gpt'] = Buffer.from(
        encodeURIComponent(respuestaGptCruda),
        'utf8'
      ).toString('base64')
      respuestaCrudaHeader['Access-Control-Expose-Headers'] = 'X-Sesion-Respuesta-Gpt'
    }

    const formatoJson = formato === 'json'
    let promptBuffer: Buffer | null = null
    try {
      promptBuffer = await renderPromptSesionDocx(promptDataSesion)
    } catch (promptErr) {
      console.error('[generate-document] Error al generar prompt dinámico de sesión:', promptErr)
    }

    const areaSlug = String(formData.area || 'documento')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
    const ts = Date.now()

    if (formatoJson) {
      return NextResponse.json({
        documento: {
          fileName: entrega.fileName,
          contentType: entrega.contentType,
          docxBase64: Buffer.from(entrega.buffer as Buffer).toString('base64')
        },
        prompt: promptBuffer
          ? {
              fileName: `PROMPT_SESION_${areaSlug}_S${numsesion}_${ts}.docx`,
              docxBase64: promptBuffer.toString('base64')
            }
          : undefined,
        respuesta:
          !consumirTrialSesion && respuestaGptCruda && respuestaGptCruda.trim()
            ? { tableText: respuestaGptCruda }
            : undefined
      })
    }

    return new NextResponse(entrega.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': entrega.contentType,
        'Content-Disposition': `attachment; filename="${entrega.fileName}"`,
        ...entrega.extraHeaders,
        ...respuestaCrudaHeader
      }
    })
  } catch (error) {
    console.error('Error al generar documento de sesión:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al generar el documento de sesión', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

