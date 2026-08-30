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
  consumirCreditoRegeneracion,
  tieneSuscripcionActivaPara,
  validarRegeneracionIA
} from '@/lib/acceso-usuario'
import { MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN } from '@/lib/acceso-trial'
import { construirWordDesdeRespuestaGpt } from '@/lib/respuesta-prompt-word'
import { parsearSaberesSesion } from '@/lib/ficha-vista-html'
import {
  formatearProcesosDidacticosPrompt,
  listarDescripcionesProcesosDidacticos
} from '@/lib/procesos-didacticos-sesion'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

/** Plantilla: FICHA DE APRENDIZAJE.docx - Llaves: grado, titulodesesion, proposito, competencia, capacidad, evidencia, criterios, saber1, saber2, saber3, respuestaprompt (párrafos + tablas como en Respuesta prompt) */
const TEMPLATE_NAME = 'FICHA DE APRENDIZAJE.docx'
/** Prompt asociado a la ficha (se rellena con los datos de la sesión y se envía a GPT). */
const PROMPT_FICHA_TEMPLATE = 'PROMT_Ficha.docx'
const MODELO_GPT = 'gpt-5-mini'
const SYSTEM_PROMPT_FICHA =
  'Eres un especialista en planificación curricular del MINEDU (Perú). Sigue exactamente las instrucciones del usuario y responde solo con la ficha solicitada.'
const RESPUESTAPROMPT_PLACEHOLDER = 'RESPUESTAPROMPT_FICHA_PLACEHOLDER'

type SesionConUnidad = Awaited<ReturnType<typeof obtenerSesionConUnidad>>

