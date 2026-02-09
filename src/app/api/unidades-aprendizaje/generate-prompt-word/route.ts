import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'

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

    // Validar que el grado esté presente
    const gradoId = formData.gradoId
    if (!gradoId || parseInt(gradoId) < 1 || parseInt(gradoId) > 5) {
      return NextResponse.json(
        { error: 'Grado inválido. Debe ser entre 1 y 5' },
        { status: 400 }
      )
    }

    // Leer directamente el Word del prompt
    const promptWordPath = path.join(process.cwd(), 'templates', 'PROMT_UNIDAD DE APRENDIZAJE.docx')
    if (!fs.existsSync(promptWordPath)) {
      return NextResponse.json(
        { error: 'Archivo de prompt Word no encontrado' },
        { status: 404 }
      )
    }

    const wordBuffer = fs.readFileSync(promptWordPath)
    const result = await mammoth.extractRawText({ buffer: wordBuffer })
    let promptText = result.value || ''

    // Obtener competencias con capacidades y desempeños para generar las tablas
    let competenciasConDatos: Array<{
      competenciaNumero: string;
      competenciaDescripcion: string;
      capacidades: Array<{
        capacidadDescripcion: string;
        desempenios: string[];
      }>;
    }> = []

    const competenciasParaPrompt: Array<{ descripcion: string; numCapacidades: number }> = []
    
    try {
      const areaIdParaPrompt = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
      const gradoIdParaPrompt = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
      
      if (areaIdParaPrompt && gradoIdParaPrompt) {
        const competenciasPrompt = await prisma.competencia.findMany({
          where: {
            idarea: parseInt(String(areaIdParaPrompt)),
            idgrado: parseInt(String(gradoIdParaPrompt)),
            transversal: false // Solo competencias no transversales
          },
          include: {
            capacidades: {
              include: {
                desempenios: {
                  orderBy: {
                    id: 'asc'
                  }
                }
              },
              orderBy: {
                id: 'asc'
              }
            }
          },
          orderBy: {
            numeroCompetencia: 'asc'
          }
        })

        competenciasPrompt.forEach(comp => {
          // Para el prompt simple (solo lista)
          competenciasParaPrompt.push({
            descripcion: comp.descripcion,
            numCapacidades: comp.capacidades.length
          })

          // Para las tablas (datos completos)
          const capacidadesData = comp.capacidades.map(cap => ({
            capacidadDescripcion: cap.descripcion,
            desempenios: cap.desempenios.map(des => des.descripcion)
          }))

          competenciasConDatos.push({
            competenciaNumero: `COMPETENCIA ${comp.numeroCompetencia || comp.id}`,
            competenciaDescripcion: comp.descripcion,
            capacidades: capacidadesData
          })
        })
      }
    } catch (error) {
      // Error silencioso
    }

    // Preparar datos para el prompt
    const promptData = {
      area: formData.area || '',
      grado: formData.grado || '',
      ciclo: formData.ciclo || '',
      tipoie: formData.tipoIE === '1' ? 'Pública' : formData.tipoIE === '2' ? 'Privado' : '',
      situacionsignficativa: formData.situacionSignificativa || '',
      numsesiones: formData.sesiones?.length?.toString() || '0',
      producto: formData.producto || '',
      competencias: competenciasParaPrompt.length > 0 ? competenciasParaPrompt : []
    }

    // Reemplazar variables manualmente
    promptText = promptText.replace(/\{\{area\}\}/g, promptData.area)
    promptText = promptText.replace(/\{\{grado\}\}/g, promptData.grado)
    promptText = promptText.replace(/\{\{ciclo\}\}/g, promptData.ciclo)
    promptText = promptText.replace(/\{\{tipoie\}\}/g, promptData.tipoie)
    promptText = promptText.replace(/\{\{situacionsignficativa\}\}/g, promptData.situacionsignficativa)
    promptText = promptText.replace(/\{\{numsesiones\}\}/g, promptData.numsesiones)
    promptText = promptText.replace(/\{\{producto\}\}/g, promptData.producto)

    // Reemplazar loop de competencias
    if (promptData.competencias.length > 0) {
      const competenciasLista = promptData.competencias.map(c => `• ${c.descripcion}: ${c.numCapacidades} capacidades`).join('\n')
      promptText = promptText.replace(/\{\{#competencias\}\}[\s\S]*?\{\{\/competencias\}\}/g, competenciasLista)
    } else {
      promptText = promptText.replace(/\{\{#competencias\}\}[\s\S]*?\{\{\/competencias\}\}/g, '• No se encontraron competencias')
    }

    // Detectar si hay placeholder {{matriz}} para reemplazar con tablas
    const tieneMatriz = promptText.includes('{{matriz}}')

    // Función para generar tablas de competencias, capacidades y desempeños
    const generarTablasMatriz = (): (Paragraph | Table)[] => {
      const elementos: (Paragraph | Table)[] = []

      if (competenciasConDatos.length === 0) {
        elementos.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'No se encontraron competencias para mostrar en la matriz.',
                size: 22,
                italics: true,
                color: '666666',
              })
            ],
            spacing: { after: 200 },
          })
        )
        return elementos
      }

      competenciasConDatos.forEach((competencia, compIdx) => {
        // Título de la competencia
        elementos.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${competencia.competenciaNumero}: ${competencia.competenciaDescripcion}`,
                size: 24,
                bold: true,
                color: '0066CC',
              })
            ],
            spacing: { after: 150, before: compIdx > 0 ? 300 : 0 },
          })
        )

        // Crear tabla con columnas: COMPETENCIA | CAPACIDADES | DESEMPEÑOS PRECISADOS
        const filasTabla: TableRow[] = []

        // Encabezado de la tabla
        filasTabla.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'COMPETENCIA',
                        bold: true,
                        size: 22,
                        color: 'FFFFFF',
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                  })
                ],
                shading: {
                  fill: '4472C4',
                  type: ShadingType.SOLID,
                },
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'CAPACIDADES',
                        bold: true,
                        size: 22,
                        color: 'FFFFFF',
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                  })
                ],
                shading: {
                  fill: '4472C4',
                  type: ShadingType.SOLID,
                },
                width: { size: 35, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'DESEMPEÑOS PRECISADOS',
                        bold: true,
                        size: 22,
                        color: 'FFFFFF',
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                  })
                ],
                shading: {
                  fill: '4472C4',
                  type: ShadingType.SOLID,
                },
                width: { size: 35, type: WidthType.PERCENTAGE },
              }),
            ],
          })
        )

        // Agregar filas para cada capacidad con sus desempeños
        competencia.capacidades.forEach((capacidad, capIdx) => {
          const desempeniosTexto = capacidad.desempenios
            .map((des, idx) => `${idx + 1}. ${des}`)
            .join('\n')

          filasTabla.push(
            new TableRow({
              children: [
                // Columna COMPETENCIA (solo en la primera fila de cada competencia, vacías en las siguientes)
                new TableCell({
                  children: capIdx === 0 ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: competencia.competenciaDescripcion,
                          size: 20,
                          bold: true,
                        })
                      ],
                    })
                  ] : [
                    new Paragraph({
                      children: [],
                    })
                  ],
                }),
                // Columna CAPACIDADES
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: capacidad.capacidadDescripcion,
                          size: 20,
                        })
                      ],
                    })
                  ],
                }),
                // Columna DESEMPEÑOS
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: desempeniosTexto || 'No hay desempeños',
                          size: 20,
                        })
                      ],
                    })
                  ],
                }),
              ],
            })
          )
        })

        // Agregar la tabla
        elementos.push(
          new Table({
            rows: filasTabla,
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          })
        )

        // Espacio después de cada tabla
        elementos.push(
          new Paragraph({
            children: [],
            spacing: { after: 200 },
          })
        )
      })

      return elementos
    }

    // Función auxiliar para convertir texto en párrafos
    const convertirTextoAParrafos = (texto: string): Paragraph[] => {
      const parrafos: Paragraph[] = []
      const lineas = texto.split('\n')
      
      for (const linea of lineas) {
        const lineaTrim = linea.trim()
        
        // Si la línea está vacía, crear un párrafo vacío
        if (lineaTrim === '') {
          parrafos.push(
            new Paragraph({
              children: [],
              spacing: { after: 100 },
            })
          )
        } else {
          // Detectar títulos o encabezados
          const esTitulo = /^[📌🎯👉🆕\d]/.test(lineaTrim) || 
                          lineaTrim.match(/^[A-ZÁÉÍÓÚÑ\s]{10,}$/) !== null ||
                          lineaTrim.includes('CAPÍTULO') ||
                          lineaTrim.includes('INDICACIONES')
          
          parrafos.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: lineaTrim,
                  size: esTitulo ? 24 : 22,
                  bold: esTitulo,
                  color: esTitulo ? '0066CC' : '000000',
                })
              ],
              spacing: {
                after: esTitulo ? 200 : 160,
                before: esTitulo ? 200 : 0,
              }
            })
          )
        }
      }
      
      return parrafos
    }

    // Convertir el prompt en párrafos para el documento Word
    const parrafos: (Paragraph | Table)[] = []
    
    // Dividir el texto en partes: antes de {{matriz}}, {{matriz}}, y después de {{matriz}}
    if (tieneMatriz) {
      const partes = promptText.split('{{matriz}}')
      const textoAntes = partes[0] || ''
      const textoDespues = partes[1] || ''
      
      // Convertir texto antes de {{matriz}}
      if (textoAntes.trim()) {
        parrafos.push(...convertirTextoAParrafos(textoAntes))
      }
      
      // Agregar las tablas de la matriz
      const tablasMatriz = generarTablasMatriz()
      parrafos.push(...tablasMatriz)
      
      // Convertir texto después de {{matriz}}
      if (textoDespues.trim()) {
        parrafos.push(...convertirTextoAParrafos(textoDespues))
      }
    } else {
      // Si no hay {{matriz}}, convertir todo el texto normalmente
      parrafos.push(...convertirTextoAParrafos(promptText))
    }

    // Si no hay párrafos, crear uno con el texto completo
    if (parrafos.length === 0) {
      parrafos.push(
        new Paragraph({
          children: [
            new TextRun({
              text: promptText,
              size: 22,
            })
          ]
        })
      )
    }

    // Crear el documento Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Título del documento
            new Paragraph({
              children: [
                new TextRun({
                  text: 'PROMPT DINÁMICO - UNIDAD DE APRENDIZAJE',
                  bold: true,
                  size: 28,
                  color: '0066CC',
                })
              ],
              spacing: { after: 400 },
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [],
              spacing: { after: 200 },
            }),
            // Contenido del prompt
            ...parrafos,
          ],
        },
      ],
    })

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc)

    // Generar nombre del archivo
    const areaNombre = (formData.area || 'COMUNICACION').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const gradoNombre = (formData.grado || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const unidadNombre = formData.unidad || '0'
    const fileName = `prompt-dinamico-${unidadNombre}-${areaNombre}-${gradoNombre}-${Date.now()}.docx`

    // Devolver el documento Word
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Error al generar el Word del prompt', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    )
  }
}

