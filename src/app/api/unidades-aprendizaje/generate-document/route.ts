import { NextRequest, NextResponse } from 'next/server'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
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

    // Usar siempre la misma plantilla UNIDAD.docx (sin depender de grado ni especialidad)
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'gradosunidades',
      'UNIDAD.docx'
    )

    // Verificar que la plantilla existe
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: UNIDAD.docx` },
        { status: 404 }
      )
    }

    // Leer la plantilla
    let content = fs.readFileSync(templatePath, 'binary')
    let zip = new PizZip(content)
    
    let doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      },
      nullGetter: function(part) {
        return ''
      },
      errorLogging: true
    })

    // Obtener competencias desde el plan anual del usuario
    let competenciasTexto = ''
    let competenciaNumero = ''
    let estandaresTexto = ''
    let tituloUnidad = ''
    const competenciasArray: Array<{ competencianro: string; competenciadescripcion: string; estandares: string }> = []
    
    // Array para el prompt: lista de competencias con número de capacidades
    const competenciasParaPrompt: Array<{ descripcion: string; numCapacidades: number }> = []
    
    try {
      const userId = await getUserId(request)
      if (!userId) {
        return NextResponse.json(
          { error: 'No autenticado' },
          { status: 401 }
        )
      }

      // Obtener datos necesarios del formData
      const unidad = formData.unidad
      // Asegurarnos de obtener el ID del área, no el nombre
      const areaId = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
      // Asegurarnos de obtener el ID del grado, no el nombre
      const gradoId = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
      const anio = formData.anio || new Date().getFullYear()

      if (!unidad || !areaId || !gradoId) {
      } else {
        // Buscar el plan anual del usuario - probar diferentes formatos de búsqueda
        let planAnual = await prisma.planAnual.findFirst({
          where: {
            idusuario: userId,
            anio: parseInt(String(anio)),
            areaId: String(areaId),
            gradoId: String(gradoId)
          }
        })

        // Si no se encuentra, intentar con parseInt en los IDs
        if (!planAnual) {
          planAnual = await prisma.planAnual.findFirst({
            where: {
              idusuario: userId,
              anio: parseInt(String(anio)),
              areaId: String(parseInt(String(areaId))),
              gradoId: String(parseInt(String(gradoId)))
            }
          })
        }

        if (planAnual && planAnual.unidades) {
          // Parsear las unidades
          const unidades = Array.isArray(planAnual.unidades) 
            ? planAnual.unidades 
            : JSON.parse(planAnual.unidades as string)

          // Buscar la unidad específica
          const unidadNumero = parseInt(String(unidad), 10)
          let unidadData = null

          // Intentar buscar por índice primero
          if (Array.isArray(unidades) && unidades[unidadNumero]) {
            unidadData = unidades[unidadNumero]
          } else if (Array.isArray(unidades)) {
            // Si no está por índice, buscar por campo numeroUnidad o unidad
            unidadData = unidades.find((u: any) => 
              u.numeroUnidad === unidadNumero || 
              u.unidad === unidadNumero ||
              u.numero === unidadNumero
            )
          }

          // Extraer datos de la unidad (competencias y título)
          // El campo correcto es "competenciasSeleccionadas" según la estructura del plan anual
          if (unidadData) {
            // Obtener título de la unidad si existe
            if (unidadData.tituloUnidad) {
              tituloUnidad = unidadData.tituloUnidad
            }
            
            const competenciasField = unidadData.competenciasSeleccionadas || unidadData.competencias
            
            if (competenciasField) {
              let competenciasIds: number[] = []
              
              if (Array.isArray(competenciasField)) {
                competenciasIds = competenciasField
                  .map((id: string | number) => parseInt(String(id)))
                  .filter((id: number) => !isNaN(id))
              } else if (typeof competenciasField === 'string') {
                // Intentar parsear si es un string JSON
                try {
                  const parsed = JSON.parse(competenciasField)
                  if (Array.isArray(parsed)) {
                    competenciasIds = parsed
                      .map((id: string | number) => parseInt(String(id)))
                      .filter((id: number) => !isNaN(id))
                  }
                } catch (e) {
                }
              } else if (typeof competenciasField === 'number') {
                // Si es un solo número, convertirlo a array
                competenciasIds = [competenciasField]
              }

              if (competenciasIds.length > 0) {
                // Obtener detalles completos de las competencias desde la BD
                const competencias = await prisma.competencia.findMany({
                  where: { id: { in: competenciasIds } },
                  include: { 
                    area: true,
                    estandares: {
                      orderBy: { ordenamiento: 'asc' }
                    }
                  }
                })

                if (competencias.length > 0) {
                  // Para la descripción, combinamos todas las competencias
                  competenciasTexto = competencias.map(c => c.descripcion).join('; ')
                  // Para el número, tomamos el número de la primera competencia y le agregamos el prefijo "COMPETENCIA "
                  const numComp = competencias[0].numeroCompetencia?.toString() || ''
                  competenciaNumero = numComp ? `COMPETENCIA ${numComp}` : ''
                  
                  // Obtener todos los estándares de todas las competencias seleccionadas
                  const todosLosEstandares: Array<{ descripcion: string; ordenamiento: number }> = []
                  competencias.forEach(comp => {
                    comp.estandares.forEach(est => {
                      todosLosEstandares.push({
                        descripcion: est.descripcion,
                        ordenamiento: est.ordenamiento
                      })
                    })
                  })
                  
                  // Ordenar por ordenamiento
                  todosLosEstandares.sort((a, b) => a.ordenamiento - b.ordenamiento)
                  
                  // Formatear con números correlativos y saltos de línea: "1. descripción\n2. descripción\n..."
                  estandaresTexto = todosLosEstandares
                    .map((est, index) => `${index + 1}. ${est.descripcion}`)
                    .join('\n')
                  
                  // Crear array de competencias para el loop
                  competencias.forEach((comp, idx) => {
                    const estandaresFormateados = comp.estandares
                      .map((est, index) => `${String.fromCharCode(65 + index)}. ${est.descripcion}`)
                      .join('\n')
                    
                    const competenciaData = {
                      competencianro: `COMPETENCIA ${comp.numeroCompetencia}`,
                      competenciadescripcion: comp.descripcion,
                      estandares: estandaresFormateados
                    }
                    
                    competenciasArray.push(competenciaData)
                  })
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // Error silencioso
    }

    // Obtener TODAS las competencias relacionadas con área, grado y nivel (NO desde plan anual ni formData)
    // IMPORTANTE: Para {{competencia}}, SIEMPRE buscar todas las competencias, ignorando las del plan anual
    console.log(`🔍 [{{competencia}}] ========== INICIO: OBTENCIÓN DE COMPETENCIAS ==========`)
    console.log(`📊 [{{competencia}}] Estado inicial: competenciasArray tiene ${competenciasArray.length} competencia(s) desde plan anual`)
    console.log(`⚠️ [{{competencia}}] IGNORANDO competencias del plan anual. Buscando TODAS las competencias por área/grado/nivel...`)
    
    // LIMPIAR el array para buscar todas las competencias (no solo las del plan anual)
    competenciasArray.length = 0
    
    const areaIdParaCompetencias = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
    const gradoIdParaCompetencias = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
    
    console.log(`📋 [{{competencia}}] Datos del formulario:`, {
      areaId: formData.areaId,
      area: formData.area,
      gradoId: formData.gradoId,
      grado: formData.grado
    })
    
    if (areaIdParaCompetencias && gradoIdParaCompetencias) {
        try {
          const areaIdParsed = parseInt(String(areaIdParaCompetencias))
          const gradoIdParsed = parseInt(String(gradoIdParaCompetencias))
          
          // Obtener el nivel "Secundaria" automáticamente
          const nivelSecundaria = await prisma.nivel.findFirst({
            where: {
              descripcion: {
                contains: 'Secundaria',
                mode: 'insensitive'
              }
            }
          })
          
          if (!nivelSecundaria) {
            throw new Error('No se encontró el nivel Secundaria en la base de datos')
          }
          
          const nivelIdSecundaria = nivelSecundaria.id
          
          // Construir el filtro where con área, grado y nivel Secundaria
          const whereClause: any = {
            idarea: areaIdParsed,
            idgrado: gradoIdParsed,
            idnivel: nivelIdSecundaria,
            transversal: false // Solo competencias no transversales
          }
          
          // Obtener TODAS las competencias que coincidan con área, grado y nivel Secundaria
          console.log('🔍 [{{competencia}}] Buscando competencias con filtros:', {
            idarea: areaIdParsed,
            idgrado: gradoIdParsed,
            idnivel: nivelIdSecundaria,
            transversal: false
          })
          
          // Primero, consulta de diagnóstico: ver TODAS las competencias para este área y grado (sin filtro de nivel)
          const todasLasCompetencias = await prisma.competencia.findMany({
            where: {
              idarea: areaIdParsed,
              idgrado: gradoIdParsed,
              transversal: false
            },
            select: {
              id: true,
              numeroCompetencia: true,
              idnivel: true,
              descripcion: true
            },
            orderBy: {
              numeroCompetencia: 'asc'
            }
          })
          
          console.log(`📊 [{{competencia}}] DIAGNÓSTICO: Total de competencias para área ${areaIdParsed} y grado ${gradoIdParsed} (SIN filtro de nivel): ${todasLasCompetencias.length}`)
          todasLasCompetencias.forEach((comp, idx) => {
            console.log(`   ${idx + 1}. ID: ${comp.id}, Número: ${comp.numeroCompetencia}, Nivel ID: ${comp.idnivel} (esperado: ${nivelIdSecundaria}), Descripción: ${comp.descripcion.substring(0, 50)}...`)
          })
          
          const competencias = await prisma.competencia.findMany({
            where: whereClause,
            include: { 
              area: true,
              estandares: {
                orderBy: { ordenamiento: 'asc' }
              }
            },
            orderBy: {
              numeroCompetencia: 'asc'
            }
          })

          console.log(`📊 [{{competencia}}] Competencias encontradas en BD: ${competencias.length}`)
          
          if (competencias.length > 0) {
            competencias.forEach((comp, idx) => {
              console.log(`   ${idx + 1}. ID: ${comp.id}, Número: ${comp.numeroCompetencia}, Descripción: ${comp.descripcion.substring(0, 60)}...`)
              console.log(`      Área: ${comp.idarea}, Grado: ${comp.idgrado}, Nivel: ${comp.idnivel}, Estándares: ${comp.estandares.length}`)
            })
          } else {
            console.log(`⚠️ [{{competencia}}] No se encontraron competencias con filtro de nivel. Verificando sin filtro de nivel...`)
            
            // Consulta alternativa SIN filtro de nivel para comparar
            const competenciasSinNivelFiltro = await prisma.competencia.findMany({
              where: {
                idarea: areaIdParsed,
                idgrado: gradoIdParsed,
                transversal: false
              },
              select: {
                id: true,
                numeroCompetencia: true,
                idnivel: true,
                descripcion: true
              },
              orderBy: {
                numeroCompetencia: 'asc'
              }
            })
            
            console.log(`📊 [{{competencia}}] Competencias SIN filtro de nivel: ${competenciasSinNivelFiltro.length}`)
            competenciasSinNivelFiltro.forEach((comp, idx) => {
              console.log(`   ${idx + 1}. ID: ${comp.id}, Número: ${comp.numeroCompetencia}, Nivel ID: ${comp.idnivel}, Descripción: ${comp.descripcion.substring(0, 50)}...`)
            })
            
            // Si encontramos competencias sin el filtro de nivel, usarlas
            if (competenciasSinNivelFiltro.length > 0) {
              console.log(`✅ [{{competencia}}] Usando competencias SIN filtro de nivel (${competenciasSinNivelFiltro.length} competencias)`)
              const competenciasCompletas = await prisma.competencia.findMany({
                where: {
                  idarea: areaIdParsed,
                  idgrado: gradoIdParsed,
                  transversal: false
                },
                include: { 
                  area: true,
                  estandares: {
                    orderBy: { ordenamiento: 'asc' }
                  }
                },
                orderBy: {
                  numeroCompetencia: 'asc'
                }
              })
              
              // Reemplazar el array de competencias
              competencias.length = 0
              competencias.push(...competenciasCompletas)
              console.log(`📊 [{{competencia}}] Competencias actualizadas: ${competencias.length}`)
            }
          }

          if (competencias.length > 0) {
            // Para la descripción, combinamos todas las competencias
            competenciasTexto = competencias.map(c => c.descripcion).join('; ')
            // Para el número, tomamos el número de la primera competencia y le agregamos el prefijo "COMPETENCIA "
            const numComp = competencias[0].numeroCompetencia?.toString() || ''
            competenciaNumero = numComp ? `COMPETENCIA ${numComp}` : ''
            
            // Obtener todos los estándares de todas las competencias
            const todosLosEstandares: Array<{ descripcion: string; ordenamiento: number }> = []
            competencias.forEach(comp => {
              comp.estandares.forEach(est => {
                todosLosEstandares.push({
                  descripcion: est.descripcion,
                  ordenamiento: est.ordenamiento
                })
              })
            })
            
            // Ordenar por ordenamiento
            todosLosEstandares.sort((a, b) => a.ordenamiento - b.ordenamiento)
            
            // Formatear con números correlativos y saltos de línea: "1. descripción\n2. descripción\n..."
            estandaresTexto = todosLosEstandares
              .map((est, index) => `${index + 1}. ${est.descripcion}`)
              .join('\n')
            
            // Crear array de competencias para el loop
            console.log(`📋 [{{competencia}}] Agregando ${competencias.length} competencia(s) al array para generar tablas...`)
            competencias.forEach((comp, idx) => {
              const estandaresFormateados = comp.estandares
                .map((est, index) => `${String.fromCharCode(65 + index)}. ${est.descripcion}`)
                .join('\n')
              
              const competenciaData = {
                competencianro: `COMPETENCIA ${comp.numeroCompetencia}`,
                competenciadescripcion: comp.descripcion,
                estandares: estandaresFormateados
              }
              
              competenciasArray.push(competenciaData)
              console.log(`   ✅ [{{competencia}}] Competencia ${idx + 1}/${competencias.length} agregada: ${competenciaData.competencianro} (${comp.estandares.length} estándares)`)
            })
            
            console.log(`📊 [{{competencia}}] Total en competenciasArray: ${competenciasArray.length} competencia(s)`)
          }
        } catch (error) {
          console.error(`❌ [{{competencia}}] Error al obtener competencias:`, error)
        }
    } else {
      console.log(`⚠️ [{{competencia}}] Faltan datos de área o grado para obtener competencias`)
    }
    
    console.log(`📊 [{{competencia}}] ========== FIN: OBTENCIÓN DE COMPETENCIAS ==========`)
    console.log(`📊 [{{competencia}}] Total final en competenciasArray: ${competenciasArray.length} competencia(s)`)

    // Obtener competencias transversales desde las nuevas tablas (comptransversal, capacidadtransversal, desempeniotransversal)
    let competenciasTransversalesArray: Array<{ competencianro: string; competenciadescripcion: string; capacidades: Array<{ capacidad: string; desempenios: string[] }> }> = []
    let gradoDescripcion = 'GRADO' // Por defecto
    try {
      const gradoIdParaComptransversal = parseInt(String(gradoId))
      
      // Obtener la descripción del grado
      const grado = await prisma.grado.findUnique({
        where: { id: gradoIdParaComptransversal }
      })
      if (grado && grado.descripcion) {
        gradoDescripcion = grado.descripcion
      }
      
      // Obtener competencias transversales filtrando por idgrado
      const competenciasTransversales = await prisma.comptransversal.findMany({
        where: { 
          idgrado: gradoIdParaComptransversal
        },
        include: { 
          grado: true,
          capacidadtransversales: {
            include: {
              desempeniotransversales: {
                orderBy: { iddesempeniotransversal: 'asc' }
              }
            },
            orderBy: { idcapacidadtransversal: 'asc' }
          }
        },
        orderBy: { idcomtransversal: 'asc' }
      })


      if (competenciasTransversales.length > 0) {
        competenciasTransversales.forEach((comp, compIdx) => {
          
          // Para cada competencia, obtener sus capacidades con sus desempeños
          const capacidadesData = comp.capacidadtransversales.map(cap => ({
            capacidad: cap.descripcion,
            desempenios: cap.desempeniotransversales.map(des => des.descripcion)
          }))
          
          competenciasTransversalesArray.push({
            competencianro: `COMPETENCIA TRANSVERSAL ${comp.idcomtransversal}`,
            competenciadescripcion: comp.descripcion,
            capacidades: capacidadesData
          })
        })
      }
    } catch (error) {
    }

    // Obtener TODAS las competencias del área y grado para el prompt (con número de capacidades)
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
              select: {
                id: true
              }
            }
          },
          orderBy: {
            numeroCompetencia: 'asc'
          }
        })

        competenciasPrompt.forEach(comp => {
          competenciasParaPrompt.push({
            descripcion: comp.descripcion,
            numCapacidades: comp.capacidades.length
          })
        })
        
      }
    } catch (error) {
    }

    // Obtener enfoques transversales, valores y actitudes generados por IA
    let enfoquesArray: Array<{ enfoque: string; valor: string; actitud: string }> = []
    
    // Obtener datos necesarios del formData para enfoques (si no están definidos)
    const unidadParaEnfoques = formData.unidad
    const areaIdParaEnfoques = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
    const gradoIdParaEnfoques = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
    const anioParaEnfoques = formData.anio || new Date().getFullYear()
    
    // Generar enfoques con IA (igual que el botón "IA genera enfoque")
    if (process.env.OPENAI_API_KEY) {
      try {
        // Obtener título de la unidad del plan anual
        let tituloUnidadParaEnfoques = tituloUnidad
        if (!tituloUnidadParaEnfoques && unidadParaEnfoques && areaIdParaEnfoques && gradoIdParaEnfoques) {
          const userId = await getUserId(request)
          if (userId) {
            const planAnual = await prisma.planAnual.findFirst({
              where: {
                idusuario: userId,
                anio: parseInt(String(anioParaEnfoques)),
                areaId: String(areaIdParaEnfoques),
                gradoId: String(gradoIdParaEnfoques)
              }
            })

            if (planAnual && planAnual.unidades) {
              const unidades = Array.isArray(planAnual.unidades) 
                ? planAnual.unidades 
                : JSON.parse(planAnual.unidades as string)

              const unidadNumero = parseInt(String(unidadParaEnfoques), 10)
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
                tituloUnidadParaEnfoques = unidadData.tituloUnidad
              }
            }
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

        // Leer el template Word de enfoques
        const templateEnfoquesPath = path.join(process.cwd(), 'templates', 'PROMPT- Enfoques transversales_ok.docx')
        if (fs.existsSync(templateEnfoquesPath)) {
          const wordBuffer = fs.readFileSync(templateEnfoquesPath)
          const result = await mammoth.extractRawText({ buffer: wordBuffer })
          let promptText = result.value || ''

          // Reemplazar variables en el prompt
          promptText = promptText.replace(/\{\{area\}\}/g, formData.area || '')
          promptText = promptText.replace(/\{\{grado\}\}/g, formData.grado || '')
          promptText = promptText.replace(/\{\{titulounidad\}\}/g, tituloUnidadParaEnfoques || (formData.unidad && formData.area ? `Unidad ${formData.unidad}: ${formData.area}` : ''))
          promptText = promptText.replace(/\{\{situacion\}\}/g, formData.situacionSignificativa || '')
          promptText = promptText.replace(/\{\{enfoques\}\}/g, enfoquesTexto)

          // Enviar el prompt a GPT-mini
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos

          let openaiResponse: Response | undefined
          const maxRetries = 3
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'user',
                      content: promptText
                    }
                  ],
                  max_tokens: 4000,
                  temperature: 0.7,
                }),
                signal: controller.signal,
              })
              
              if (openaiResponse.ok) {
                clearTimeout(timeoutId)
                break
              }
              
              if (attempt === maxRetries) {
                throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
              }
              
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
              await new Promise(resolve => setTimeout(resolve, delay))
              
            } catch (fetchError: any) {
              if (attempt === maxRetries) {
                clearTimeout(timeoutId)
                break
              }
              
              if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.name === 'AbortError') {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              }
              
              break
            }
          }

          if (openaiResponse && openaiResponse.ok) {
            const gptData = await openaiResponse.json()
            const gptResponse = gptData.choices?.[0]?.message?.content || ''

            if (gptResponse) {
              // Parsear la respuesta de GPT para extraer SOLO las descripciones de enfoques
              // Luego buscar en la BD por descripción y obtener valores y actitudes
              const lineas = gptResponse.split('\n').filter((l: string) => l.trim())
              
              // Array para almacenar las descripciones de enfoques extraídas de la IA
              const descripcionesEnfoquesIA: string[] = []
              
              // Intentar parsear como tabla (formato con pipes)
              const lineasConPipes = lineas.filter((l: string) => l.trim().includes('|') && l.trim().split('|').length >= 3)
              
              if (lineasConPipes.length > 0) {
                // Es una tabla, extraer solo la primera columna (descripción del enfoque)
                for (const linea of lineasConPipes) {
                  // Ignorar líneas separadoras (como |---|---|)
                  if (linea.trim().match(/^[\|\s\-:]+$/)) continue
                  
                  const columnas = linea.split('|').map((col: string) => col.trim()).filter((col: string) => col && !col.match(/^[\-:]+$/))
                  
                  if (columnas.length >= 1) {
                    // Ignorar la fila de encabezado si contiene "ENFOQUE", "VALOR", "ACTITUD"
                    const esEncabezado = columnas.some((col: string) => 
                      col.toUpperCase().includes('ENFOQUE') || 
                      col.toUpperCase().includes('VALOR') || 
                      col.toUpperCase().includes('ACTITUD')
                    )
                    
                    if (!esEncabezado && columnas[0]) {
                      // Extraer solo la descripción del enfoque (primera columna)
                      descripcionesEnfoquesIA.push(columnas[0].trim())
                    }
                  }
                }
              } else {
                // No es tabla, intentar parsear como lista estructurada
                // Buscar descripciones de enfoques (pueden venir con números, guiones, etc.)
                for (const linea of lineas) {
                  const lineaUpper = linea.toUpperCase()
                  
                  // Ignorar líneas que son claramente valores o actitudes
                  if (lineaUpper.includes('VALOR') || lineaUpper.includes('ACTITUD') || 
                      lineaUpper.includes('ENFOQUES TRANSVERSALES') || 
                      lineaUpper.match(/^ENFOQUES?[:\-]/)) {
                    continue
                  }
                  
                  // Buscar patrones como "1. Descripción", "- Descripción", "• Descripción", etc.
                  const matchEnfoque = linea.match(/^\d+[\.\)]\s*(.+)/i) || 
                                      linea.match(/^[-\*•]\s*(.+)/i) ||
                                      linea.match(/enfoque[:\-]?\s*(.+)/i)
                  
                  if (matchEnfoque && matchEnfoque[1]) {
                    const descripcion = matchEnfoque[1].trim()
                    // Limpiar la descripción (puede tener valores o actitudes después de comas, puntos, etc.)
                    const descripcionLimpia = descripcion.split(/[,;]/)[0].trim()
                    if (descripcionLimpia && descripcionLimpia.length > 5) {
                      descripcionesEnfoquesIA.push(descripcionLimpia)
                    }
                  } else if (linea.trim().length > 10 && 
                            !lineaUpper.includes('VALOR') && 
                            !lineaUpper.includes('ACTITUD') &&
                            !lineaUpper.includes('ENFOQUE TRANSVERSAL')) {
                    // Si la línea es suficientemente larga y no parece ser un encabezado, puede ser una descripción
                    descripcionesEnfoquesIA.push(linea.trim())
                  }
                }
              }
              
              // Ahora buscar en la BD por cada descripción encontrada
              if (descripcionesEnfoquesIA.length > 0) {
                // Obtener todos los enfoques de la BD para hacer búsqueda por coincidencia
                const todosLosEnfoquesBD = await prisma.enfoqueTransversal.findMany({
                  orderBy: { idenfoque: 'asc' }
                })
                
                // Para cada descripción de la IA, buscar el enfoque más similar en la BD
                for (const descripcionIA of descripcionesEnfoquesIA) {
                  // Buscar coincidencias (puede ser parcial o exacta)
                  const enfoqueEncontrado = todosLosEnfoquesBD.find(enfoqueBD => {
                    const descripcionBD = enfoqueBD.descripcion.toLowerCase()
                    const descripcionIAClean = descripcionIA.toLowerCase()
                    
                    // Buscar coincidencia exacta o parcial
                    return descripcionBD === descripcionIAClean || 
                           descripcionBD.includes(descripcionIAClean) ||
                           descripcionIAClean.includes(descripcionBD)
                  })
                  
                  if (enfoqueEncontrado) {
                    // Obtener valores y actitudes relacionados desde la BD
                    const enfoqueValores = await prisma.enfoVal.findMany({
                      where: {
                        idenfoque: enfoqueEncontrado.idenfoque
                      },
                      include: {
                        valor: true
                      },
                      orderBy: { idvalor: 'asc' }
                    })
                    
                    // Agregar cada combinación enfoque-valor-actitud
                    enfoqueValores.forEach((enfoVal) => {
                      enfoquesArray.push({
                        enfoque: enfoqueEncontrado.descripcion,
                        valor: enfoVal.valor.descripcion,
                        actitud: enfoVal.valor.actitud
                      })
                    })
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Error silencioso, usar enfoques vacíos
      }
    }
    

    // Preparar los datos para reemplazar en la plantilla
    const data: any = {
      // Datos informativos
      U: formData.unidad || '',
      institucioneducativa: formData.institucion || '',
      director: formData.director || '',
      docente: formData.docente || '',
      'área': formData.area || '',
      area: formData.area || '',
      grado: formData.grado || '',
      ciclo: formData.ciclo || '',
      duración: formData.duracion || '',
      fechainicio: formData.fechaInicio || '',
      fechatermino: formData.fechaTermino || '',
      
      // Situación significativa
      situacionsignificativa: formData.situacionSignificativa || '',
      
      // Producto
      producto: formData.producto || '',
      
      // Título de la unidad (desde plan anual o fallback)
      titulounidad: tituloUnidad || (formData.unidad && formData.area ? `Unidad ${formData.unidad}: ${formData.area}` : ''),
      
      // Propósito de la unidad (si no se generó con IA, usar el texto ingresado)
      propositounidad: formData.propositoUnidad || '',
      
      // Competencias
      competencianro: competenciaNumero,
      competenciadescripcion: competenciasTexto,
      
      // Estándares
      estandares: estandaresTexto,
      
      // v2 placeholder
      v2: 'Te encontre',
      
      // IMPORTANTE: Incluir competencia, competenciatransversal y enfoques con marcadores temporales para que Docxtemplater no los elimine
      // Luego los reemplazaremos con las tablas después del render
      competencia: '__TABLA_COMPETENCIAS_PLACEHOLDER__',
      competenciatransversal: '__TABLA_COMPETENCIAS_TRANSVERSALES_PLACEHOLDER__',
      enfoques: '__TABLA_ENFOQUES_PLACEHOLDER__',
      
      // Array de competencias para el prompt (lista con número de capacidades)
      competencias: competenciasParaPrompt.length > 0 ? competenciasParaPrompt : [
        { descripcion: 'No se encontraron competencias', numCapacidades: 0 }
      ],
      
      // Placeholder para el contenido generado por IA (se reemplazará después del render)
      final: '__GPT_RESPONSE_PLACEHOLDER__',
      // Placeholder para la tabla didáctica generada por IA
      tabladidactica: '__TABLA_DIDACTICA_PLACEHOLDER__',
    }

    // Si se debe generar el propósito con IA, dejar vacío para que se genere después
    // Por ahora, usamos el valor que el usuario ingresó o dejamos vacío
    if (formData.generarPropositoIA) {
      // El propósito se generará con IA, pero por ahora lo dejamos vacío
      // En el futuro se podría agregar la lógica de generación aquí
      data.propositounidad = ''
    }
    
    if (competenciasArray.length > 0) {
    }

    // Asignar datos a la plantilla
    doc.setData(data)

    // Declarar documentXml fuera del try-catch para que esté disponible en todo el scope
    let documentXml: string = ''
    
    try {
      doc.render()
      
      // Obtener el zip después del render - debe estar en el scope principal
      const zipAfterRender = doc.getZip()
      
      // Inicializar documentXml desde el zip
      documentXml = zipAfterRender.files['word/document.xml']?.asText() || ''
      
      // DESPUÉS del render, generar tablas dinámicas para cada competencia
      // Función helper para escapar texto para XML
      const escaparXML = (texto: string): string => {
        return texto
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      }
      
      // Función helper para generar una tabla individual para una competencia
      const generarTablaCompetencia = (comp: { competencianro: string; competenciadescripcion: string; estandares: string }): string => {
        const competenciaNumeroEscapado = escaparXML(comp.competencianro)
        const competenciaDescripcionEscapado = escaparXML(comp.competenciadescripcion)
        
        // Convertir estándares en líneas para determinar si necesitamos combinar celdas
        const lineasEstandares = comp.estandares.split('\n').filter((line: string) => line.trim() !== '')
        const lineasEstandaresCount = lineasEstandares.length
        
        // Construir la tabla con bordes dobles y color #00B050 (mismo diseño que enfoques)
        // Centrar la tabla usando w:jc w:val="center"
        let tablaXML = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2962"/><w:gridCol w:w="11907"/></w:tblGrid>'
        
        // Header row
        tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${competenciaNumeroEscapado}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>ESTÁNDAR DE APRENDIZAJE</w:t></w:r></w:p></w:tc></w:tr>`
        
        // Generar filas con combinación de celdas verticales (si hay múltiples estándares)
        if (lineasEstandaresCount === 0) {
          // Si no hay estándares, crear una fila vacía
          tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${competenciaDescripcionEscapado}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t></w:t></w:r></w:p></w:tc></w:tr>`
        } else {
          // Generar una fila por cada estándar, combinando la celda de competencia verticalmente
          lineasEstandares.forEach((linea, index) => {
            const lineaEscapada = escaparXML(linea.trim())
            const esPrimeraFila = index === 0
            
            tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
            
            // Columna 1: COMPETENCIA (combinar celdas verticalmente)
            if (esPrimeraFila) {
              // Primera fila: usar vMerge="restart"
              tablaXML += `<w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${competenciaDescripcionEscapado}</w:t></w:r></w:p></w:tc>`
            } else {
              // Filas siguientes: usar vMerge (celda vacía, solo propiedades)
              tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
            }
            
            // Columna 2: ESTÁNDAR DE APRENDIZAJE (sin combinar)
            tablaXML += `<w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${lineaEscapada}</w:t></w:r></w:p></w:tc>`
            
            tablaXML += `</w:tr>`
          })
        }
        
        tablaXML += '</w:tbl>'
        return tablaXML
      }
      
      // Generar todas las tablas para cada competencia
      let tablasConcatenadas = ''
      
      console.log(`🔍 [{{competencia}}] Iniciando generación de tablas. Array tiene ${competenciasArray.length} competencia(s)`)
      
      if (competenciasArray.length > 0) {
        console.log(`📋 [{{competencia}}] Detalle de competencias en el array:`)
        competenciasArray.forEach((comp, idx) => {
          console.log(`   ${idx + 1}. ${comp.competencianro}: ${comp.competenciadescripcion.substring(0, 50)}...`)
          console.log(`      Estándares: ${comp.estandares.split('\n').length} líneas`)
        })
        
        console.log(`📊 [{{competencia}}] Generando ${competenciasArray.length} tabla(s)...`)
        competenciasArray.forEach((comp, index) => {
          const tablaXML = generarTablaCompetencia(comp)
          tablasConcatenadas += tablaXML
          console.log(`   ✅ [{{competencia}}] Tabla ${index + 1}/${competenciasArray.length} generada: ${comp.competencianro} (${tablaXML.length} caracteres)`)
        })
        
        console.log(`📊 [{{competencia}}] Total de tablas concatenadas: ${tablasConcatenadas.length} caracteres`)
        console.log(`📊 [{{competencia}}] Número de <w:tbl> en concatenación: ${(tablasConcatenadas.match(/<w:tbl>/g) || []).length}`)
        console.log(`📊 [{{competencia}}] Número de </w:tbl> en concatenación: ${(tablasConcatenadas.match(/<\/w:tbl>/g) || []).length}`)
      } else {
        // Si no hay competencias, generar tabla vacía con el mismo diseño (bordes dobles #00B050)
        tablasConcatenadas = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2962"/><w:gridCol w:w="11907"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t></w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t></w:t></w:r></w:p></w:tc></w:tr><w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t></w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t></w:t></w:r></w:p></w:tc></w:tr></w:tbl>`
      }
      
      const tabla = tablasConcatenadas
      
      try {
        // Asegurarse de que documentXml esté actualizado
        if (!documentXml) {
          documentXml = zipAfterRender.files['word/document.xml'].asText()
        }
        
        const marcadorCompetencias = '__TABLA_COMPETENCIAS_PLACEHOLDER__'
        let idxComp = -1
        let insertarTabla = false
        let puntoInsercion = -1
        
        // Buscar primero el marcador que dejamos en data
        idxComp = documentXml.indexOf(marcadorCompetencias)
        if (idxComp === -1) {
          // Si no encuentra el marcador, buscar {{competencia}} directamente
          idxComp = documentXml.indexOf('{{competencia}}')
          if (idxComp === -1) {
            // Intentar con una sola llave
            idxComp = documentXml.indexOf('{competencia}')
          }
        }
        
        if (idxComp > -1) {
          // Buscar el párrafo que contiene el marcador o placeholder
          // Buscar hacia atrás para encontrar el inicio del párrafo más cercano
          let paraStart = -1
          for (let i = idxComp; i >= 0; i--) {
            if (documentXml.substring(i, i + 4) === '<w:p') {
              // Verificar que no sea parte de otro tag (como <w:pPr)
              const charAfter = documentXml.charAt(i + 4)
              if (charAfter === ' ' || charAfter === '>') {
                paraStart = i
                break
              }
            }
          }
          
          // Buscar hacia adelante para encontrar el cierre del párrafo
          const paraEnd = documentXml.indexOf('</w:p>', idxComp)
          
          if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
            // Reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla
            puntoInsercion = paraStart
            insertarTabla = true
          }
        } else {
          // Fallback: buscar por "ESTÁNDAR DE APRENDIZAJE" si no se encuentra el placeholder
          const idxEstandar = documentXml.indexOf('ESTÁNDAR DE APRENDIZAJE')
          if (idxEstandar > -1) {
            const paraStartEstandar = documentXml.lastIndexOf('<w:p', idxEstandar)
            const paraEndEstandar = documentXml.indexOf('</w:p>', idxEstandar)
            if (paraEndEstandar > -1) {
              let siguienteParrafo = documentXml.indexOf('<w:p', paraEndEstandar + 6)
              if (siguienteParrafo > -1) {
                puntoInsercion = siguienteParrafo
                insertarTabla = true
              } else {
                puntoInsercion = paraEndEstandar + 6
                insertarTabla = true
              }
            }
          }
        }
        
        if (insertarTabla && puntoInsercion > -1) {
          // VALIDACIONES CRÍTICAS antes de insertar
          if (!tabla || tabla.trim().length === 0) {
            insertarTabla = false
          } else if (!tabla.startsWith('<w:tbl>') || !tabla.endsWith('</w:tbl>')) {
            insertarTabla = false
          } else {
            // IMPORTANTE: Cuando puntoInsercion es el inicio del párrafo, necesitamos encontrar el fin del párrafo
            // para reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla
            if (idxComp > -1) {
              // Re-buscar el párrafo completo para asegurarnos de tener los índices correctos
              let paraStart = -1
              for (let i = idxComp; i >= 0; i--) {
                if (documentXml.substring(i, i + 4) === '<w:p') {
                  const charAfter = documentXml.charAt(i + 4)
                  if (charAfter === ' ' || charAfter === '>') {
                    paraStart = i
                    break
                  }
                }
              }
              const paraEnd = documentXml.indexOf('</w:p>', idxComp)
              
              // Verificar si el párrafo anterior (el del título verde) tiene algún formato especial
              // que pueda estar causando el espacio. Buscar el párrafo inmediatamente anterior.
              if (paraStart > 0) {
                const idxParrafoAnterior = documentXml.lastIndexOf('<w:p', paraStart - 1)
                if (idxParrafoAnterior > -1) {
                  const finParrafoAnterior = documentXml.indexOf('</w:p>', idxParrafoAnterior)
                  if (finParrafoAnterior > -1 && finParrafoAnterior < paraStart) {
                    // Verificar si el párrafo anterior tiene indentación que pueda estar afectando
                    const parrafoAnterior = documentXml.substring(idxParrafoAnterior, finParrafoAnterior + 6)
                    // Si el párrafo anterior tiene indentación, no debería afectar a la tabla siguiente
                    // pero podemos verificar para debugging
                  }
                }
              }
              
              if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
                // Asegurarse de que todas las tablas estén centradas
                // Verificar que todas tengan w:jc w:val="center" (puede haber múltiples tablas concatenadas)
                let tablaCentrada = tabla
                
                // Si alguna tabla no tiene w:jc, agregarlo después de w:tblW
                if (!tablaCentrada.includes('<w:jc')) {
                  tablaCentrada = tablaCentrada.replace(
                    /(<w:tblW[^>]*>)/,
                    '$1<w:jc w:val="center"/>'
                  )
                } else {
                  // Si ya tiene w:jc, asegurarse de que esté en "center"
                  tablaCentrada = tablaCentrada.replace(
                    /<w:jc\s+w:val="[^"]*"/g,
                    '<w:jc w:val="center"'
                  )
                }
                
                // Eliminar cualquier w:tblInd que pueda interferir con el centrado
                tablaCentrada = tablaCentrada.replace(
                  /<w:tblInd[^>]*\/?>/g,
                  ''
                )
                
                // Extraer el párrafo original para verificar si tiene indentación
                const parrafoOriginal = documentXml.substring(paraStart, paraEnd + 6)
                
                // Si el párrafo tiene indentación (w:ind), la tabla heredará ese espacio
                // Por eso simplemente reemplazamos el párrafo completo con la tabla centrada
                // La tabla con w:jc w:val="center" se centrará independientemente de la indentación del párrafo
                
                // Reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla centrada
                const antes = documentXml.substring(0, paraStart)
                const despues = documentXml.substring(paraEnd + 6) // +6 para saltar </w:p>
                
                // Verificar que antes tenga estructura válida
                if (!antes.includes('<w:document')) {
                  insertarTabla = false
                } else {
                  // Construir el nuevo XML con la tabla centrada
                  const nuevoDocumentXml = antes + tablaCentrada + despues
                  
                  // Validar que las tablas estén balanceadas
                  const conteoTablasAbiertas = (nuevoDocumentXml.match(/<w:tbl>/g) || []).length
                  const conteoTablasCerradas = (nuevoDocumentXml.match(/<\/w:tbl>/g) || []).length
                  
                  
                  if (conteoTablasAbiertas !== conteoTablasCerradas) {
                    insertarTabla = false
                  } else if (!nuevoDocumentXml.includes('</w:document>')) {
                    insertarTabla = false
                  } else {
                    // Verificar que el nuevo XML tenga estructura válida básica
                    if (!nuevoDocumentXml.includes('<w:body') || !nuevoDocumentXml.includes('</w:body>')) {
                      insertarTabla = false
                    } else {
                      // Todo válido, insertar
                      documentXml = nuevoDocumentXml
                      zipAfterRender.file('word/document.xml', documentXml)
                    }
                  }
                }
              } else {
                insertarTabla = false
              }
            } else {
              // Si no encontramos idxComp, usar el puntoInsercion directamente
              const antes = documentXml.substring(0, puntoInsercion)
              const despues = documentXml.substring(puntoInsercion)
              
              if (!antes.includes('<w:document')) {
                insertarTabla = false
              } else {
                const nuevoDocumentXml = antes + tabla + despues
                const conteoTablasAbiertas = (nuevoDocumentXml.match(/<w:tbl>/g) || []).length
                const conteoTablasCerradas = (nuevoDocumentXml.match(/<\/w:tbl>/g) || []).length
                
                if (conteoTablasAbiertas !== conteoTablasCerradas) {
                  insertarTabla = false
                } else if (!nuevoDocumentXml.includes('</w:document>')) {
                  insertarTabla = false
                } else {
                  documentXml = nuevoDocumentXml
                  zipAfterRender.file('word/document.xml', documentXml)
                }
              }
            }
          }
        }
        
        // IMPORTANTE: Releer el documentXml actualizado después de insertar la tabla de competencias
        if (insertarTabla) {
          documentXml = zipAfterRender.files['word/document.xml'].asText()
        }
        
        // Generar tabla de enfoques transversales, valores y actitudes
        
        // Función helper para generar la tabla de enfoques
        const generarTablaEnfoques = (): string => {
          if (enfoquesArray.length === 0) {
            // Tabla vacía con header de 3 columnas (mismo diseño que competencias transversales)
            return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4956"/><w:gridCol w:w="4956"/><w:gridCol w:w="4957"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>ENFOQUES TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>VALORES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>ACTITUDES</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`
          }
          
          // Construir la tabla con 3 columnas (mismo diseño que competencias transversales)
          let tablaXML = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4956"/><w:gridCol w:w="4956"/><w:gridCol w:w="4957"/></w:tblGrid>'
          
          // Header row
          tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>ENFOQUES TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>VALORES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>ACTITUDES</w:t></w:r></w:p></w:tc></w:tr>`
          
          // Agrupar enfoques por descripción para combinar celdas verticalmente
          const enfoquesAgrupados = new Map<string, Array<{ valor: string; actitud: string }>>()
          
          enfoquesArray.forEach((item) => {
            if (!enfoquesAgrupados.has(item.enfoque)) {
              enfoquesAgrupados.set(item.enfoque, [])
            }
            enfoquesAgrupados.get(item.enfoque)!.push({
              valor: item.valor,
              actitud: item.actitud
            })
          })
          
          // Generar filas con combinación de celdas verticales
          enfoquesAgrupados.forEach((valoresActitudes, enfoque) => {
            const enfoqueEscapado = escaparXML(enfoque)
            
            valoresActitudes.forEach((item, index) => {
              const valorEscapado = escaparXML(item.valor)
              const actitudEscapada = escaparXML(item.actitud)
              
              const esPrimeraFilaEnfoque = index === 0
              
              // Crear fila
              tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
              
              // Columna 1: ENFOQUES TRANSVERSALES (combinar celdas verticalmente)
              if (esPrimeraFilaEnfoque) {
                // Primera fila del enfoque: usar vMerge="restart"
                tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${enfoqueEscapado}</w:t></w:r></w:p></w:tc>`
              } else {
                // Filas siguientes: usar vMerge (celda vacía, solo propiedades)
                tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
              }
              
              // Columna 2: VALORES (sin combinar)
              tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${valorEscapado}</w:t></w:r></w:p></w:tc>`
              
              // Columna 3: ACTITUDES (sin combinar)
              tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${actitudEscapada}</w:t></w:r></w:p></w:tc>`
              
              tablaXML += `</w:tr>`
            })
          })
          
          tablaXML += '</w:tbl>'
          return tablaXML
        }
        
        const tablaEnfoquesXML = generarTablaEnfoques()
        
        // Buscar dónde insertar la tabla de enfoques (misma lógica que competencias)
        const marcadorEnfoques = '__TABLA_ENFOQUES_PLACEHOLDER__'
        let idxEnfoques = -1
        let insertarTablaEnfoques = false
        let puntoInsercionEnfoques = -1
        
        // Buscar primero el marcador que dejamos en data
        idxEnfoques = documentXml.indexOf(marcadorEnfoques)
        if (idxEnfoques === -1) {
          // Si no encuentra el marcador, buscar {{enfoques}} directamente
          idxEnfoques = documentXml.indexOf('{{enfoques}}')
          if (idxEnfoques === -1) {
            // Intentar con una sola llave
            idxEnfoques = documentXml.indexOf('{enfoques}')
          }
        }
        
        if (idxEnfoques > -1) {
          // Buscar el párrafo que contiene el marcador o placeholder
          // Buscar hacia atrás para encontrar el inicio del párrafo más cercano
          let paraStart = -1
          for (let i = idxEnfoques; i >= 0; i--) {
            if (documentXml.substring(i, i + 4) === '<w:p') {
              // Verificar que no sea parte de otro tag (como <w:pPr)
              const charAfter = documentXml.charAt(i + 4)
              if (charAfter === ' ' || charAfter === '>') {
                paraStart = i
                break
              }
            }
          }
          
          // Buscar hacia adelante para encontrar el cierre del párrafo
          const paraEnd = documentXml.indexOf('</w:p>', idxEnfoques)
          
          if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
            // Reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla
            puntoInsercionEnfoques = paraStart
            insertarTablaEnfoques = true
          }
        } else {
          // Fallback: buscar por "ENFOQUES TRANSVERSALES" si no se encuentra el placeholder
          const idxEnfoquesTexto = documentXml.indexOf('ENFOQUES TRANSVERSALES')
          if (idxEnfoquesTexto > -1) {
            // Buscar hacia atrás para encontrar el inicio del párrafo
            let paraStartTexto = -1
            for (let i = idxEnfoquesTexto; i >= 0; i--) {
              if (documentXml.substring(i, i + 4) === '<w:p') {
                const charAfter = documentXml.charAt(i + 4)
                if (charAfter === ' ' || charAfter === '>') {
                  paraStartTexto = i
                  break
                }
              }
            }
            const paraEndTexto = documentXml.indexOf('</w:p>', idxEnfoquesTexto)
            if (paraEndTexto > -1) {
              let siguienteParrafo = documentXml.indexOf('<w:p', paraEndTexto + 6)
              if (siguienteParrafo > -1) {
                puntoInsercionEnfoques = siguienteParrafo
                insertarTablaEnfoques = true
              } else {
                puntoInsercionEnfoques = paraEndTexto + 6
                insertarTablaEnfoques = true
              }
            }
          }
        }
        
        if (insertarTablaEnfoques && puntoInsercionEnfoques > -1) {
          // VALIDACIONES CRÍTICAS antes de insertar (igual que competencias)
          if (!tablaEnfoquesXML || tablaEnfoquesXML.trim().length === 0) {
            insertarTablaEnfoques = false
          } else if (!tablaEnfoquesXML.startsWith('<w:tbl>') || !tablaEnfoquesXML.endsWith('</w:tbl>')) {
            insertarTablaEnfoques = false
          } else {
            // IMPORTANTE: Cuando puntoInsercionEnfoques es el inicio del párrafo, necesitamos encontrar el fin del párrafo
            // para reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla
            if (idxEnfoques > -1) {
              // Re-buscar el párrafo completo para asegurarnos de tener los índices correctos
              let paraStart = -1
              for (let i = idxEnfoques; i >= 0; i--) {
                if (documentXml.substring(i, i + 4) === '<w:p') {
                  const charAfter = documentXml.charAt(i + 4)
                  if (charAfter === ' ' || charAfter === '>') {
                    paraStart = i
                    break
                  }
                }
              }
              const paraEnd = documentXml.indexOf('</w:p>', idxEnfoques)
              
              if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
                // Reemplazar TODO el párrafo (desde <w:p hasta </w:p>) con la tabla
                const antesEnfoques = documentXml.substring(0, paraStart)
                const despuesEnfoques = documentXml.substring(paraEnd + 6) // +6 para saltar </w:p>
                
                // Verificar que antes tenga estructura válida
                if (!antesEnfoques.includes('<w:document')) {
                  insertarTablaEnfoques = false
                } else {
                  // Construir el nuevo XML
                  const nuevoXml = antesEnfoques + tablaEnfoquesXML + despuesEnfoques
                  
                  // Validar que las tablas estén balanceadas
                  const tablasAbiertas = (nuevoXml.match(/<w:tbl>/g) || []).length
                  const tablasCerradas = (nuevoXml.match(/<\/w:tbl>/g) || []).length
                  
                  
                  if (tablasAbiertas !== tablasCerradas) {
                    insertarTablaEnfoques = false
                  } else if (!nuevoXml.includes('</w:document>')) {
                    insertarTablaEnfoques = false
                  } else {
                    // Verificar que el nuevo XML tenga estructura válida básica
                    if (!nuevoXml.includes('<w:body') || !nuevoXml.includes('</w:body>')) {
                      insertarTablaEnfoques = false
                    } else {
                      // Todo válido, insertar
                      documentXml = nuevoXml
                      zipAfterRender.file('word/document.xml', documentXml)
                      insertarTablaEnfoques = true
                      puntoInsercionEnfoques = paraStart
                    }
                  }
                }
              } else {
                insertarTablaEnfoques = false
              }
            } else {
              // Si no encontramos idxEnfoques, usar el puntoInsercionEnfoques directamente
              const antesEnfoques = documentXml.substring(0, puntoInsercionEnfoques)
              const despuesEnfoques = documentXml.substring(puntoInsercionEnfoques)
              
              if (!antesEnfoques.includes('<w:document')) {
                insertarTablaEnfoques = false
              } else {
                const nuevoXml = antesEnfoques + tablaEnfoquesXML + despuesEnfoques
                const tablasAbiertas = (nuevoXml.match(/<w:tbl>/g) || []).length
                const tablasCerradas = (nuevoXml.match(/<\/w:tbl>/g) || []).length
                
                if (tablasAbiertas !== tablasCerradas) {
                  insertarTablaEnfoques = false
                } else if (!nuevoXml.includes('</w:document>')) {
                  insertarTablaEnfoques = false
                } else {
                  documentXml = nuevoXml
                  zipAfterRender.file('word/document.xml', documentXml)
                  insertarTablaEnfoques = true
                }
              }
            }
          }
        }

        // IMPORTANTE: Releer el documentXml actualizado después de insertar la tabla de enfoques
        if (insertarTablaEnfoques) {
          documentXml = zipAfterRender.files['word/document.xml'].asText()
        }

        // Generar tabla de competencias transversales
        
        // Función helper para generar la tabla de competencias transversales (3 columnas: COMPETENCIAS TRANSVERSALES, CAPACIDADES, DESEMPEÑOS)
        const generarTablaCompetenciasTransversales = (): string => {
          // Obtener el texto del encabezado de desempeños con el grado
          const desempeniosHeaderText = `DESEMPEÑOS ${gradoDescripcion.toUpperCase()}`
          const desempeniosHeaderEscapado = escaparXML(desempeniosHeaderText)
          
          if (competenciasTransversalesArray.length === 0) {
            // Tabla vacía con header de 3 columnas
            return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4956"/><w:gridCol w:w="4956"/><w:gridCol w:w="4957"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>COMPETENCIAS TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>CAPACIDADES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${desempeniosHeaderEscapado}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`
          }
          
          // Construir la tabla con 3 columnas
          let tablaXML = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4956"/><w:gridCol w:w="4956"/><w:gridCol w:w="4957"/></w:tblGrid>'
          
          // Header row
          tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>COMPETENCIAS TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>CAPACIDADES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${desempeniosHeaderEscapado}</w:t></w:r></w:p></w:tc></w:tr>`
          
          // Para cada competencia transversal
          competenciasTransversalesArray.forEach((comp, compIndex) => {
            const competenciaEscapada = escaparXML(comp.competenciadescripcion)
            
            // Calcular cuántas filas necesita esta competencia (suma de todos los desempeños de todas sus capacidades)
            let filasCompetencia = 0
            comp.capacidades.forEach(cap => {
              filasCompetencia += cap.desempenios.length
            })
            
            // Para cada capacidad de la competencia
            comp.capacidades.forEach((cap, capIndex) => {
              const capacidadEscapada = escaparXML(cap.capacidad)
              
              // Calcular cuántas filas necesita esta capacidad (número de desempeños)
              const filasCapacidad = cap.desempenios.length
              
              // Para cada desempeño de la capacidad
              cap.desempenios.forEach((desempenio, desIndex) => {
                const desempenioEscapado = escaparXML(desempenio)
                
                // Determinar si es la primera fila de la competencia y de la capacidad
                const esPrimeraFilaCompetencia = capIndex === 0 && desIndex === 0
                const esPrimeraFilaCapacidad = desIndex === 0
                
                // Crear fila
                tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
                
                // Columna 1: COMPETENCIAS TRANSVERSALES (combinar celdas verticalmente)
                if (esPrimeraFilaCompetencia) {
                  // Primera fila de la competencia: usar vMerge="restart"
                  tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${competenciaEscapada}</w:t></w:r></w:p></w:tc>`
                } else {
                  // Filas siguientes: usar vMerge (celda vacía, solo propiedades)
                  tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
                }
                
                // Columna 2: CAPACIDADES (combinar celdas verticalmente)
                if (esPrimeraFilaCapacidad) {
                  // Primera fila de la capacidad: usar vMerge="restart"
                  tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4956" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${capacidadEscapada}</w:t></w:r></w:p></w:tc>`
                } else {
                  // Filas siguientes: usar vMerge (celda vacía, solo propiedades)
                  tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
                }
                
                // Columna 3: DESEMPEÑOS (sin combinar)
                tablaXML += `<w:tc><w:tcPr><w:tcW w:w="4957" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>${desempenioEscapado}</w:t></w:r></w:p></w:tc>`
                
                tablaXML += `</w:tr>`
              })
            })
          })
          
          tablaXML += '</w:tbl>'
          
          return tablaXML
        }
        
        const tablaCompetenciasTransversalesXML = generarTablaCompetenciasTransversales()
        
        // Buscar dónde insertar la tabla de competencias transversales (misma lógica que competencias y enfoques)
        const marcadorCompetenciasTransversales = '__TABLA_COMPETENCIAS_TRANSVERSALES_PLACEHOLDER__'
        let idxCompTransv = -1
        let insertarTablaCompTransv = false
        let puntoInsercionCompTransv = -1
        
        // Buscar primero el marcador que dejamos en data
        idxCompTransv = documentXml.indexOf(marcadorCompetenciasTransversales)
        if (idxCompTransv === -1) {
          // Si no encuentra el marcador, buscar {{competenciatransversal}} directamente
          idxCompTransv = documentXml.indexOf('{{competenciatransversal}}')
          if (idxCompTransv === -1) {
            // Intentar con una sola llave
            idxCompTransv = documentXml.indexOf('{competenciatransversal}')
          }
        }
        
        if (idxCompTransv > -1) {
          // Buscar el párrafo que contiene el marcador o placeholder (misma lógica mejorada)
          let paraStart = -1
          for (let i = idxCompTransv; i >= 0; i--) {
            if (documentXml.substring(i, i + 4) === '<w:p') {
              const charAfter = documentXml.charAt(i + 4)
              if (charAfter === ' ' || charAfter === '>') {
                paraStart = i
                break
              }
            }
          }
          
          const paraEnd = documentXml.indexOf('</w:p>', idxCompTransv)
          
          if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
            puntoInsercionCompTransv = paraStart
            insertarTablaCompTransv = true
          }
        }
        
        if (insertarTablaCompTransv && puntoInsercionCompTransv > -1) {
          // VALIDACIONES CRÍTICAS antes de insertar
          if (!tablaCompetenciasTransversalesXML || tablaCompetenciasTransversalesXML.trim().length === 0) {
            insertarTablaCompTransv = false
          } else if (!tablaCompetenciasTransversalesXML.startsWith('<w:tbl>') || !tablaCompetenciasTransversalesXML.endsWith('</w:tbl>')) {
            insertarTablaCompTransv = false
          } else {
            if (idxCompTransv > -1) {
              // Re-buscar el párrafo completo para asegurarnos de tener los índices correctos
              let paraStart = -1
              for (let i = idxCompTransv; i >= 0; i--) {
                if (documentXml.substring(i, i + 4) === '<w:p') {
                  const charAfter = documentXml.charAt(i + 4)
                  if (charAfter === ' ' || charAfter === '>') {
                    paraStart = i
                    break
                  }
                }
              }
              const paraEnd = documentXml.indexOf('</w:p>', idxCompTransv)
              
              if (paraStart > -1 && paraEnd > -1 && paraEnd > paraStart) {
                const antes = documentXml.substring(0, paraStart)
                const despues = documentXml.substring(paraEnd + 6)
                
                if (!antes.includes('<w:document')) {
                  insertarTablaCompTransv = false
                } else {
                  const nuevoXml = antes + tablaCompetenciasTransversalesXML + despues
                  const tablasAbiertas = (nuevoXml.match(/<w:tbl>/g) || []).length
                  const tablasCerradas = (nuevoXml.match(/<\/w:tbl>/g) || []).length
                  
                  if (tablasAbiertas !== tablasCerradas) {
                    insertarTablaCompTransv = false
                  } else if (!nuevoXml.includes('</w:document>')) {
                    insertarTablaCompTransv = false
                  } else if (!nuevoXml.includes('<w:body') || !nuevoXml.includes('</w:body>')) {
                    insertarTablaCompTransv = false
                  } else {
                    documentXml = nuevoXml
                    zipAfterRender.file('word/document.xml', documentXml)
                    insertarTablaCompTransv = true
                  }
                }
              } else {
                insertarTablaCompTransv = false
              }
            }
          }
        }

        // IMPORTANTE: Releer el documentXml actualizado después de insertar la tabla de competencias transversales
        if (insertarTablaCompTransv) {
          documentXml = zipAfterRender.files['word/document.xml'].asText()
        }
      } catch (errorTabla: any) {
      }

      // Verificación final: usar zipAfterRender que tiene todos los cambios
      let xmlFinal = zipAfterRender.files['word/document.xml']?.asText()
      if (!xmlFinal) {
        throw new Error('El XML del documento no existe después de las modificaciones')
      }
      
      // Validaciones críticas del XML final
      const tablasFinalesAbiertas = (xmlFinal.match(/<w:tbl>/g) || []).length
      const tablasFinalesCerradas = (xmlFinal.match(/<\/w:tbl>/g) || []).length
      
      if (tablasFinalesAbiertas !== tablasFinalesCerradas) {
        throw new Error(`ERROR CRÍTICO: Tablas desbalanceadas en el documento final (${tablasFinalesAbiertas} abiertas vs ${tablasFinalesCerradas} cerradas)`)
      }
      
      // Verificar estructura básica del XML
      if (!xmlFinal.includes('<?xml')) {
        throw new Error('ERROR CRÍTICO: XML no tiene declaración XML válida')
      }
      if (!xmlFinal.includes('<w:document') || !xmlFinal.includes('</w:document>')) {
        throw new Error('ERROR CRÍTICO: XML no tiene estructura de documento válida')
      }
      if (!xmlFinal.includes('<w:body') || !xmlFinal.includes('</w:body>')) {
        throw new Error('ERROR CRÍTICO: XML no tiene estructura de body válida')
      }
      
      // Validar que el XML tenga la estructura correcta: <w:document><w:body>...</w:body></w:document>
      const bodyStart = xmlFinal.indexOf('<w:body')
      const bodyEnd = xmlFinal.lastIndexOf('</w:body>')
      if (bodyStart === -1 || bodyEnd === -1 || bodyEnd <= bodyStart) {
        throw new Error('ERROR CRÍTICO: La estructura del body no es válida')
      }
      
      // Validar que todas las tablas estén dentro del body
      const bodyContent = xmlFinal.substring(bodyStart, bodyEnd + 8)
      const tablasEnBody = (bodyContent.match(/<w:tbl>/g) || []).length

      // Generar prompt con GPT y agregar al final del documento
      try {
        // Leer directamente el Word del prompt (igual que generate-prompt)
        const promptWordPath = path.join(process.cwd(), 'templates', 'PROMT_UNIDAD DE APRENDIZAJE.docx')
        if (fs.existsSync(promptWordPath)) {
          const wordBuffer = fs.readFileSync(promptWordPath)
          const result = await mammoth.extractRawText({ buffer: wordBuffer })
          let promptText = result.value || ''
          
          // Obtener competencias con capacidades y desempeños completos (igual que generate-prompt)
          let competenciasConDatos: Array<{
            competenciaNumero: string;
            competenciaDescripcion: string;
            capacidades: Array<{
              capacidadDescripcion: string;
              desempenios: string[];
            }>;
          }> = []
          
          try {
            const areaIdParaPrompt = formData.areaId || (formData.area && typeof formData.area === 'string' ? formData.area.split('|')[0] : formData.area)
            const gradoIdParaPrompt = formData.gradoId || (formData.grado && typeof formData.grado === 'string' ? formData.grado.split('|')[0] : formData.grado)
            
            if (areaIdParaPrompt && gradoIdParaPrompt) {
              const competenciasPrompt = await prisma.competencia.findMany({
                where: {
                  idarea: parseInt(String(areaIdParaPrompt)),
                  idgrado: parseInt(String(gradoIdParaPrompt)),
                  transversal: false
                },
                include: {
                  capacidades: {
                    include: {
                      desempenios: {
                        orderBy: { id: 'asc' }
                      }
                    },
                    orderBy: { id: 'asc' }
                  }
                },
                orderBy: { numeroCompetencia: 'asc' }
              })
              
              competenciasPrompt.forEach(comp => {
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
          }
          
          // Preparar datos para el prompt (similar a data pero con nombres específicos del prompt)
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
          
          // Reemplazar variables manualmente (docxtemplater no funciona bien con texto plano)
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
          
          // Detectar si hay placeholder {{matriz}} para reemplazar con tablas en texto plano
          const tieneMatriz = promptText.includes('{{matriz}}')
          
          if (tieneMatriz) {
            // Generar matriz en formato de texto plano para GPT (EXACTAMENTE igual que generate-prompt)
            let matrizTexto = ''
            
            if (competenciasConDatos.length === 0) {
              matrizTexto = 'No se encontraron competencias para mostrar en la matriz.'
            } else {
              competenciasConDatos.forEach((competencia, compIdx) => {
                if (compIdx > 0) {
                  matrizTexto += '\n\n'
                }
                
                matrizTexto += `${competencia.competenciaNumero}: ${competencia.competenciaDescripcion}\n`
                matrizTexto += 'COMPETENCIA | CAPACIDADES | DESEMPEÑOS PRECISADOS\n'
                matrizTexto += '--- | --- | ---\n'
                
                competencia.capacidades.forEach((capacidad, capIdx) => {
                  const desempeniosTexto = capacidad.desempenios
                    .map((des, idx) => `${idx + 1}. ${des}`)
                    .join('; ')
                  
                  const competenciaTexto = capIdx === 0 ? competencia.competenciaDescripcion : ''
                  matrizTexto += `${competenciaTexto} | ${capacidad.capacidadDescripcion} | ${desempeniosTexto}\n`
                })
              })
            }
            
            // Reemplazar {{matriz}} con el texto de la matriz
            promptText = promptText.replace('{{matriz}}', matrizTexto)
          }
          
          // Enviar a GPT (igual que generate-prompt)
          if (process.env.OPENAI_API_KEY) {
            const startTime = Date.now()
            
            // Crear un AbortController para manejar timeouts más largos (igual que generate-prompt)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos de timeout
            
            let openaiResponse: Response | undefined
            const maxRetries = 3
            let lastError: any = null
            
            // Intentar con reintentos (igual que generate-prompt)
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      {
                        role: 'user',
                        content: promptText
                      }
                    ],
                    max_tokens: 4000,
                    temperature: 0.7,
                  }),
                  signal: controller.signal,
                })
                
                // Si la respuesta es exitosa, salir del loop
                if (openaiResponse.ok) {
                  clearTimeout(timeoutId)
                  const elapsedTime = Date.now() - startTime
                  break
                }
                
                // Si no es exitosa pero no es el último intento, esperar y reintentar
                if (attempt < maxRetries) {
                  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
                  await new Promise(resolve => setTimeout(resolve, delay))
                } else {
                  throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
                }
                
              } catch (fetchError: any) {
                lastError = fetchError
                
                // Si es el último intento, lanzar el error
                if (attempt === maxRetries) {
                  clearTimeout(timeoutId)
                  throw fetchError
                }
                
                // Si no es el último intento y es un error de conexión, esperar y reintentar
                if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.name === 'AbortError') {
                  const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
                  await new Promise(resolve => setTimeout(resolve, delay))
                  continue
                }
                
                // Para otros errores, no reintentar
                throw fetchError
              }
            }
            
            if (!openaiResponse || !openaiResponse.ok) {
              if (!openaiResponse) {
                throw new Error('No se pudo obtener respuesta de OpenAI')
              } else {
                const errorData = await openaiResponse.json().catch(() => ({}))
                throw new Error(`Error al comunicarse con GPT: ${errorData.error?.message || openaiResponse.statusText}`)
              }
            }
            
            // Si llegamos aquí, la respuesta fue exitosa
            const gptData = await openaiResponse.json()
            const gptResponse = gptData.choices?.[0]?.message?.content || ''
            
            if (gptResponse) {
              // Procesar la respuesta de GPT: convertir tablas a formato Word y mantener texto como párrafos
              // IMPORTANTE: Preservar TODO el contenido tal cual llega de GPT (EXACTAMENTE igual que generate-prompt)
              // NO limpiar <br> aquí, se limpiará dentro de las celdas de la tabla
              const lineas = gptResponse.split('\n')
              
              // Función para parsear tablas desde el texto (formato con pipes |) - EXACTAMENTE igual que generate-prompt
              const parsearTabla = (lineas: string[]): { esTabla: boolean; filas?: string[][]; numColumnas?: number } => {
                if (lineas.length === 0) return { esTabla: false }
                
                // Detectar si las líneas tienen pipes (formato de tabla)
                const lineasConPipes = lineas.filter((l: string) => l.trim().includes('|') && l.trim().split('|').length > 2)
                
                if (lineasConPipes.length === 0) return { esTabla: false }
                
                // Parsear las filas de la tabla
                const filas: string[][] = []
                let numColumnas = 0
                
                for (const linea of lineasConPipes) {
                  // Dividir por pipes y limpiar espacios
                  // IMPORTANTE: NO eliminar columnas vacías, solo hacer trim para preservar TODAS las columnas
                  // EXACTAMENTE igual que generate-prompt - preservar TODAS las columnas
                  const columnas = linea
                    .split('|')
                    .map(col => col.trim())
                  
                  // Ignorar líneas separadoras (como |---|---|)
                  if (columnas.length > 0 && !columnas.every(col => /^[-:]+$/.test(col))) {
                    filas.push(columnas)
                    numColumnas = Math.max(numColumnas, columnas.length)
                  }
                }
                
                
                if (filas.length === 0) return { esTabla: false }
                
                // Normalizar el número de columnas en todas las filas
                filas.forEach(fila => {
                  while (fila.length < numColumnas) {
                    fila.push('')
                  }
                })
                
                return { esTabla: true, filas, numColumnas }
              }
              
              // Función para convertir tabla parseada a XML de Word (EXACTAMENTE igual que crearTablaWord de generate-prompt)
              // IMPORTANTE: Eliminar la primera y última columna
              const convertirTablaAWordXML = (filas: string[][], numColumnas: number): string => {
                // Eliminar primera y última columna - ajustar número de columnas
                const numColumnasAjustado = Math.max(1, numColumnas - 2)
                // La tabla debe tener 8 columnas: 5 para PROPÓSITOS + 3 para EVALUACIÓN
                const columnasEsperadas = 8
                const anchoColumna = Math.floor(14869 / columnasEsperadas) // Ancho total de página / número de columnas
                
                let tablaXML = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>`
                
                // Agregar 8 columnas al grid
                for (let i = 0; i < columnasEsperadas; i++) {
                  tablaXML += `<w:gridCol w:w="${anchoColumna}"/>`
                }
                tablaXML += `</w:tblGrid>`
                
                // FILA 1: Encabezados agrupados (PROPÓSITOS DE APRENDIZAJE y EVALUACIÓN)
                // Verde (#47D459) con texto blanco
                tablaXML += `<w:tr><w:trPr><w:trHeight w:val="400" w:rule="atLeast"/></w:trPr>`
                
                // Celda 1: PROPÓSITOS DE APRENDIZAJE (colspan=5)
                tablaXML += `<w:tc><w:tcPr><w:gridSpan w:val="5"/><w:tcW w:w="${anchoColumna * 5}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="47D459"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>`
                tablaXML += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>${escaparXML('PROPÓSITOS DE APRENDIZAJE')}</w:t></w:r></w:p></w:tc>`
                
                // Celda 2: EVALUACIÓN (colspan=3)
                tablaXML += `<w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="${anchoColumna * 3}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="47D459"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>`
                tablaXML += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>${escaparXML('EVALUACIÓN')}</w:t></w:r></w:p></w:tc>`
                
                tablaXML += `</w:tr>`
                
                // FILA 2: Sub-headers (verde claro con texto negro)
                tablaXML += `<w:tr><w:trPr><w:trHeight w:val="400" w:rule="atLeast"/></w:trPr>`
                
                // Sub-headers de PROPÓSITOS DE APRENDIZAJE (5 columnas)
                const subHeadersPropuestos = [
                  'TÍTULOS',
                  'CAMPO TEMÁTICO / CONOCIMIENTO',
                  'COMPETENCIA',
                  'CAPACIDADES',
                  'DESEMPEÑO PRECISADO'
                ]
                
                subHeadersPropuestos.forEach((header) => {
                  tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${anchoColumna}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>`
                  tablaXML += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>${escaparXML(header)}</w:t></w:r></w:p></w:tc>`
                })
                
                // Sub-headers de EVALUACIÓN (3 columnas)
                const subHeadersEvaluacion = [
                  'EVIDENCIAS',
                  'CRITERIOS',
                  'INSTRUMENTO DE EVALUACIÓN'
                ]
                
                subHeadersEvaluacion.forEach((header) => {
                  tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${anchoColumna}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>`
                  tablaXML += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>${escaparXML(header)}</w:t></w:r></w:p></w:tc>`
                })
                
                tablaXML += `</w:tr>`
                
                // FILAS DE DATOS: Agregar filas de datos (eliminando primera y última columna, y también las primeras dos filas de la tabla original)
                filas.forEach((fila, indiceFila) => {
                  // Eliminar la primera fila (índice 0) que contiene los encabezados originales
                  // y la segunda fila (índice 1) de la tabla original (ya las reemplazamos con nuestros headers)
                  if (indiceFila === 0 || indiceFila === 1) {
                    return // Saltar la primera y segunda fila
                  }
                  
                  // Eliminar primera columna (índice 0) y última columna (slice(1, -1))
                  const filaSinPrimeraYUltima = fila.slice(1, -1)
                  
                  // Asegurar que tenemos exactamente 8 columnas (rellenar o truncar si es necesario)
                  const filaAjustada: string[] = []
                  for (let i = 0; i < columnasEsperadas; i++) {
                    filaAjustada.push(filaSinPrimeraYUltima[i] || ' ')
                  }
                  
                  tablaXML += `<w:tr><w:trPr><w:trHeight w:val="400" w:rule="atLeast"/></w:trPr>`
                  
                  // Calcular el número de sesión (empezando desde 1, ya que saltamos las filas 0 y 1)
                  const numeroSesion = indiceFila - 1
                  
                  filaAjustada.forEach((celda, indiceColumna) => {
                    // Limpiar <br> del texto de la celda, pero preservar TODO el contenido
                    let celdaLimpia = (celda || ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
                    
                    tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${anchoColumna}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr>`
                    
                    // Si es la primera columna (TÍTULOS), agregar "Sesión X:" en una línea y el título en la siguiente
                    if (indiceColumna === 0) {
                      const sesionEscapada = escaparXML(`Sesión ${numeroSesion}:`)
                      const tituloEscapado = escaparXML(celdaLimpia.trim())
                      
                      // Primera línea: "Sesión X:"
                      tablaXML += `<w:p><w:pPr><w:spacing w:after="50" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="000000"/></w:rPr><w:t>${sesionEscapada}</w:t></w:r></w:p>`
                      
                      // Segunda línea: el título
                      tablaXML += `<w:p><w:pPr><w:spacing w:after="100" w:before="0"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="000000"/></w:rPr><w:t>${tituloEscapado}</w:t></w:r></w:p>`
                    } else {
                      // Para las demás columnas, procesar normalmente
                      // Si la celda tiene múltiples líneas (por <br> convertidos), crear múltiples párrafos
                      const lineasCelda = celdaLimpia.split('\n').filter((l: string) => l.trim() || l === '')
                      
                      if (lineasCelda.length > 1) {
                        // Múltiples líneas - crear múltiples párrafos
                        lineasCelda.forEach((linea, idx) => {
                          const lineaEscapada = escaparXML(linea || ' ')
                          tablaXML += `<w:p><w:pPr><w:spacing w:after="${idx < lineasCelda.length - 1 ? 50 : 100}" w:before="${idx === 0 ? 100 : 50}"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="000000"/></w:rPr><w:t>${lineaEscapada}</w:t></w:r></w:p>`
                        })
                      } else {
                        // Una sola línea
                        const celdaEscapada = escaparXML(celdaLimpia || ' ')
                        tablaXML += `<w:p><w:pPr><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="000000"/></w:rPr><w:t>${celdaEscapada}</w:t></w:r></w:p>`
                      }
                    }
                    
                    tablaXML += `</w:tc>`
                  })
                  
                  tablaXML += `</w:tr>`
                })
                
                tablaXML += `</w:tbl>`
                return tablaXML
              }
              
              let tablaDidacticaXML = ''
              let bloqueActual: string[] = []
              
              // Solo procesar tablas, eliminar todo el texto fuera de las tablas
              for (let i = 0; i < lineas.length; i++) {
                const linea = lineas[i]
                const lineaTrim = linea.trim()
                
                // Si la línea está vacía
                if (lineaTrim === '') {
                  // Si hay un bloque acumulado, procesarlo SOLO si es una tabla
                  if (bloqueActual.length > 0) {
                    const tablaInfo = parsearTabla(bloqueActual)
                    
                    if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
                      // Crear tabla de Word
                      const tablaXML = convertirTablaAWordXML(tablaInfo.filas, tablaInfo.numColumnas)
                      tablaDidacticaXML += tablaXML
                    }
                    // Si no es tabla, NO agregar nada (eliminar el texto)
                    bloqueActual = []
                  }
                } 
                // Si la línea tiene contenido
                else {
                  // Detectar si podría ser parte de una tabla (tiene pipes)
                  const tienePipes = linea.includes('|')
                  
                  // Si tiene pipes, agregar al bloque actual
                  if (tienePipes) {
                    bloqueActual.push(linea)
                  } else {
                    // Si hay un bloque con tablas, procesarlo primero
                    if (bloqueActual.length > 0) {
                      const tablaInfo = parsearTabla(bloqueActual)
                      
                      if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
                        const tablaXML = convertirTablaAWordXML(tablaInfo.filas, tablaInfo.numColumnas)
                        tablaDidacticaXML += tablaXML
                      }
                      // Si no es tabla, NO agregar nada (eliminar el texto)
                      bloqueActual = []
                    }
                    // Si la línea no tiene pipes, NO agregar nada (eliminar el texto)
                  }
                }
              }
              
              // Procesar el último bloque si queda (SOLO si es tabla)
              if (bloqueActual.length > 0) {
                const tablaInfo = parsearTabla(bloqueActual)
                
                if (tablaInfo.esTabla && tablaInfo.filas && tablaInfo.numColumnas) {
                  const tablaXML = convertirTablaAWordXML(tablaInfo.filas, tablaInfo.numColumnas)
                  tablaDidacticaXML += tablaXML
                }
                // Si no es tabla, NO agregar nada (eliminar el texto)
              }
              
              // Leer el XML actualizado después del render - usar el más reciente del zip
              // IMPORTANTE: Leer siempre del zip porque puede haber sido modificado por otras tablas
              let xmlFinalActualizado = zipAfterRender.files['word/document.xml']?.asText() || xmlFinal
              
              // Buscar placeholder {{tabladidactica}} - buscar todas las variaciones posibles
              let placeholderIndex = xmlFinalActualizado.indexOf('__TABLA_DIDACTICA_PLACEHOLDER__')
              let textoPlaceholder = '__TABLA_DIDACTICA_PLACEHOLDER__'
              
              // Si no se encuentra, buscar sin guiones al inicio
              if (placeholderIndex === -1) {
                placeholderIndex = xmlFinalActualizado.indexOf('TABLA_DIDACTICA_PLACEHOLDER')
                if (placeholderIndex > -1) {
                  textoPlaceholder = 'TABLA_DIDACTICA_PLACEHOLDER'
                }
              }
              
              // Si aún no se encuentra, buscar el texto que aparece en el documento (sin PLACEHOLDER)
              if (placeholderIndex === -1) {
                placeholderIndex = xmlFinalActualizado.indexOf('TABLA_DIDACTICA')
                if (placeholderIndex > -1) {
                  // Encontrar el texto completo alrededor de TABLA_DIDACTICA
                  const inicio = Math.max(0, placeholderIndex - 10)
                  const fin = Math.min(xmlFinalActualizado.length, placeholderIndex + 50)
                  const contexto = xmlFinalActualizado.substring(inicio, fin)
                  // Intentar encontrar el texto completo del placeholder
                  const match = contexto.match(/[A-Z_]*TABLA_DIDACTICA[A-Z_]*/)
                  if (match) {
                    textoPlaceholder = match[0]
                    placeholderIndex = xmlFinalActualizado.indexOf(textoPlaceholder, inicio)
                  } else {
                    textoPlaceholder = 'TABLA_DIDACTICA'
                  }
                }
              }
              
              if (placeholderIndex > -1) {
                // Buscar el párrafo que contiene el placeholder para reemplazarlo
                let paraStart = -1
                for (let i = placeholderIndex; i >= 0; i--) {
                  if (xmlFinalActualizado.substring(i, i + 4) === '<w:p') {
                    const charAfter = xmlFinalActualizado.charAt(i + 4)
                    if (charAfter === ' ' || charAfter === '>') {
                      paraStart = i
                      break
                    }
                  }
                }
                
                const paraEnd = xmlFinalActualizado.indexOf('</w:p>', placeholderIndex)
                
                if (paraStart > -1 && paraEnd > -1) {
                  // Reemplazar TODO el párrafo con la tabla
                  const antes = xmlFinalActualizado.substring(0, paraStart)
                  const despues = xmlFinalActualizado.substring(paraEnd + 6)
                  xmlFinalActualizado = antes + tablaDidacticaXML + despues
                  zipAfterRender.file('word/document.xml', xmlFinalActualizado)
                  xmlFinal = xmlFinalActualizado
                } else {
                  // Fallback: reemplazar solo el placeholder usando el textoPlaceholder encontrado
                  const antes = xmlFinalActualizado.substring(0, placeholderIndex)
                  const despues = xmlFinalActualizado.substring(placeholderIndex + textoPlaceholder.length)
                  xmlFinalActualizado = antes + tablaDidacticaXML + despues
                  zipAfterRender.file('word/document.xml', xmlFinalActualizado)
                  xmlFinal = xmlFinalActualizado
                }
              } else {
                const placeholderIndex2 = xmlFinalActualizado.indexOf('{{tabladidactica}}')
                if (placeholderIndex2 > -1) {
                  // Similar lógica de reemplazo
                  let paraStart = -1
                  for (let i = placeholderIndex2; i >= 0; i--) {
                    if (xmlFinalActualizado.substring(i, i + 4) === '<w:p') {
                      const charAfter = xmlFinalActualizado.charAt(i + 4)
                      if (charAfter === ' ' || charAfter === '>') {
                        paraStart = i
                        break
                      }
                    }
                  }
                  const paraEnd = xmlFinalActualizado.indexOf('</w:p>', placeholderIndex2)
                  if (paraStart > -1 && paraEnd > -1) {
                    const antes = xmlFinalActualizado.substring(0, paraStart)
                    const despues = xmlFinalActualizado.substring(paraEnd + 6)
                    xmlFinalActualizado = antes + tablaDidacticaXML + despues
                    zipAfterRender.file('word/document.xml', xmlFinalActualizado)
                    xmlFinal = xmlFinalActualizado
                  }
                } else {
                  // Buscar también el texto literal que aparece en el documento
                  const placeholderIndex3 = xmlFinalActualizado.indexOf('TABLA_DIDACTICA_PLACEHOLDER')
                  if (placeholderIndex3 > -1) {
                    let paraStart = -1
                    for (let i = placeholderIndex3; i >= 0; i--) {
                      if (xmlFinalActualizado.substring(i, i + 4) === '<w:p') {
                        const charAfter = xmlFinalActualizado.charAt(i + 4)
                        if (charAfter === ' ' || charAfter === '>') {
                          paraStart = i
                          break
                        }
                      }
                    }
                    const paraEnd = xmlFinalActualizado.indexOf('</w:p>', placeholderIndex3)
                    if (paraStart > -1 && paraEnd > -1) {
                      const antes = xmlFinalActualizado.substring(0, paraStart)
                      const despues = xmlFinalActualizado.substring(paraEnd + 6)
                      xmlFinalActualizado = antes + tablaDidacticaXML + despues
                      zipAfterRender.file('word/document.xml', xmlFinalActualizado)
                      xmlFinal = xmlFinalActualizado
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error: any) {
        // No fallar la generación del documento si hay error con GPT
      }

      // IMPORTANTE: Asegurar que el zip tenga el XML actualizado (con la tabla didáctica si se insertó)
      // Leer el XML más reciente del zip antes de generar
      const xmlFinalParaGenerar = zipAfterRender.files['word/document.xml']?.asText() || xmlFinal
      zipAfterRender.file('word/document.xml', xmlFinalParaGenerar)
      
      // Generar el buffer del documento usando zipAfterRender que tiene todos los cambios
      const buf = zipAfterRender.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })

      if (!buf || buf.length === 0) {
        throw new Error('El buffer del documento está vacío')
      }

      // Generar nombre del archivo
      const areaNombre = (formData.area || 'COMUNICACION').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const gradoNombre = (formData.grado || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const unidadNombre = formData.unidad || '0'
      const fileName = `UNIDAD_${unidadNombre}_${areaNombre}_${gradoNombre}_${Date.now()}.docx`

      // Devolver el archivo como respuesta
      return new NextResponse(Buffer.from(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': buf.length.toString(),
        },
      })
      
    } catch (error: any) {
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
          details: process.env.NODE_ENV === 'development' ? errorDetails : 'Revisa que todas las variables en la plantilla estén escritas correctamente como {{variable}}'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    let errorMessage = 'Error al generar el documento'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || ''
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : 'Revisa los logs del servidor para más detalles'
      },
      { status: 500 }
    )
  }
}