function limpiarBrFicha(s: string): string {
  return (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
}

/**
 * Datos para rellenar PROMT_Ficha.docx.
 * Llaves del template: area, grado, titulosesion, proposito, campotematico,
 * competencia, procesosdidacticos, evidencia, criterios, duracion, desarrollo_sesion.
 */
async function datosPromptFichaDesdeSesion(
  sesion: NonNullable<SesionConUnidad>
): Promise<Record<string, string>> {
  const u = sesion.unidadAprendizaje
  const sinPrefijoProposito = (s: string) =>
    (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()

  const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
    ? (sesion.competenciasSeleccionadas as string[])
    : []
  const competencia = competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''

  const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
    ? (sesion.capacidadesSeleccionadas as string[])
    : []
  const capacidad = capacidadesArr
    .filter((c: string) => c && String(c).trim())
    .map((c: string) => `- ${limpiarBrFicha(c)}`)
    .join('\n')

  const duracionRaw = (sesion.duracion ?? u.duracion ?? '').trim()
  const desarrolloDurante = (sesion.desarrollodurante ?? '').trim()
  const desarrolloLegacy = (sesion.desarrollo ?? '').trim()
  const desarrollo_sesion = desarrolloDurante || desarrolloLegacy

  const areaId = sesion.areaId ?? u.areaId
  const procesosdidacticos = formatearProcesosDidacticosPrompt(
    await listarDescripcionesProcesosDidacticos(areaId, competencia)
  )

  return {
    area: (sesion.area ?? u.area ?? '').trim(),
    grado: (sesion.grado ?? u.grado ?? '').trim(),
    titulosesion: (sesion.titulo ?? '').trim(),
    proposito: sinPrefijoProposito(sesion.proposito ?? ''),
    campotematico: limpiarBrFicha(sesion.campoTematico ?? ''),
    competencia,
    capacidad,
    procesosdidacticos,
    evidencia: limpiarBrFicha(sesion.evidencias ?? ''),
    criterios: limpiarBrFicha(sesion.criterios ?? ''),
    duracion: duracionRaw ? `${duracionRaw} minutos` : '',
    desarrollo_sesion,
    // Compatibilidad con llaves antiguas / alternativas
    desarrollo: desarrollo_sesion,
    desarrolloantes: (sesion.desarrolloantes ?? '').trim(),
    desarrollodurante: desarrolloDurante,
    desarrollodespues: (sesion.desarrollodespues ?? '').trim()
  }
}

/** Rellena PROMT_Ficha.docx con los datos de la sesión y devuelve el buffer Word. */
async function renderPromptFichaDocx(
  sesion: NonNullable<SesionConUnidad>,
  promptData?: Record<string, string>
): Promise<Buffer> {
  const data = promptData ?? (await datosPromptFichaDesdeSesion(sesion))
  const promptPath = path.join(process.cwd(), 'templates', PROMPT_FICHA_TEMPLATE)
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Plantilla de prompt no encontrada: ${PROMPT_FICHA_TEMPLATE}`)
  }
  const promptContent = fs.readFileSync(promptPath, 'binary')
  const promptZip = new PizZip(promptContent)
  const promptDoc = new Docxtemplater(promptZip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  })
  promptDoc.render(data)
  return promptDoc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  }) as Buffer
}

async function obtenerSesionConUnidad(sesionId: number) {
  return prisma.sesion.findFirst({
    where: { id: sesionId },
    include: { unidadAprendizaje: true, fichaAprendizaje: true }
  })
}

/**
 * Genera la ficha con su prompt (PROMT_Ficha.docx) usando los datos de la sesión,
 * llama a GPT y guarda el registro FichaAprendizaje. Devuelve los campos de la ficha.
 */
async function generarYGuardarFicha(sesion: NonNullable<SesionConUnidad>) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada. La ficha requiere GPT.')
  }

  const promptData = await datosPromptFichaDesdeSesion(sesion)
  const {
    area,
    grado,
    titulosesion,
    proposito,
    competencia,
    capacidad,
    evidencia,
    criterios,
    duracion,
    desarrolloantes,
    desarrollodurante,
    desarrollodespues
  } = promptData

  const promptBuffer = await renderPromptFichaDocx(sesion, promptData)
  const extractResult = await mammoth.extractRawText({ buffer: promptBuffer })
  const promptText = (extractResult.value || '').trim()
  if (!promptText) {
    throw new Error('No se pudo extraer el texto del prompt de ficha')
  }

  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const requestConfig = {
    model: MODELO_GPT,
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT_FICHA },
      { role: 'user' as const, content: promptText }
    ],
    top_p: 1,
    max_completion_tokens: 16384
  }
  let completion = await openaiClient.chat.completions.create(requestConfig)
  let respuestaprompt = (completion.choices?.[0]?.message?.content || '').trim()
  if (!respuestaprompt) {
    completion = await openaiClient.chat.completions.create(requestConfig)
    respuestaprompt = (completion.choices?.[0]?.message?.content || '').trim()
  }
  if (!respuestaprompt) {
    throw new Error('La IA no generó ninguna respuesta para la ficha')
  }
  if (/^```/.test(respuestaprompt)) {
    respuestaprompt = respuestaprompt.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '').trim()
  }

  const saberesLista = parsearSaberesSesion(sesion.saberes)
  const fichaFields = {
    area,
    grado,
    titulosesion,
    titulodesesion: titulosesion,
    proposito,
    competencia,
    capacidad,
    evidencia,
    criterios,
    saber1: saberesLista[0] || '',
    saber2: saberesLista[1] || '',
    saber3: saberesLista[2] || '',
    respuestaprompt,
    duracion,
    desarrolloantes,
    desarrollodurante,
    desarrollodespues
  }

  await prisma.fichaAprendizaje.upsert({
    where: { idsesion: sesion.id },
    create: { idsesion: sesion.id, ...fichaFields },
    update: fichaFields
  })
  console.log('[generate-document-ficha] Ficha generada con GPT y guardada para sesión', sesion.id)

  return fichaFields
}

