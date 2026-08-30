import { Document, Packer, Paragraph, TextRun } from 'docx'

export type RespuestaIAPlanUnidad = {
  unidad: number
  respuestaCompleta: string
  tituloExtraido?: string
  situacionParseada?: string
}

/** Word de depuración con el texto crudo que devolvió la IA por unidad. */
export async function generarDocxRespuestasIAPlanAnual(
  respuestas: RespuestaIAPlanUnidad[],
  meta?: { area?: string; grado?: string }
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Respuestas crudas de la IA — Plan anual (situación significativa)',
          bold: true,
          size: 28
        })
      ]
    })
  ]

  if (meta?.area || meta?.grado) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [meta.area, meta.grado].filter(Boolean).join(' — '),
            size: 22
          })
        ]
      })
    )
  }

  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))

  for (const r of respuestas) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `UNIDAD ${r.unidad}`, bold: true, size: 24 })]
      })
    )

    if (r.tituloExtraido) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Título:', bold: true, size: 20 })]
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: r.tituloExtraido, size: 20 })]
        })
      )
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '--- Respuesta completa de la IA (sin procesar) ---',
            bold: true,
            size: 20
          })
        ]
      })
    )

    for (const line of r.respuestaCompleta.split(/\r?\n/)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line || ' ', size: 20 })]
        })
      )
    }

    if (r.situacionParseada) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '--- Texto que se inserta en la plantilla (después del parser) ---',
              bold: true,
              size: 20
            })
          ]
        })
      )
      children.push(
        new Paragraph({
          children: [new TextRun({ text: r.situacionParseada, size: 20 })]
        })
      )
    }

    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  })

  return Packer.toBuffer(doc)
}
