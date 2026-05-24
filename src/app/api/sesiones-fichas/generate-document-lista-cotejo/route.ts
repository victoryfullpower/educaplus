import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { datosListaCotejoDesdeSesion } from '@/lib/lista-cotejo-sesion'

export const dynamic = 'force-dynamic'

const TEMPLATE_NAME = 'Lista de Cotejo.docx'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const sesionId =
      body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    const forceRegenerate = !!body.forceRegenerate

    if (sesionId == null || Number.isNaN(sesionId)) {
      return NextResponse.json({ error: 'sesionId es requerido' }, { status: 400 })
    }

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true, listaCotejo: true }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    let data: Awaited<ReturnType<typeof datosListaCotejoDesdeSesion>>
    const guardada = !forceRegenerate ? sesion.listaCotejo : null

    if (guardada) {
      data = {
        area: (guardada.area ?? '').trim(),
        grado: (guardada.grado ?? '').trim(),
        docente: (guardada.docente ?? '').trim(),
        ciclo: (guardada.ciclo ?? '').trim(),
        titulosesion: (guardada.titulosesion ?? '').trim(),
        proposito: (guardada.proposito ?? '').trim(),
        competencia: (guardada.competencia ?? '').trim(),
        capacidades: (guardada.capacidades ?? '').trim(),
        evidencia: (guardada.evidencia ?? '').trim(),
        criterio1: (guardada.criterio1 ?? '').trim(),
        criterio2: (guardada.criterio2 ?? '').trim(),
        criterio3: (guardada.criterio3 ?? '').trim(),
        criterio4: (guardada.criterio4 ?? '').trim()
      }
    } else {
      data = await datosListaCotejoDesdeSesion(sesion)
      try {
        await prisma.listaCotejo.upsert({
          where: { idsesion: sesionId },
          create: { idsesion: sesionId, ...data },
          update: { ...data }
        })
      } catch (err) {
        console.error('Error al guardar ListaCotejo:', err)
      }
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}` },
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

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    const areaSlug = (data.area || 'lista').replace(/\s+/g, '_')
    const num = sesion.numeroSesion
    const fileName = `Lista_Cotejo_Sesion_${num}_${areaSlug}.docx`

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Lista-Cotejo-From': guardada ? 'saved' : 'sesion'
      }
    })
  } catch (error) {
    console.error('Error en generate-document-lista-cotejo:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar la lista de cotejo',
        details:
          process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
