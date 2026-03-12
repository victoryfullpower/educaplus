import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Plantilla: FICHA DE APRENDIZAJE.docx - Llaves: grado, titulodesesion, proposito, competencia, capacidad, evidencia, criterios, saber1, saber2, saber3, respuestaprompt (párrafos + tablas como en Respuesta prompt) */
const TEMPLATE_NAME = 'FICHA DE APRENDIZAJE.docx'
const PROMPT_TEMPLATE_NAME = 'PROMT_Ficha.docx'
const MODELO_OBLIGATORIO = 'gpt-5-mini'
const RESPUESTAPROMPT_PLACEHOLDER = 'RESPUESTAPROMPT_FICHA_PLACEHOLDER'

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

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true, fichaAprendizaje: true }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje
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
      duracion = (fichaGuardada.duracion ?? '').trim()
      desarrolloantes = (fichaGuardada.desarrolloantes ?? '').trim()
      desarrollodurante = (fichaGuardada.desarrollodurante ?? '').trim()
      desarrollodespues = (fichaGuardada.desarrollodespues ?? '').trim()
      respuestaprompt = (fichaGuardada.respuestaprompt ?? '').trim()
    } else {
      const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
        ? sesion.competenciasSeleccionadas as string[]
        : []
      competencia = competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''
      const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
        ? sesion.capacidadesSeleccionadas as string[]
        : []
      capacidad = capacidadesArr
        .filter((c: string) => c && String(c).trim())
        .map((c: string) => `- ${limpiarBr(c)}`)
        .join('\n')
      area = (sesion.area ?? u.area ?? '').trim()
      grado = (sesion.grado ?? u.grado ?? '').trim()
      const duracionRaw = (sesion.duracion ?? u.duracion ?? '').trim()
      duracion = duracionRaw ? `${duracionRaw} minutos` : ''
      tituloSesion = (sesion.titulo ?? '').trim()
      proposito = sinPrefijoProposito(sesion.proposito ?? '')
      evidencia = limpiarBr(sesion.evidencias ?? '')
      criterios = limpiarBr(sesion.criterios ?? '')
      const saberesTexto = limpiarBr(sesion.saberes ?? '')
      const saberesPartes = saberesTexto.split(/\n+/).map((s: string) => s.trim()).filter(Boolean)
      saber1 = saberesPartes[0] ?? ''
      saber2 = saberesPartes[1] ?? ''
      saber3 = saberesPartes[2] ?? ''
      desarrolloantes = (sesion.desarrolloantes ?? '').trim()
      desarrollodurante = (sesion.desarrollodurante ?? '').trim()
      desarrollodespues = (sesion.desarrollodespues ?? '').trim()

      if (process.env.OPENAI_API_KEY) {
      const dataPrompt = {
        area,
        grado,
        titulosesion: (sesion.titulo ?? '').trim(),
        proposito: sinPrefijoProposito(sesion.proposito ?? ''),
        competencia,
        capacidad,
        evidencia: limpiarBr(sesion.evidencias ?? ''),
        criterios: limpiarBr(sesion.criterios ?? ''),
        duracion,
        desarrolloantes: (sesion.desarrolloantes ?? '').trim(),
        desarrollodurante: (sesion.desarrollodurante ?? '').trim(),
        desarrollodespues: (sesion.desarrollodespues ?? '').trim()
      }
      const promptTemplatePath = path.join(process.cwd(), 'templates', PROMPT_TEMPLATE_NAME)
      if (fs.existsSync(promptTemplatePath)) {
        try {
          const contentPrompt = fs.readFileSync(promptTemplatePath, 'binary')
          const zipPrompt = new PizZip(contentPrompt)
          const templateDoc = new Docxtemplater(zipPrompt, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => ''
          })
          templateDoc.render(dataPrompt)
          const docxBufferPrompt = templateDoc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
          const extractResult = await mammoth.extractRawText({ buffer: docxBufferPrompt as Buffer })
          const promptText = (extractResult.value || '').trim()
          if (promptText) {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            let completion = await openaiClient.chat.completions.create({
              model: MODELO_OBLIGATORIO,
              messages: [
                { role: 'system' as const, content: 'Responde de forma clara y estructurada.' },
                { role: 'user' as const, content: promptText }
              ],
              top_p: 1,
              max_completion_tokens: 16384
            })
            let gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
            if (!gptResponse) {
              completion = await openaiClient.chat.completions.create({
                model: MODELO_OBLIGATORIO,
                messages: [
                  { role: 'system' as const, content: 'Responde de forma clara y estructurada.' },
                  { role: 'user' as const, content: promptText }
                ],
                top_p: 1,
                max_completion_tokens: 16384
              })
              gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
            }
            if (gptResponse) respuestaprompt = gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
          }
        } catch (err) {
          console.error('Error al obtener respuesta IA para respuestaprompt:', err)
        }
      }
    }
    }

    const parsearFilasTabla = (linea: string): string[] => {
      const partes = linea.split('|').map((c: string) => c.trim())
      if (partes.length <= 1) return []
      const sinExtremos = partes[0] === '' && partes[partes.length - 1] === '' ? partes.slice(1, -1) : partes
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

    if (!fichaGuardada && respuestaprompt) {
      try {
        await prisma.fichaAprendizaje.upsert({
          where: { idsesion: sesionId },
          create: {
            idsesion: sesionId,
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
            respuestaprompt,
            duracion,
            desarrolloantes,
            desarrollodurante,
            desarrollodespues
          },
          update: {
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
            respuestaprompt,
            duracion,
            desarrolloantes,
            desarrollodurante,
            desarrollodespues
          }
        })
      } catch (err) {
        console.error('Error al guardar FichaAprendizaje:', err)
      }
    }

    const ts = Date.now()
    const baseName = `Ficha_Aprendizaje_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`,
        'X-Ficha-From': fichaGuardada ? 'saved' : 'ia'
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
