import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// En función de la duración (minutos): inicio, desarrollo, cierre
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

    const { formData, sesionData } = await request.json()

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'PROMT DE SESION DE PROBADO..docx'
    )

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada: PROMT DE SESION DE PROBADO..docx' },
        { status: 404 }
      )
    }

    const duracion = String(formData.duracion || '').trim()
    const tiempos = TIEMPOS_POR_DURACION[duracion] || TIEMPOS_POR_DURACION['45']

    const numsesion = sesionData?.numeroSesion ?? formData.numsesion ?? '1'
    const titulosesion = sesionData?.titulo ?? formData.tituloSesion ?? ''

    // {{competencia}}, {{capacidades}}, {{desempenios}} desde el campo sesiones de la unidad (sesión seleccionada)
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

    // {{procesosdidacticos}}: desde procesodidactico por área, agrupado por competencia_proceso, listando descripcion
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
        for (const [competencia, descripciones] of byCompetencia) {
          lineas.push(`• ${competencia}`)
          for (const d of descripciones) {
            lineas.push(`  ◦ ${d}`)
          }
        }
        procesosdidacticos = lineas.join('\n')
      } catch (e) {
        console.error('Error al cargar procesos didácticos:', e)
      }
    }

    // {{enfoquestransversales}} y {{evidencia}} desde unidadaprendizaje (enfoques_transversales y sesiones[].evidencias)
    let enfoquestransversales = ''
    let evidencia = ''
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
          select: { enfoquesTransversales: true, sesiones: true }
        })
        const rawEnfoques = unidad?.enfoquesTransversales
        if (rawEnfoques && Array.isArray(rawEnfoques) && rawEnfoques.length > 0) {
          const items = rawEnfoques as Array<{ enfoque?: string }>
          const unicos = new Set<string>()
          for (const item of items) {
            const e = (item.enfoque || '').trim()
            if (e) unicos.add(e)
          }
          enfoquestransversales = Array.from(unicos).join('\n')
        }
        const rawSesiones = unidad?.sesiones
        if (rawSesiones && Array.isArray(rawSesiones)) {
          const sesionesArr = rawSesiones as Array<{ evidencias?: string }>
          const idx = Math.max(0, parseInt(String(numsesion), 10) - 1)
          const sesion = sesionesArr[idx]
          if (sesion && typeof sesion.evidencias === 'string') {
            evidencia = limpiarBr(sesion.evidencias)
          }
        }
      } catch (e) {
        console.error('Error al cargar enfoques transversales o evidencias:', e)
      }
    }

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
      evidencia,
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    })

    doc.render(data)

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const fileName = `Prompt_Sesion_${formData.area || 'documento'}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '')

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Error al generar documento de prompt:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar el documento de prompt', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