/**
 * Genera el documento Word de FICHA DE APRENDIZAJE (no sesión)
 * rellenando la plantilla con los datos de la sesión seleccionada.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const sesionId = body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    const forceRegenerate = !!body.forceRegenerate

    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json(
        { error: 'sesionId es requerido' },
        { status: 400 }
      )
    }

    const sesion = await obtenerSesionConUnidad(sesionId)

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje
    const tieneSuscripcion = await tieneSuscripcionActivaPara(
      userId,
      u.areaId,
      u.gradoId
    )
    if (!tieneSuscripcion) {
      return NextResponse.json(
        {
          error: MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
          code: 'TRIAL_FICHA_COTEJO_PLAN'
        },
        { status: 403 }
      )
    }

    if (forceRegenerate) {
      const regen = await validarRegeneracionIA(userId, u.areaId, u.gradoId)
      if (!regen.ok) {
        return NextResponse.json({ error: regen.error, code: regen.code }, { status: 403 })
      }
      await consumirCreditoRegeneracion(regen.suscripcionId)
      return NextResponse.json(
        {
          error:
            'Para regenerar la ficha, regenera la sesión completa (incluye solucionario y rúbrica).',
          code: 'REGENERAR_SESION_REQUERIDA'
        },
        { status: 400 }
      )
    }

    const limpiarBr = (s: string) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
    const sinPrefijoProposito = (s: string) => (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()

    let area: string
    let grado: string
    let tituloSesion: string
    let proposito: string
    let competencia: string
    let capacidad: string
    let evidencia: string
    let criterios: string
    let saber1: string
    let saber2: string
    let saber3: string
    let duracion: string
    let desarrolloantes: string
    let desarrollodurante: string
    let desarrollodespues: string
    let respuestaprompt = ''

    const fichaGuardada = !forceRegenerate ? sesion.fichaAprendizaje : null
    const fichaDesdeGuardado = !!fichaGuardada
    if (fichaGuardada) {
      area = (fichaGuardada.area ?? '').trim()
      grado = (fichaGuardada.grado ?? '').trim()
      tituloSesion = (fichaGuardada.titulosesion ?? '').trim()
      proposito = (fichaGuardada.proposito ?? '').trim()
      competencia = (fichaGuardada.competencia ?? '').trim()
      capacidad = (fichaGuardada.capacidad ?? '').trim()
      evidencia = (fichaGuardada.evidencia ?? '').trim()
      criterios = (fichaGuardada.criterios ?? '').trim()
      saber1 = (fichaGuardada.saber1 ?? '').trim()
      saber2 = (fichaGuardada.saber2 ?? '').trim()
      saber3 = (fichaGuardada.saber3 ?? '').trim()
      // Preferir siempre los saberes guardados en la sesión
      {
        const desdeSesion = parsearSaberesSesion(sesion.saberes)
        if (desdeSesion.length > 0) {
          saber1 = desdeSesion[0] || saber1
          saber2 = desdeSesion[1] || ''
          saber3 = desdeSesion[2] || ''
        }
      }
      duracion = (fichaGuardada.duracion ?? '').trim()
      desarrolloantes = (fichaGuardada.desarrolloantes ?? '').trim()
      desarrollodurante = (fichaGuardada.desarrollodurante ?? '').trim()
      desarrollodespues = (fichaGuardada.desarrollodespues ?? '').trim()
      respuestaprompt = (fichaGuardada.respuestaprompt ?? '').trim()
    } else {
      // No hay ficha guardada: generarla con su prompt (PROMT_Ficha.docx) y guardarla.
      const generada = await generarYGuardarFicha(sesion)
      area = generada.area
      grado = generada.grado
      tituloSesion = generada.titulosesion
      proposito = generada.proposito
      competencia = generada.competencia
      capacidad = generada.capacidad
      evidencia = generada.evidencia
      criterios = generada.criterios
      saber1 = generada.saber1
      saber2 = generada.saber2
      saber3 = generada.saber3
      duracion = generada.duracion
      desarrolloantes = generada.desarrolloantes
      desarrollodurante = generada.desarrollodurante
      desarrollodespues = generada.desarrollodespues
      respuestaprompt = generada.respuestaprompt
    }

    const parsearFilasTabla = (linea: string): string[] => {
      const partes = linea.split('|').map((c: string) => c.trim())
      if (partes.length <= 1) return []
      const sinExtremos =
        partes[0] === '' && partes[partes.length - 1] === ''
          ? partes.slice(1, -1)
          : partes
      return sinExtremos.filter(() => true)
    }
    const esLineaSeparadorTabla = (linea: string) => {
      if (!linea.includes('|')) return false
      const celdas = parsearFilasTabla(linea)
      return celdas.length >= 2 && celdas.every((c: string) => /^[\s\-:]*$/.test(c))
    }
    const esFilaTabla = (linea: string) => {
      if (!linea.includes('|')) return false
      const celdas = parsearFilasTabla(linea)
      return celdas.length >= 2
    }

    type BloqueParrafo = { tipo: 'parrafo'; texto: string }
    type BloqueTabla = { tipo: 'tabla'; filas: string[][] }
    type Bloque = BloqueParrafo | BloqueTabla

    const lineasRespuesta = respuestaprompt
      ? respuestaprompt.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      : []
    if (lineasRespuesta.length === 0 && respuestaprompt) lineasRespuesta.push('(Sin contenido)')

    const bloquesRespuesta: Bloque[] = []
    let filasAcum: string[][] = []
    const flushTablaResp = () => {
      if (filasAcum.length > 0) {
        bloquesRespuesta.push({ tipo: 'tabla', filas: [...filasAcum] })
        filasAcum = []
      }
    }
    for (const linea of lineasRespuesta) {
      if (esLineaSeparadorTabla(linea)) continue
      if (esFilaTabla(linea)) {
        filasAcum.push(parsearFilasTabla(linea))
      } else {
        flushTablaResp()
        bloquesRespuesta.push({ tipo: 'parrafo', texto: linea })
      }
    }
    flushTablaResp()

    const escaparXML = (s: string) => {
      if (!s) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    const szParrafo = '24'
    const szTabla = '24'
    const TBL_W = '10000'
    let respuestapromptXML = ''
    for (const bloque of bloquesRespuesta) {
      if (bloque.tipo === 'parrafo') {
        const t = escaparXML(bloque.texto || ' ')
        respuestapromptXML += `<w:p><w:pPr><w:rPr><w:sz w:val="${szParrafo}"/><w:szCs w:val="${szParrafo}"/></w:rPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:sz w:val="${szParrafo}"/><w:szCs w:val="${szParrafo}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
      } else {
        const numCols = Math.max(1, ...bloque.filas.map((f: string[]) => f.length))
        bloque.filas.forEach((f: string[]) => {
          while (f.length < numCols) f.push('')
        })
        const COL_W = String(Math.floor(10000 / numCols))
        const gridCols = Array(numCols).fill(`<w:gridCol w:w="${COL_W}"/>`).join('')
        let tbl = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="333333"/><w:left w:val="single" w:sz="4" w:color="333333"/><w:bottom w:val="single" w:sz="4" w:color="333333"/><w:right w:val="single" w:sz="4" w:color="333333"/><w:insideH w:val="single" w:sz="4" w:color="333333"/><w:insideV w:val="single" w:sz="4" w:color="333333"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>`
        bloque.filas.forEach((fila: string[], idx: number) => {
          const isHeader = idx === 0
          const bold = isHeader ? '<w:b/>' : ''
          tbl += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
          fila.forEach((celda: string) => {
            const text = escaparXML(celda || ' ')
            tbl += `<w:tc><w:tcPr><w:tcW w:w="${COL_W}" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="4" w:color="333333"/><w:left w:val="single" w:sz="4" w:color="333333"/><w:bottom w:val="single" w:sz="4" w:color="333333"/><w:right w:val="single" w:sz="4" w:color="333333"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="60"/><w:rPr><w:sz w:val="${szTabla}"/><w:szCs w:val="${szTabla}"/>${bold}</w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="${szTabla}"/><w:szCs w:val="${szTabla}"/>${bold}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`
          })
          tbl += '</w:tr>'
        })
        tbl += '</w:tbl>'
        respuestapromptXML += tbl
      }
    }

    const data = {
      area,
      grado,
      titulosesion: tituloSesion,
      titulodesesion: tituloSesion,
      proposito,
      competencia,
      capacidad,
      evidencia,
      criterios,
      saber1,
      saber2,
      saber3,
      respuestaprompt: respuestapromptXML ? RESPUESTAPROMPT_PLACEHOLDER : respuestaprompt,
      duracion,
      desarrolloantes,
      desarrollodurante,
      desarrollodespues
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}. Colócala en la carpeta templates.` },
        { status: 404 }
      )
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })
    doc.render(data)

    if (respuestapromptXML) {
      try {
        const zipOut = doc.getZip()
        const documentFile = zipOut.files['word/document.xml']
        if (documentFile) {
          let xmlContent = documentFile.asText()
          let idx = xmlContent.indexOf(RESPUESTAPROMPT_PLACEHOLDER)
          if (idx === -1) idx = xmlContent.indexOf('{{respuestaprompt}}')
          if (idx !== -1) {
            let paraStart = -1
            for (let i = idx; i >= 0; i--) {
              if (xmlContent.substring(i, i + 4) === '<w:p') {
                const ch = xmlContent.charAt(i + 4)
                if (ch === ' ' || ch === '>') { paraStart = i; break }
              }
            }
            const paraEnd = xmlContent.indexOf('</w:p>', idx)
            if (paraStart !== -1 && paraEnd !== -1 && paraEnd > paraStart) {
              xmlContent = xmlContent.substring(0, paraStart) + respuestapromptXML + xmlContent.substring(paraEnd + 6)
              zipOut.file('word/document.xml', xmlContent)
            }
          }
        }
      } catch (err) {
        console.error('Error al insertar respuestaprompt (párrafos+tablas) en documento ficha:', err)
      }
    }

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    const ts = Date.now()
    const baseName = `Ficha_Aprendizaje_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`
    const areaSlug = (area || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')

    const formatoJson = body.formato === 'json'

    if (formatoJson) {
      const respuestaBuffer = respuestaprompt
        ? await construirWordDesdeRespuestaGpt(respuestaprompt)
        : Buffer.alloc(0)
      const promptBuffer = await renderPromptFichaDocx(sesion)
      const saberesDesdeSesion = parsearSaberesSesion(sesion.saberes)
      const saberesVista =
        saberesDesdeSesion.length > 0
          ? saberesDesdeSesion
          : [saber1, saber2, saber3].filter(Boolean)

      return NextResponse.json({
        from: fichaDesdeGuardado ? 'saved' : 'generated',
        vista: {
          sesionId,
          numeroSesion: sesion.numeroSesion,
          tituloSesion: tituloSesion,
          tituloDesesion: tituloSesion,
          area,
          grado,
          docente: (u.docente ?? '').trim(),
          proposito,
          competencia,
          capacidad,
          evidencia,
          criterios,
          saber1: saberesDesdeSesion[0] || saber1,
          saber2: saberesDesdeSesion[1] || saber2,
          saber3: saberesDesdeSesion[2] || saber3,
          saberes: saberesVista,
          respuestaprompt
        },
        documento: {
          fileName: fileNameDocx,
          docxBase64: Buffer.from(buffer as Buffer).toString('base64')
        },
        prompt: {
          fileName: `PROMPT_FICHA_${areaSlug}_S${sesion.numeroSesion ?? sesionId}_${ts}.docx`,
          docxBase64: Buffer.from(promptBuffer).toString('base64')
        },
        respuesta: respuestaprompt
          ? {
              fileName: `RESPUESTA_IA_FICHA_${areaSlug}_S${sesion.numeroSesion ?? sesionId}_${ts}.docx`,
              docxBase64: Buffer.from(respuestaBuffer).toString('base64')
            }
          : undefined
      })
    }

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`,
        'X-Ficha-From': fichaDesdeGuardado ? 'saved' : 'generated'
      }
    })
  } catch (error) {
    console.error('Error en generate-document-ficha:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar el documento de ficha de aprendizaje', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
