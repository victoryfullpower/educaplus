import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { prisma } from '@/lib/prisma'
import { resolverNumeroSesionesForm } from '@/lib/unidad-sesiones-por-area'
import {
  generarCompetenciasBdTexto,
  generarMatrizTablasWordXml,
  insertarMatrizEnDocumentoWord,
  MATRIZ_UNIDAD_PLACEHOLDER,
  type CompetenciaMatrizUnidad
} from '@/lib/matriz-unidad-prompt'
import {
  nombreAreaDesdeForm,
  resolverPromptUnidadPorArea
} from '@/lib/prompt-unidad-por-area'

export const dynamic = 'force-dynamic'

type CompetenciaPrompt = { descripcion: string; numCapacidades: number }

async function cargarCompetenciasPrompt(formData: Record<string, unknown>): Promise<{
  competenciasParaPrompt: CompetenciaPrompt[]
  competenciasConDatos: CompetenciaMatrizUnidad[]
}> {
  const competenciasParaPrompt: CompetenciaPrompt[] = []
  const competenciasConDatos: CompetenciaMatrizUnidad[] = []

  const areaIdParaPrompt =
    formData.areaId ||
    (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
  const gradoIdParaPrompt =
    formData.gradoId ||
    (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)

  if (!areaIdParaPrompt || !gradoIdParaPrompt) {
    return { competenciasParaPrompt, competenciasConDatos }
  }

  try {
    const competenciasPrompt = await prisma.competencia.findMany({
      where: {
        idarea: parseInt(String(areaIdParaPrompt), 10),
        idgrado: parseInt(String(gradoIdParaPrompt), 10),
        transversal: false
      },
      include: {
        capacidades: {
          include: {
            desempenios: { orderBy: { id: 'asc' } }
          },
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { numeroCompetencia: 'asc' }
    })

    for (const comp of competenciasPrompt) {
      competenciasParaPrompt.push({
        descripcion: comp.descripcion,
        numCapacidades: comp.capacidades.length
      })
      competenciasConDatos.push({
        competenciaNumero: `COMPETENCIA ${comp.numeroCompetencia || comp.id}`,
        competenciaDescripcion: comp.descripcion,
        capacidades: comp.capacidades.map((cap) => ({
          capacidadDescripcion: cap.descripcion,
          desempenios: cap.desempenios.map((des) => des.descripcion)
        }))
      })
    }
  } catch {
    // Sin competencias de BD
  }

  return { competenciasParaPrompt, competenciasConDatos }
}

function datosPromptUnidad(
  formData: Record<string, unknown>,
  competenciasParaPrompt: CompetenciaPrompt[]
) {
  const numsesiones = String(resolverNumeroSesionesForm(formData) || 0)
  return {
    area: String(formData.area ?? ''),
    grado: String(formData.grado ?? ''),
    ciclo: String(formData.ciclo ?? ''),
    tipoie:
      formData.tipoIE === '1' ? 'Pública' : formData.tipoIE === '2' ? 'Privado' : '',
    situacionsignficativa: String(formData.situacionSignificativa ?? ''),
    numsesiones,
    producto: String(formData.producto ?? ''),
    titulodeunidad: String(
      formData.tituloUnidad ||
        formData.titulodeunidad ||
        (formData.unidad && formData.area
          ? `Unidad ${formData.unidad}: ${formData.area}`
          : '')
    ),
    campotematico: String(formData.campoTematico ?? formData.campotematico ?? ''),
    competencias:
      competenciasParaPrompt.length > 0
        ? competenciasParaPrompt.map((c) => ({
            descripcion: c.descripcion,
            numCapacidades: String(c.numCapacidades)
          }))
        : [{ descripcion: 'No se encontraron competencias', numCapacidades: '0' }],
    competenciasdelabd: generarCompetenciasBdTexto(competenciasParaPrompt),
    matriz: MATRIZ_UNIDAD_PLACEHOLDER
  }
}

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

    const gradoId = formData.gradoId
    if (!gradoId || parseInt(String(gradoId), 10) < 1 || parseInt(String(gradoId), 10) > 5) {
      return NextResponse.json(
        { error: 'Grado inválido. Debe ser entre 1 y 5' },
        { status: 400 }
      )
    }

    const areaParaPrompt = nombreAreaDesdeForm(formData)
    const promptResuelto = resolverPromptUnidadPorArea(areaParaPrompt)
    const promptWordPath = promptResuelto.path
    if (!promptWordPath || !fs.existsSync(promptWordPath)) {
      return NextResponse.json(
        {
          error: `No se encontró prompt Word para el área "${areaParaPrompt || '(sin área)'}". Coloca el archivo en templates/prompstUA con el nombre del área.`
        },
        { status: 404 }
      )
    }

    const { competenciasParaPrompt, competenciasConDatos } =
      await cargarCompetenciasPrompt(formData)
    const matrizTablaXml = generarMatrizTablasWordXml(competenciasConDatos)
    const promptData = datosPromptUnidad(formData, competenciasParaPrompt)

    const content = fs.readFileSync(promptWordPath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })
    doc.render(promptData)
    insertarMatrizEnDocumentoWord(doc.getZip(), matrizTablaXml)
    const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const areaNombre = String(formData.area || 'COMUNICACION')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
    const gradoNombre = String(formData.grado || '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
    const unidadNombre = formData.unidad || '0'
    const fileName = `PROMPT_UNIDAD_${unidadNombre}_${areaNombre}_${gradoNombre}_${Date.now()}.docx`

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el Word del prompt',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
