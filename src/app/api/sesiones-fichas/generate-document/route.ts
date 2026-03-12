import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const TIEMPOS_POR_DURACION: Record<string, { inicio: number; desarrollo: number; cierre: number }> = {
  '45':  { inicio: 10,  desarrollo: 25, cierre: 10  },
  '90':  { inicio: 15,  desarrollo: 60, cierre: 15  },
  '135': { inicio: 20,  desarrollo: 95, cierre: 20  },
}
const PROMPT_TEMPLATE_NAME = 'PROMT DE SESION DE PROBADO..docx'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { formData, sesionData, unidadData, tableTextFromPrompt, contenidoDesdeBD } = await request.json()

    if (!formData) {
      return NextResponse.json(
        { error: 'Datos del formulario son requeridos' },
        { status: 400 }
      )
    }

    const tInicio = Date.now()
    let tUltimo = tInicio

    // Obtener competencias transversales por grado (para {{tablacompetencias}})
    type CompTransversalRow = { competenciadescripcion: string; capacidades: Array<{ capacidad: string; primerDesempenio: string }> }
    let competenciasTransversalesParaTabla: CompTransversalRow[] = []
    const gradoIdNum = formData.gradoId != null ? parseInt(String(formData.gradoId), 10) : NaN
    if (!isNaN(gradoIdNum)) {
      try {
        const comptransversales = await prisma.comptransversal.findMany({
          where: { idgrado: gradoIdNum },
          include: {
            capacidadtransversales: {
              include: {
                desempeniotransversales: { orderBy: { iddesempeniotransversal: 'asc' } }
              },
              orderBy: { idcapacidadtransversal: 'asc' }
            }
          },
          orderBy: { idcomtransversal: 'asc' }
        })
        competenciasTransversalesParaTabla = comptransversales.map(comp => ({
          competenciadescripcion: comp.descripcion || '',
          capacidades: comp.capacidadtransversales.map(cap => ({
            capacidad: cap.descripcion || '',
            primerDesempenio: (cap.desempeniotransversales[0]?.descripcion) || ''
          })).filter(c => c.capacidad || c.primerDesempenio)
        })).filter(c => c.competenciadescripcion && c.capacidades.length > 0)
      } catch (e) {
        console.error('Error al cargar competencias transversales por grado:', e)
      }
    }
    console.log(`[generate-document] Competencias transversales: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Ruta a la plantilla
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'FORMATO DE SESIÓN.docx'
    )

    // Verificar que la plantilla existe
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada: FORMATO DE SESIÓN.docx' },
        { status: 404 }
      )
    }

    // Leer la plantilla
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
        // Si una variable no existe, devolver string vacío
        return ''
      },
      errorLogging: true
    })
    console.log(`[generate-document] Lectura plantilla + init doc: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Determinar número de sesión y nombre de sesión
    let numsesion = ''
    let nombresesion = ''
    let competencia = ''
    let standares = ''
    let capacidades = ''
    let desempenio = ''
    let campotematico = ''
    let evidencia = ''
    let criterios = ''
    
    if (formData.continuarUnidad && sesionData) {
      // Si viene de una sesión guardada
      numsesion = sesionData.numeroSesion || '1'
      nombresesion = sesionData.titulo || formData.tituloSesion || ''
      
      // Función auxiliar para limpiar etiquetas <br>
      const limpiarBr = (texto: string): string => {
        if (!texto) return ''
        return texto.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
      }
      
      // Obtener datos directamente de la sesión guardada
      // Formatear capacidades con viñetas y saltos de línea
      if (sesionData.capacidadesSeleccionadas && Array.isArray(sesionData.capacidadesSeleccionadas)) {
        capacidades = sesionData.capacidadesSeleccionadas
          .filter((cap: string) => cap && cap.trim())
          .map((cap: string) => {
            const capLimpio = limpiarBr(cap)
            return capLimpio ? `• ${capLimpio}` : ''
          })
          .filter((cap: string) => cap)
          .join('\n')
      }
      
      // Formatear desempeños con numeración (1., 2., 3., etc.)
      if (sesionData.desempeniosSeleccionados && Array.isArray(sesionData.desempeniosSeleccionados)) {
        const desempeniosLimpios = sesionData.desempeniosSeleccionados
          .filter((des: string) => des && des.trim())
          .map((des: string) => limpiarBr(des))
          .filter((des: string) => des)
        
        desempenio = desempeniosLimpios
          .map((des: string, index: number) => `${index + 1}. ${des}`)
          .join('\n')
      }
      
      // Campo temático (texto directo, limpiar <br>)
      campotematico = limpiarBr(sesionData.campoTematico || '')
      
      // Evidencias (texto directo, limpiar <br>)
      evidencia = limpiarBr(sesionData.evidencias || '')
      
      // Criterios con viñetas y saltos de línea
      if (sesionData.criterios) {
        // Si es un string, puede venir con saltos de línea o separado
        if (typeof sesionData.criterios === 'string') {
          const criteriosLimpio = limpiarBr(sesionData.criterios)
          const criteriosArray = criteriosLimpio.split('\n').filter((c: string) => c.trim())
          criterios = criteriosArray
            .map((c: string) => {
              const criterioLimpio = c.trim()
              // Si ya tiene viñeta, mantenerla, si no, agregarla
              return criterioLimpio.startsWith('•') ? criterioLimpio : `• ${criterioLimpio}`
            })
            .join('\n')
        } else if (Array.isArray(sesionData.criterios)) {
          criterios = sesionData.criterios
            .filter((c: string) => c && c.trim())
            .map((c: string) => {
              const criterioLimpio = limpiarBr(c).trim()
              return criterioLimpio.startsWith('•') ? criterioLimpio : `• ${criterioLimpio}`
            })
            .filter((c: string) => c)
            .join('\n')
        }
      }
      
      // Obtener competencia y estándares desde la unidad de aprendizaje
      if (unidadData && unidadData.areaId && unidadData.gradoId && unidadData.unidad) {
        try {
          const anio = new Date().getFullYear()
          const unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
            where: {
              idusuario: userId,
              anio: anio,
              areaId: unidadData.areaId,
              gradoId: unidadData.gradoId,
              unidad: unidadData.unidad
            }
          })
          
          if (unidadAprendizaje && unidadAprendizaje.competencias) {
            // competencias es un JSON array con estructura: [{ competencianro, competenciadescripcion, estandares }]
            const competenciasArray = unidadAprendizaje.competencias as Array<{
              competencianro: string
              competenciadescripcion: string
              estandares: string
            }>
            
            // Obtener la primera competencia de la sesión (si hay competencias en sesionData)
            if (sesionData.competenciasSeleccionadas && sesionData.competenciasSeleccionadas.length > 0) {
              const competenciaSesion = sesionData.competenciasSeleccionadas[0] // Primera competencia de la sesión
              
              // Buscar la competencia en el array de competencias guardadas
              const competenciaEncontrada = competenciasArray.find((comp: any) => {
                // Comparar por descripción (puede ser exacta o parcial)
                const descripcionComp = comp.competenciadescripcion || ''
                return descripcionComp === competenciaSesion || 
                       descripcionComp.includes(competenciaSesion) || 
                       competenciaSesion.includes(descripcionComp)
              })
              
              if (competenciaEncontrada) {
                competencia = competenciaEncontrada.competenciadescripcion || ''
                standares = competenciaEncontrada.estandares || ''
              } else if (competenciasArray.length > 0) {
                // Si no se encuentra, usar la primera competencia disponible
                competencia = competenciasArray[0].competenciadescripcion || ''
                standares = competenciasArray[0].estandares || ''
              }
            } else if (competenciasArray.length > 0) {
              // Si no hay competencias en la sesión, usar la primera competencia disponible
              competencia = competenciasArray[0].competenciadescripcion || ''
              standares = competenciasArray[0].estandares || ''
            }
          }
        } catch (error) {
          console.error('Error al obtener competencia y estándares:', error)
        }
      }
    } else {
      // Si es una sesión nueva
      numsesion = '1'
      nombresesion = formData.tituloSesion || ''
    }

    // Si standares sigue vacío, obtener desde Competencia/Estandar por areaId, gradoId (y nivel) y competencia seleccionada
    if (!standares || !standares.trim()) {
      const areaIdNum = formData.areaId ? parseInt(String(formData.areaId), 10) : (unidadData?.areaId ? parseInt(String(unidadData.areaId), 10) : 0)
      const gradoIdNum = formData.gradoId ? parseInt(String(formData.gradoId), 10) : (unidadData?.gradoId ? parseInt(String(unidadData.gradoId), 10) : 0)
      const competenciaBuscar = (sesionData?.competenciasSeleccionadas && Array.isArray(sesionData.competenciasSeleccionadas) && sesionData.competenciasSeleccionadas.length > 0)
        ? String(sesionData.competenciasSeleccionadas[0]).trim()
        : ''
      console.log('[generate-document] standares vacío - intentando fallback BD. areaIdNum:', areaIdNum, 'gradoIdNum:', gradoIdNum, 'competenciaBuscar:', competenciaBuscar ? competenciaBuscar.substring(0, 60) + '...' : '(vacío)')
      if (areaIdNum > 0 && gradoIdNum > 0) {
        try {
          // Incluir idnivel: Competencia exige nivel; intentar "Secundaria" o cualquier nivel
          let nivel = await prisma.nivel.findFirst({ where: { descripcion: { contains: 'Secundaria', mode: 'insensitive' } } })
          if (!nivel) nivel = await prisma.nivel.findFirst()
          const whereCompetencia: { idarea: number; idgrado: number; idnivel?: number; transversal?: boolean } = {
            idarea: areaIdNum,
            idgrado: gradoIdNum,
            transversal: false
          }
          if (nivel) whereCompetencia.idnivel = nivel.id

          let lista = await prisma.competencia.findMany({
            where: whereCompetencia,
            include: { estandares: { orderBy: { ordenamiento: 'asc' } } }
          })
          // Si con nivel no hay resultados, buscar solo por área y grado
          if (lista.length === 0) {
            lista = await prisma.competencia.findMany({
              where: { idarea: areaIdNum, idgrado: gradoIdNum },
              include: { estandares: { orderBy: { ordenamiento: 'asc' } } }
            })
          }

          let compElegida = lista.find((c) => c.estandares && c.estandares.length > 0) || lista[0]
          if (competenciaBuscar && lista.length > 1) {
            const encontrada = lista.find((c) => {
              const d = (c.descripcion || '').trim()
              return d === competenciaBuscar || d.includes(competenciaBuscar) || competenciaBuscar.includes(d)
            })
            if (encontrada && encontrada.estandares && encontrada.estandares.length > 0) compElegida = encontrada
            else if (encontrada) compElegida = encontrada
          }

          if (compElegida && compElegida.estandares && compElegida.estandares.length > 0) {
            competencia = competencia || (compElegida.descripcion ?? '')
            standares = compElegida.estandares
              .map((est, i) => `${i + 1}. ${(est.descripcion || '').trim()}`)
              .join('\n')
            console.log(`[generate-document] Estándares obtenidos desde BD (Competencia id=${compElegida.id}): ${compElegida.estandares.length} estándar(es)`)
          } else {
            console.log('[generate-document] Fallback BD: lista competencias=', lista.length, 'compElegida=', compElegida?.id, 'estandares en compElegida=', compElegida?.estandares?.length ?? 0)
          }
        } catch (e) {
          console.error('[generate-document] Error al obtener estándares desde Competencia:', e)
        }
      } else {
        console.log('[generate-document] Fallback BD no ejecutado: areaIdNum o gradoIdNum inválidos (<=0)')
      }
    }

    console.log(`[generate-document] Datos sesión (numsesion, competencias, etc.): ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Si el front envía contenido guardado en BD, usarlo y no llamar a la IA
    const usarContenidoBD = contenidoDesdeBD && typeof contenidoDesdeBD === 'object' &&
      (contenidoDesdeBD.motivacion != null || contenidoDesdeBD.saberes != null || contenidoDesdeBD.proposito != null ||
       contenidoDesdeBD.desarrollo != null || contenidoDesdeBD.desarrolloantes != null || contenidoDesdeBD.desarrollodurante != null || contenidoDesdeBD.desarrollodespues != null)

    let tableText = ''
    let tiempoIAms = 0
    if (!usarContenidoBD && process.env.OPENAI_API_KEY) {
      try {
        const duracion = String(formData.duracion || '').trim()
        const tiempos = TIEMPOS_POR_DURACION[duracion] || TIEMPOS_POR_DURACION['45']
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
              const comps = Array.isArray(p.competenciaProceso) ? (p.competenciaProceso as string[]) : typeof p.competenciaProceso === 'string' ? [p.competenciaProceso] : []
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
            for (const [comp, descripciones] of byCompetencia) {
              lineas.push(`• ${comp}`)
              for (const d of descripciones) lineas.push(`  ◦ ${d}`)
            }
            procesosdidacticos = lineas.join('\n')
          } catch (e) {
            console.error('Error al cargar procesos didácticos:', e)
          }
        }
        let enfoquestransversales = ''
        const areaIdU = formData.areaId || ''
        const gradoIdU = formData.gradoId || ''
        const unidadU = formData.unidad || ''
        if (areaIdU && gradoIdU && unidadU) {
          try {
            const anio = new Date().getFullYear()
            const unidad = await prisma.unidadAprendizaje.findFirst({
              where: { idusuario: userId, anio, areaId: String(areaIdU), gradoId: String(gradoIdU), unidad: String(unidadU) },
              select: { enfoquesTransversales: true }
            })
            const raw = unidad?.enfoquesTransversales
            if (raw && Array.isArray(raw) && raw.length > 0) {
              const items = raw as Array<{ enfoque?: string }>
              const unicos = new Set<string>()
              for (const item of items) {
                const e = (item.enfoque || '').trim()
                if (e) unicos.add(e)
              }
              enfoquestransversales = Array.from(unicos).join('\n')
            }
          } catch (e) {
            console.error('Error al cargar enfoques transversales:', e)
          }
        }
        const promptData = {
          area: formData.area ?? '',
          grado: formData.grado ?? '',
          ciclo: formData.ciclo ?? '',
          entidadpublica: formData.tipoIE ?? 'Pública',
          numsesion,
          titulosesion: nombresesion,
          duracion: duracion ? `${duracion} minutos` : '',
          inicio: `${tiempos.inicio} minutos`,
          desarrollo: `${tiempos.desarrollo} minutos`,
          cierre: `${tiempos.cierre} minutos`,
          competencia,
          capacidades,
          desempenios: desempenio,
          enfoquestransversales,
          procesosdidacticos,
        }
        const promptTemplatePath = path.join(process.cwd(), 'templates', PROMPT_TEMPLATE_NAME)
        if (fs.existsSync(promptTemplatePath)) {
          const promptContent = fs.readFileSync(promptTemplatePath, 'binary')
          const promptZip = new PizZip(promptContent)
          const promptDoc = new Docxtemplater(promptZip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => '',
          })
          promptDoc.render(promptData)
          const promptBuffer = promptDoc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
          const extractResult = await mammoth.extractRawText({ buffer: promptBuffer as Buffer })
          const promptText = (extractResult.value || '').trim()
          if (promptText) {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const systemContent = `Eres un experto en diseño de sesiones de aprendizaje. Responde ÚNICAMENTE con una tabla de texto: filas y columnas separadas, SIN mezclar ni combinar celdas.

REGLAS ESTRICTAS DE FORMATO:
1. Una línea = una fila. Nunca pongas varias filas en una sola línea ni mezcles el contenido de columnas.
2. Cada fila tiene exactamente 4 celdas separadas por el carácter | (barra vertical).
3. La primera línea debe ser SIEMPRE la cabecera:
MOMENTOS | PROCESOS PEDAGÓGICOS | ACTIVIDADES DE APRENDIZAJE | TIEMPO

4. A partir de la segunda línea, cada fila de datos con 4 celdas separadas por |. Ejemplo correcto (cada línea es una fila):
INICIO | Motivación | 1. El docente proyecta un video... | 4 min
INICIO | Motivación | 2. Lectura breve situacional... | 2 min
INICIO | Saberes previos | 1. ¿Qué sabes sobre las causas...? | 5 min
INICIO | Saberes previos | 2. ¿Qué medidas conoces...? | 3 min
DESARROLLO | Problematización / Conflicto cognitivo | Planteamiento retador: ¿Cómo diseñarás...? | 10 min
DESARROLLO | Propósito y organización | Propósito: Identificar causas... Organización: Trabajo en parejas. | 5 min
CIERRE | Metacognición | 1. Pregunta de cierre... | 5 min

5. NO combines: cada actividad o ítem en su propia fila. Cada celda con un solo valor (momento, proceso, actividad, tiempo).
6. En PROCESOS PEDAGÓGICOS usa exactamente: Motivación, Saberes previos, Problematización / Conflicto cognitivo, Propósito y organización, Análisis, Metacognición, etc., según corresponda.
7. En MOMENTOS: solo INICIO, DESARROLLO o CIERRE. Si varias filas son del mismo momento y proceso, repite el momento y proceso en cada fila (no dejes celdas vacías para continuar).
8. No escribas nada antes ni después de la tabla. Sin títulos extra ni explicaciones.`
            const requestConfig: Record<string, unknown> = {
              model: 'gpt-5-mini',
              messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: promptText }
              ],
              top_p: 1,
              max_completion_tokens: 16384
            }
            const inicioIA = Date.now()
            const completion = await openaiClient.chat.completions.create(requestConfig as any)
            tiempoIAms = Date.now() - inicioIA
            console.log(`[generate-document] IA: ${tiempoIAms} ms (total: ${Date.now() - tInicio} ms)`)
            tableText = (completion.choices?.[0]?.message?.content || '').trim()
          }
        }
      } catch (err) {
        console.error('Error al llamar IA en generar documento:', err)
      }
    }
    tUltimo = Date.now()

    // Normalizar texto para comparar sin acentos
    const norm = (s: string) => (s || '').normalize('NFD').replace(/\u0300-\u036f/g, '').toLowerCase()

    // Quitar posible bloque de código markdown que devuelve la IA
    if (tableText && /^```/.test(tableText)) {
      tableText = tableText.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    // Extraer motivación, saberes, problematización, propósito y "Antes de la expresión oral" (máx. 3 filas → desarrolloantes)
    let motivacion = ''
    let saberes = ''
    let problematizacion = ''
    let proposito = ''
    let desarrollo = ''
    let desarrolloantes = ''
    let desarrollodurante = ''
    let desarrollodespues = ''
    const sinPrefijoProposito = (s: string) => (String(s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim())
    if (usarContenidoBD) {
      motivacion = (contenidoDesdeBD.motivacion ?? '').toString()
      saberes = (contenidoDesdeBD.saberes ?? '').toString()
      problematizacion = (contenidoDesdeBD.problematizacion ?? '').toString()
      proposito = sinPrefijoProposito((contenidoDesdeBD.proposito ?? '').toString())
      desarrollo = (contenidoDesdeBD.desarrollo ?? '').toString()
      desarrolloantes = (contenidoDesdeBD.desarrolloantes ?? '').toString()
      desarrollodurante = (contenidoDesdeBD.desarrollodurante ?? '').toString()
      desarrollodespues = (contenidoDesdeBD.desarrollodespues ?? '').toString()
      console.log('[generate-document] Usando contenido desde BD (sin llamar a la IA)')
    }
    const soloLetrasYEspacios = (s: string) => (s || '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
    if (tableText) {
      const lineas = tableText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      const filasMotivacion: string[] = []
      const partesSaberes: string[] = []
      const partesProblematizacion: string[] = []
      const partesProposito: string[] = []
      const filasAntesExpresionOral: string[] = []
      const filasDuranteExpresionOral: string[] = []
      const filasDespuesExpresionOral: string[] = []
      let enMotivacion = false
      let enSaberesPrevios = false
      let enProblematizacion = false
      let enProposito = false
      let enAntesExpresionOral = false
      let enDuranteExpresionOral = false
      let enDespuesExpresionOral = false
      const procesosVistos = new Set<string>()
      for (const linea of lineas) {
        const partes = linea.split('|').map((c: string) => c.trim())
        if (partes.length >= 3) {
          const colProcesos = partes[1] || ''
          const colProcesosNorm = norm(colProcesos)
          const actividad = partes.length >= 4 ? partes.slice(2, -1).join('|').trim() : (partes[2] || '')
          if (colProcesosNorm) procesosVistos.add(colProcesosNorm)
          // Normalizar espacios por si la IA devuelve dobles espacios
          const colProcesosNormClean = colProcesosNorm.replace(/\s+/g, ' ').trim()
          // Detección igual que saberes: incluye "motivacion" (con o sin tilde en la respuesta de la IA)
          const esMotivacion = colProcesosNorm.includes('motivacion') || colProcesosNorm.startsWith('motiv')
          // "Antes de la expresión oral" → hasta 3 filas a {{desarrolloantes}}, con guion y salto de línea
          const procClean = soloLetrasYEspacios(colProcesosNormClean)
          const esAntesExpresionOral = procClean === 'antes de la expresion oral' ||
            procClean.startsWith('antes de la expresion oral') ||
            (procClean.includes('antes') && procClean.includes('expresion') && procClean.includes('oral') &&
              !procClean.includes('durante') && !procClean.includes('despues'))
          const esDuranteExpresionOral = (procClean.includes('durante') && procClean.includes('expresion') && procClean.includes('oral') &&
            !procClean.includes('antes') && !procClean.includes('despues'))
          const esDespuesExpresionOral = (procClean.includes('despues') && procClean.includes('expresion') && procClean.includes('oral') &&
            !procClean.includes('antes') && !procClean.includes('durante'))
          if (esMotivacion) {
            enMotivacion = true
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
            if (actividad) filasMotivacion.push(actividad)
          } else if (colProcesosNorm.includes('saberes previos')) {
            enMotivacion = false
            enSaberesPrevios = true
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
            if (actividad) partesSaberes.push(actividad)
          } else if (colProcesosNorm.includes('problematizacion') || colProcesosNorm.includes('conflicto cognitivo')) {
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = true
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
            if (actividad) partesProblematizacion.push(actividad)
          } else if (esAntesExpresionOral) {
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = true
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
            if (actividad) filasAntesExpresionOral.push(actividad)
          } else if (esDuranteExpresionOral) {
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = true
            enDespuesExpresionOral = false
            if (actividad) filasDuranteExpresionOral.push(actividad)
          } else if (esDespuesExpresionOral) {
            // Después de la expresión oral → {{desarrollodespues}}, máx. 3 filas
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = true
            if (actividad) filasDespuesExpresionOral.push(actividad)
          } else if (colProcesosNorm.includes('proposito y organizacion') || colProcesosNorm.includes('proposito') || /prop[oó]sito/i.test(colProcesos)) {
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = true
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
            if (actividad) partesProposito.push(actividad)
          } else if (colProcesos) {
            enMotivacion = false
            enSaberesPrevios = false
            enProblematizacion = false
            enProposito = false
            enAntesExpresionOral = false
            enDuranteExpresionOral = false
            enDespuesExpresionOral = false
          } else {
            if (enMotivacion && actividad) filasMotivacion.push(actividad)
            if (enSaberesPrevios && actividad) partesSaberes.push(actividad)
            if (enProblematizacion && actividad) partesProblematizacion.push(actividad)
            if (enProposito && actividad) partesProposito.push(actividad)
            if (enAntesExpresionOral && actividad) filasAntesExpresionOral.push(actividad)
            if (enDuranteExpresionOral && actividad) filasDuranteExpresionOral.push(actividad)
            if (enDespuesExpresionOral && actividad) filasDespuesExpresionOral.push(actividad)
          }
        }
      }
      // Igual que saberes: unir todas las filas del bloque
      if (filasMotivacion.length > 0) {
        motivacion = filasMotivacion.join('\n')
      }
      const propositoPreview = partesProposito.length > 0 ? partesProposito.join('\n') : ''
      console.log(`[generate-document] Tabla: ${lineas.length} líneas. {{desarrolloantes}}: ${filasAntesExpresionOral.length}, {{desarrollodurante}}: ${filasDuranteExpresionOral.length}, {{desarrollodespues}}: ${filasDespuesExpresionOral.length} filas (máx. 3 c/u)`)
      // Asignar igual que saberes: join de todas las filas del bloque
      if (partesSaberes.length > 0) {
        saberes = partesSaberes.join('\n')
      }
      if (partesProblematizacion.length > 0) {
        problematizacion = partesProblematizacion.join('\n')
      }
      if (partesProposito.length > 0) {
        proposito = sinPrefijoProposito(partesProposito.join('\n'))
      }
      if (filasAntesExpresionOral.length > 0) {
        desarrolloantes = filasAntesExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }
      if (filasDuranteExpresionOral.length > 0) {
        desarrollodurante = filasDuranteExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }
      if (filasDespuesExpresionOral.length > 0) {
        desarrollodespues = filasDespuesExpresionOral.slice(0, 3).map((f) => '- ' + f).join('\n')
      }

      // {{desarrollo}}: filas con MOMENTOS = DESARROLLO, agrupar hasta 3 filas por PROCESOS PEDAGÓGICOS; título = proceso, descripción = actividades con guión y salto de línea
      const filasDesarrollo: Array<{ proceso: string; actividad: string }> = []
      for (const linea of lineas) {
        const partes = linea.split('|').map((c: string) => c.trim())
        if (partes.length < 3) continue
        const momentoRaw = norm((partes[0] || '').trim())
        const esDesarrollo = momentoRaw === 'desarrollo' || momentoRaw.startsWith('desarrollo')
        if (!esDesarrollo) continue
        const colProcesosNorm = norm((partes[1] || '').trim())
        if (colProcesosNorm === 'procesos pedagogicos') continue // cabecera
        const proceso = (partes[1] || '').trim()
        const actividad = partes.length >= 4 ? partes.slice(2, -1).join('|').trim() : (partes[2] || '').trim()
        if (!proceso || !actividad) continue
        filasDesarrollo.push({ proceso, actividad })
      }
      const gruposDesarrollo = new Map<string, string[]>()
      for (const { proceso, actividad } of filasDesarrollo) {
        const arr = gruposDesarrollo.get(proceso) || []
        if (arr.length < 3) arr.push(actividad)
        gruposDesarrollo.set(proceso, arr)
      }
      if (gruposDesarrollo.size > 0) {
        const quitarLlaves = (s: string) => (s || '').replace(/^\{+|\}+$/g, '').trim()
        desarrollo = Array.from(gruposDesarrollo.entries())
          .map(([titulo, actividades]) => `${quitarLlaves(titulo)}\n${actividades.map((a) => '- ' + a).join('\n')}`)
          .join('\n\n')
      }
      console.log(`[generate-document] {{desarrollo}}: ${gruposDesarrollo.size} procesos, ${desarrollo ? desarrollo.length + ' caracteres' : 'vacío'}`)
    }
    console.log(`[generate-document] Parseo tabla (motivación, saberes, etc.): ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    tUltimo = Date.now()

    // Guardar en BD la sesión con el contenido extraído (motivación, saberes, etc.) para poder reutilizarlo sin llamar a la IA
    const areaIdGuardar = (unidadData?.areaId ?? formData.areaId) ? String(unidadData?.areaId ?? formData.areaId) : null
    const gradoIdGuardar = (unidadData?.gradoId ?? formData.gradoId) ? String(unidadData?.gradoId ?? formData.gradoId) : null
    const unidadGuardar = (unidadData?.unidad ?? formData.unidad) != null ? String(unidadData?.unidad ?? formData.unidad) : null
    const numeroSesionInt = parseInt(String(numsesion || '1'), 10) || 1
    const tieneIdentificadores = areaIdGuardar && gradoIdGuardar && unidadGuardar

    if (tieneIdentificadores) {
      try {
        const anio = new Date().getFullYear()
        let unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
          where: {
            idusuario: userId,
            anio,
            areaId: areaIdGuardar,
            gradoId: gradoIdGuardar,
            unidad: unidadGuardar
          }
        })
        if (!unidadAprendizaje) {
          unidadAprendizaje = await prisma.unidadAprendizaje.create({
            data: {
              idusuario: userId,
              anio,
              areaId: areaIdGuardar,
              gradoId: gradoIdGuardar,
              unidad: unidadGuardar,
              area: formData.area ?? undefined,
              grado: formData.grado ?? undefined,
              institucion: formData.institucion ?? undefined,
              director: formData.director ?? undefined,
              docente: formData.docente ?? undefined,
              duracion: formData.duracion ?? undefined
            }
          })
          console.log('[generate-document] Unidad de aprendizaje creada para guardar sesión:', unidadAprendizaje.id)
        }
        // Prioridad: contenidoDesdeBD.standar > standares recién obtenidos > mantener el que ya tiene la sesión (no sobrescribir con vacío)
        let standarToSave = (usarContenidoBD && contenidoDesdeBD && typeof contenidoDesdeBD === 'object' && contenidoDesdeBD.standar != null && String(contenidoDesdeBD.standar).trim() !== '')
          ? String(contenidoDesdeBD.standar).trim()
          : (standares && standares.trim() ? standares.trim() : '')
        if (!standarToSave) {
          const sesionExistente = await prisma.sesion.findUnique({
            where: {
              idunidadaprendizaje_numeroSesion: {
                idunidadaprendizaje: unidadAprendizaje.id,
                numeroSesion: numeroSesionInt
              }
            },
            select: { standar: true }
          })
          if (sesionExistente?.standar && String(sesionExistente.standar).trim()) {
            standarToSave = String(sesionExistente.standar).trim()
            console.log('[generate-document] Manteniendo standar ya guardado en la sesión (no se pudo resolver en esta generación)')
          }
        }
        console.log('[generate-document] Campo standar - standares (variable):', standares ? `${standares.length} caracteres` : '(vacío)', standares ? standares.substring(0, 120) + (standares.length > 120 ? '...' : '') : '')
        console.log('[generate-document] Campo standar - standarToSave que se envía al upsert:', standarToSave ? `${standarToSave.length} caracteres` : '(vacío/null)', standarToSave ? standarToSave.substring(0, 120) + (standarToSave.length > 120 ? '...' : '') : '')
        await prisma.sesion.upsert({
          where: {
            idunidadaprendizaje_numeroSesion: {
              idunidadaprendizaje: unidadAprendizaje.id,
              numeroSesion: numeroSesionInt
            }
          },
          create: {
            idunidadaprendizaje: unidadAprendizaje.id,
            numeroSesion: numeroSesionInt,
            area: formData.area ?? undefined,
            areaId: areaIdGuardar,
            grado: formData.grado ?? undefined,
            gradoId: gradoIdGuardar,
            ciclo: formData.ciclo ?? undefined,
            institucion: formData.institucion ?? undefined,
            director: formData.director ?? undefined,
            docente: formData.docente ?? undefined,
            duracion: formData.duracion ?? undefined,
            fecha: formData.fecha ?? undefined,
            unidad: unidadGuardar,
            titulo: (nombresesion || formData.tituloSesion) ?? undefined,
            campoTematico: sesionData?.campoTematico ?? undefined,
            criterios: sesionData?.criterios ?? undefined,
            evidencias: sesionData?.evidencias ?? undefined,
            competenciasSeleccionadas: sesionData?.competenciasSeleccionadas ?? undefined,
            capacidadesSeleccionadas: sesionData?.capacidadesSeleccionadas ?? undefined,
            desempeniosSeleccionados: sesionData?.desempeniosSeleccionados ?? undefined,
            motivacion: motivacion || null,
            saberes: saberes || null,
            problematizacion: problematizacion || null,
            proposito: proposito || null,
            standar: standarToSave || null,
            desarrollo: desarrollo || null,
            desarrolloantes: desarrolloantes || null,
            desarrollodurante: desarrollodurante || null,
            desarrollodespues: desarrollodespues || null
          },
          update: {
            titulo: (nombresesion || formData.tituloSesion) ?? undefined,
            campoTematico: sesionData?.campoTematico ?? undefined,
            criterios: sesionData?.criterios ?? undefined,
            evidencias: sesionData?.evidencias ?? undefined,
            competenciasSeleccionadas: sesionData?.competenciasSeleccionadas ?? undefined,
            capacidadesSeleccionadas: sesionData?.capacidadesSeleccionadas ?? undefined,
            desempeniosSeleccionados: sesionData?.desempeniosSeleccionados ?? undefined,
            motivacion: motivacion || null,
            saberes: saberes || null,
            problematizacion: problematizacion || null,
            proposito: proposito || null,
            standar: standarToSave || null,
            desarrollo: desarrollo || null,
            desarrolloantes: desarrolloantes || null,
            desarrollodurante: desarrollodurante || null,
            desarrollodespues: desarrollodespues || null
          }
        })
        console.log('[generate-document] Sesión guardada/actualizada en BD:', unidadAprendizaje.id, 'nº', numeroSesionInt)
      } catch (err) {
        console.error('[generate-document] Error al guardar sesión en BD:', err)
        // No fallar la generación del documento si falla el guardado
      }
    } else {
      console.log('[generate-document] Sin areaId/gradoId/unidad, no se guarda sesión en BD')
    }

    // Placeholder para {{tablacompetencias}} (se reemplazará por XML de tabla después del render)
    const TABLA_COMPETENCIAS_PLACEHOLDER = '__TABLA_COMPETENCIAS_PLACEHOLDER__'

    // Preparar los datos para reemplazar en la plantilla
    const data: any = {
      numsesion: numsesion,
      nombresesion: nombresesion,
      institucion: formData.institucion || '',
      area: formData.area || '',
      grado: formData.grado || '',
      ciclo: formData.ciclo || '',
      director: formData.director || '',
      docente: formData.docente || '',
      fecha: formData.fecha || '',
      minutos: formData.duracion || '',
      competencia: competencia,
      standares: standares,
      capacidades: capacidades,
      desempenio: desempenio,
      campotematico: campotematico,
      evidencia: evidencia,
      criterios: criterios,
      motivacion: motivacion,
      saberes: saberes,
      problematizacion: problematizacion,
      proposito: proposito,
      desarrollo: desarrollo,
      desarrolloantes: desarrolloantes,
      desarrollodurante: desarrollodurante,
      desarrollodespues: desarrollodespues,
      tablacompetencias: TABLA_COMPETENCIAS_PLACEHOLDER
    }

    // Reemplazar las variables en la plantilla (nueva API sin setData)
    try {
      doc.render(data)
      console.log(`[generate-document] doc.render(data): ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
      tUltimo = Date.now()
    } catch (error: any) {
      console.error('Error al renderizar la plantilla:', error)
      
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
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
        },
        { status: 500 }
      )
    }

    // Aplicar alineación a la izquierda para el campo {{standares}}
    // Modificar el XML del documento después del render para aplicar alineación
    if (standares && standares.trim()) {
      try {
        const zip = doc.getZip()
        const documentXml = zip.files['word/document.xml']
        
        if (documentXml) {
          let xmlContent = documentXml.asText()
          
          // Buscar párrafos que contengan el texto de estándares
          // Usar las primeras palabras del texto para identificar el párrafo
          const primerasPalabras = standares.trim().split(/\s+/).slice(0, 2).join(' ')
          
          if (primerasPalabras) {
            // Escapar caracteres especiales para regex
            const textoBusqueda = primerasPalabras.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            
            // Buscar todos los párrafos que contengan este texto
            // Patrón: <w:p...>...contenido con el texto...</w:p>
            const regex = new RegExp(
              `(<w:p(?:[^>]*)>)((?:(?!</w:p>).)*?${textoBusqueda}(?:(?!</w:p>).)*?</w:p>)`,
              'gis'
            )
            
            xmlContent = xmlContent.replace(regex, (match, pTag, pContent) => {
              // Aplicar alineación a la izquierda
              if (pTag.includes('<w:pPr>')) {
                // Si ya tiene w:pPr, modificar o agregar w:jc
                if (pTag.includes('<w:jc')) {
                  // Reemplazar cualquier alineación existente por left
                  return pTag.replace(/<w:jc[^>]*\/?>/, '<w:jc w:val="left"/>') + pContent
                } else {
                  // Agregar w:jc dentro de w:pPr
                  return pTag.replace('</w:pPr>', '<w:jc w:val="left"/></w:pPr>') + pContent
                }
              } else {
                // Si no tiene w:pPr, agregarlo con alineación a la izquierda
                return pTag.replace('>', '><w:pPr><w:jc w:val="left"/></w:pPr>') + pContent
              }
            })
            
            // Actualizar el XML en el zip
            zip.file('word/document.xml', xmlContent)
          }
        }
      } catch (xmlError) {
        console.error('Error al modificar XML para alineación de estándares:', xmlError)
        // Continuar aunque haya error en la modificación del XML
      }
    }

    // Reemplazar {{tablacompetencias}} por la tabla de competencias transversales (en función del grado)
    const escaparXML = (s: string): string => {
      if (!s) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    // Ancho tabla reducido (dxa). Total 10000; columnas 3333, 3333, 3334. Texto a 8pt (w:sz="16")
    const TBL_W = '10000'
    const COL1_W = '3333'
    const COL2_W = '3333'
    const COL3_W = '3334'
    const generarTablaCompetenciasTransversales = (): string => {
      const headerRow = `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${COL1_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>COMPETENCIAS TRANSVERSALES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${COL2_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>CAPACIDADES</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${COL3_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/></w:rPr><w:t>DESEMPEÑOS PRECISADOS</w:t></w:r></w:p></w:tc></w:tr>`
      if (competenciasTransversalesParaTabla.length === 0) {
        return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${COL1_W}"/><w:gridCol w:w="${COL2_W}"/><w:gridCol w:w="${COL3_W}"/></w:tblGrid>${headerRow}</w:tbl>`
      }
      let tablaXML = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${COL1_W}"/><w:gridCol w:w="${COL2_W}"/><w:gridCol w:w="${COL3_W}"/></w:tblGrid>` + headerRow
      competenciasTransversalesParaTabla.forEach((comp, compIndex) => {
        const competenciaEscapada = escaparXML(comp.competenciadescripcion)
        comp.capacidades.forEach((cap, capIndex) => {
          const capacidadEscapada = escaparXML(cap.capacidad)
          const desempenioEscapado = escaparXML(cap.primerDesempenio)
          const esPrimeraFilaCompetencia = capIndex === 0
          tablaXML += `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>`
          if (esPrimeraFilaCompetencia) {
            tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL1_W}" w:type="dxa"/><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${competenciaEscapada}</w:t></w:r></w:p></w:tc>`
          } else {
            tablaXML += `<w:tc><w:tcPr><w:vMerge/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders></w:tcPr><w:p/></w:tc>`
          }
          tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL2_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${capacidadEscapada}</w:t></w:r></w:p></w:tc>`
          tablaXML += `<w:tc><w:tcPr><w:tcW w:w="${COL3_W}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${desempenioEscapado}</w:t></w:r></w:p></w:tc>`
          tablaXML += `</w:tr>`
        })
      })
      tablaXML += '</w:tbl>'
      return tablaXML
    }
    const tablaCompetenciasXML = generarTablaCompetenciasTransversales()
    try {
      const zipForTabla = doc.getZip()
      const documentFile = zipForTabla.files['word/document.xml']
      if (documentFile && tablaCompetenciasXML.startsWith('<w:tbl>') && tablaCompetenciasXML.endsWith('</w:tbl>')) {
        let xmlContent = documentFile.asText()
        // Word a veces divide el texto en varios <w:t>; buscar placeholder o fragmento
        let idx = xmlContent.indexOf(TABLA_COMPETENCIAS_PLACEHOLDER)
        if (idx === -1) idx = xmlContent.indexOf('TABLA_COMPETENCIAS_PLACEHOLDER')
        if (idx === -1) idx = xmlContent.indexOf('{{tablacompetencias}}')
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
            xmlContent = xmlContent.substring(0, paraStart) + tablaCompetenciasXML + xmlContent.substring(paraEnd + 6)
            zipForTabla.file('word/document.xml', xmlContent)
          }
        }
      }
    } catch (err) {
      console.error('Error al insertar tabla de competencias transversales:', err)
    }

    // Generar el buffer del documento
    const docBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    console.log(`[generate-document] XML estándares + tabla competencias + zip.generate: ${Date.now() - tUltimo} ms (total: ${Date.now() - tInicio} ms)`)
    const totalMs = Date.now() - tInicio
    console.log(`[generate-document] TOTAL desde click: ${(totalMs / 1000).toFixed(2)} s (${totalMs} ms) | IA = ${tiempoIAms} ms (${totalMs > 0 ? ((tiempoIAms / totalMs) * 100).toFixed(0) : 0}%)`)

    // Generar nombre del archivo
    const fileName = `SESION_${formData.area || 'documento'}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')

    return new NextResponse(docBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Error al generar documento de sesión:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al generar el documento de sesión', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

