import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx'
import { respuestaPromptABloques } from '@/lib/respuesta-prompt-word'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { tableText, fileName } = await request.json()

    if (typeof tableText !== 'string' || !tableText.trim()) {
      return NextResponse.json(
        { error: 'No hay respuesta de GPT para convertir a Word' },
        { status: 400 }
      )
    }

    const bloques = respuestaPromptABloques(tableText)

    const children: (Paragraph | Table)[] = []
    for (const bloque of bloques) {
      if (bloque.tipo === 'parrafo') {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: bloque.texto, size: 20 })],
            spacing: { after: 120 }
          })
        )
      } else {
        const numCols = Math.max(...bloque.filas.map((f) => f.length), 1)
        const filas = bloque.filas.map(
          (fila) =>
            new TableRow({
              children: Array.from({ length: numCols }, (_, i) => {
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: fila[i] ?? '', size: 18 })]
                    })
                  ],
                  width: { size: Math.floor(100 / numCols), type: WidthType.PERCENTAGE }
                })
              })
            })
        )
        children.push(
          new Table({
            rows: filas,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        )
        children.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      }
    }

    if (children.length === 0) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: tableText, size: 20 })] })
      )
    }

    const doc = new Document({
      sections: [{ properties: {}, children }]
    })
    const buffer = await Packer.toBuffer(doc)

    const nombre =
      typeof fileName === 'string' && fileName.trim()
        ? fileName.trim()
        : `RESPUESTA_GPT_${Date.now()}.docx`

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nombre)}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error al generar Word de respuesta GPT:', error)
    const mensaje = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el Word de la respuesta de GPT',
        details: process.env.NODE_ENV === 'development' ? mensaje : undefined
      },
      { status: 500 }
    )
  }
}
