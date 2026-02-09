import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

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

    // Leer el template Word
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
        return ''
      }
    })

    // Preparar datos para reemplazar en el template
    const data = {
      area: formData.area || '',
      grado: formData.grado || '',
      titulounidad: tituloUnidad || (formData.unidad && formData.area ? `Unidad ${formData.unidad}: ${formData.area}` : ''),
      situacion: formData.situacionSignificativa || '',
      enfoques: enfoquesTexto
    }

    // Reemplazar variables en el template
    doc.setData(data)
    doc.render()

    // Obtener el documento renderizado
    const zipAfterRender = doc.getZip()
    const buf = zipAfterRender.generate({ type: 'nodebuffer' })

    // Configurar headers para descarga
    const fileName = `prompt-enfoques-${formData.unidad || '0'}-${Date.now()}.docx`
    
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Error al generar prompt de enfoques:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar el prompt de enfoques', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}

