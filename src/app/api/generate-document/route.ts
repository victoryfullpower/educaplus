import { NextRequest, NextResponse } from 'next/server'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { generateSituacionSignificativa } from '@/lib/generate-situacion-significativa'
import { getUserId } from '@/lib/auth'
import {
  marcarTrialConsumido,
  MSG_TRIAL_AGOTADO,
  puedeGenerarConTrial,
  tieneSuscripcionActivaPara,
  validarRegeneracionIA,
  consumirCreditoRegeneracion
} from '@/lib/acceso-usuario'
import { assertPuedeCrearPlanAnual } from '@/lib/limites-plan-anual'
import { unidadPlanTieneConfiguracion } from '@/lib/acceso-cliente'
import { MSG_TRIAL_UNA_UNIDAD_PLAN } from '@/lib/error-generacion-documento'
import {
  CODE_PDF_TRIAL_NO_DISPONIBLE,
  MSG_PDF_TRIAL_NO_DISPONIBLE,
  prepararEntregaDocumento
} from '@/lib/entrega-documento-trial'
import {
  generarDocxRespuestasIAPlanAnual,
  type RespuestaIAPlanUnidad
} from '@/lib/plan-anual-respuesta-ia-docx'
import JSZip from 'jszip'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 180

function normalizePlanIdField(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  return String(v)
}

function normalizeAreaKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractGradeNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/([1-5])/)
  if (!match) return null
  const n = Number(match[1])
  return n >= 1 && n <= 5 ? n : null
}

const AREA_FOLDER_MAP: Record<string, string> = {
  COMUNICACION: 'COMUNICACIÓN 1° A 5°',
  MATEMATICA: 'MATEMATICA 1° A 5°',
  CYT: 'CYT 1° A 5°',
  'CIENCIA Y TECNOLOGIA': 'CYT 1° A 5°',
  'CIENCIA TECNOLOGIA': 'CYT 1° A 5°',
  CCSS: 'CCSS 1° A 5°',
  'CIENCIAS SOCIALES': 'CCSS 1° A 5°',
  DPCC: 'DPCC 1° A 5°',
  INGLES: 'INGLÉS 1° A 5°',
  ARTE: 'ARTE 1° A 5',
  FISICA: 'ED. FISICA 1° A 5°',
  'EDUCACION FISICA': 'ED. FISICA 1° A 5°',
  TUTORIA: 'TUTORÍA 1° A 5°',
  RELIGION: 'RELIGIÓN 1° A 5°',
  QUECHUA: 'QUECHUA 1° A 5°',
  'EPT COMPUTACION': 'EPT COMPUTACIÓN 1° A 5°',
  'EPT AGROPECUARIA': 'EPT AGROPECUARIA 1° A 5°',
  'EPT EMPRENDIMIENTO': 'EPT EMPRENDIMIENTO 1° A 5°'
}

/** IDs de área en BD → carpeta de plantillas (EPT desglosado) */
const EPT_AREA_ID_TO_FOLDER: Record<string, string> = {
  '10': 'EPT AGROPECUARIA 1° A 5°',
  '14': 'EPT COMPUTACIÓN 1° A 5°',
  '15': 'EPT EMPRENDIMIENTO 1° A 5°'
}

function resolveFolderFromAreaId(areaId: unknown): string | null {
  const id = String(areaId ?? '').trim()
  if (!id || id === 'undefined') return null
  return EPT_AREA_ID_TO_FOLDER[id] ?? null
}

function resolveFolderByAreaKey(areaKey: string): string | null {
  if (AREA_FOLDER_MAP[areaKey]) return AREA_FOLDER_MAP[areaKey]

  // Fallback por coincidencias parciales para nombres como:
  // "Ciencia y Tecnología (CYT)", "Educación Física", etc.
  const contains = (token: string) => areaKey.includes(token)

  if (contains('COMUNICACION')) return 'COMUNICACIÓN 1° A 5°'
  if (contains('MATEMATICA')) return 'MATEMATICA 1° A 5°'
  // Antes que "CIENCIA" genérico (evita confundir Ciencias Sociales con CYT)
  if (contains('CCSS') || contains('SOCIALES')) return 'CCSS 1° A 5°'
  if (contains('CYT') || contains('TECNOLOGIA')) {
    return 'CYT 1° A 5°'
  }
  if (contains('CIENCIA') && !contains('SOCIALES')) {
    return 'CYT 1° A 5°'
  }
  if (contains('DPCC')) return 'DPCC 1° A 5°'
  if (contains('INGLES')) return 'INGLÉS 1° A 5°'
  if (contains('ARTE')) return 'ARTE 1° A 5'
  if (contains('FISICA')) return 'ED. FISICA 1° A 5°'
  if (contains('TUTORIA')) return 'TUTORÍA 1° A 5°'
  if (contains('RELIGION')) return 'RELIGIÓN 1° A 5°'
  if (contains('QUECHUA')) return 'QUECHUA 1° A 5°'
  const eptLike = contains('EPT') || contains('TRABAJO')
  if (eptLike && contains('COMPUTACION')) return 'EPT COMPUTACIÓN 1° A 5°'
  if (eptLike && contains('AGROPECUARIA')) return 'EPT AGROPECUARIA 1° A 5°'
  if (eptLike && contains('EMPRENDIMIENTO')) return 'EPT EMPRENDIMIENTO 1° A 5°'

  return null
}

function resolvePlanAnualTemplatePath(formData: any): string {
  const defaultTemplate = path.join(
    process.cwd(),
    'templates',
    '1-PLANIFICACIÓN CURRICULAR ANUAL.docx'
  )

  const areaKey = normalizeAreaKey(formData?.area)
  const grade = extractGradeNumber(formData?.grado)
  const folderName =
    resolveFolderFromAreaId(formData?.areaId) ?? resolveFolderByAreaKey(areaKey)

  if (!folderName || !grade) {
    console.warn('⚠️ [DEBUG] Plantilla fallback por área/grado no resuelto:', {
      areaOriginal: formData?.area,
      areaId: formData?.areaId,
      areaKey,
      grade
    })
    return defaultTemplate
  }

  const folderPath = path.join(process.cwd(), 'templates', 'plananual', folderName)
  if (!fs.existsSync(folderPath)) {
    return defaultTemplate
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((name) => name.toLowerCase().endsWith('.docx') && !name.startsWith('~$'))

  const gradeToken = `${grade}°`
  const templateByGrade = files.find((name) => name.includes(gradeToken))
  if (templateByGrade) {
    return path.join(folderPath, templateByGrade)
  }

  console.warn('⚠️ [DEBUG] Plantilla fallback por grado no encontrado en carpeta:', {
    areaOriginal: formData?.area,
    areaKey,
    folderName,
    grade,
    gradeToken
  })
  return defaultTemplate
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const requestBody = await request.json()
    const {
      formData: formDataInput,
      unidades,
      aiProvider = 'openai',
      openaiModel = 'gpt-5-mini',
      modoGeneracion = 'regenerar',
      unidadesParaGenerar = [],
      datosExistentes = {},
      planAnualId,
      soloExportar = false
    } = requestBody

    // Algunos clientes envían solo el objeto de formulario (sin wrapper `formData`)
    const formData = formDataInput != null ? formDataInput : requestBody
    const areaIdAcceso = formData?.areaId != null ? String(formData.areaId) : null
    const gradoIdAcceso = formData?.gradoId != null ? String(formData.gradoId) : null

    const planIdParsed =
      planAnualId !== undefined && planAnualId !== null && planAnualId !== ''
        ? parseInt(String(planAnualId), 10)
        : NaN
    const esEdicionPlan = Number.isFinite(planIdParsed)
    if (!soloExportar && !esEdicionPlan) {
      const limitePlan = await assertPuedeCrearPlanAnual(userId)
      if (!limitePlan.ok) {
        return NextResponse.json(
          { error: limitePlan.error, code: limitePlan.code },
          { status: 403 }
        )
      }
    }

    const tieneSuscripcion = await tieneSuscripcionActivaPara(
      userId,
      areaIdAcceso,
      gradoIdAcceso
    )
    const regeneracionSelectiva =
      !soloExportar &&
      modoGeneracion === 'actualizar' &&
      Array.isArray(unidadesParaGenerar) &&
      unidadesParaGenerar.length > 0
    // Créditos de regeneración: solo con suscripción (el trial usa puedeGenerarConTrial más abajo).
    // La primera generación también envía modoGeneracion 'regenerar'; no debe bloquear el trial.
    const esRegeneracionIA =
      tieneSuscripcion &&
      !soloExportar &&
      (modoGeneracion === 'regenerar' || regeneracionSelectiva)
    let suscripcionRegenId: number | null = null
    if (esRegeneracionIA) {
      const regen = await validarRegeneracionIA(userId, areaIdAcceso, gradoIdAcceso)
      if (!regen.ok) {
        return NextResponse.json({ error: regen.error, code: regen.code }, { status: 403 })
      }
      suscripcionRegenId = regen.suscripcionId
    }
    const consumirTrialPlan = !tieneSuscripcion
    if (consumirTrialPlan && !soloExportar) {
      const puedeTrial = await puedeGenerarConTrial(userId, 'plan')
      if (!puedeTrial) {
        return NextResponse.json(
          { error: MSG_TRIAL_AGOTADO, code: 'TRIAL_AGOTADO_PLAN' },
          { status: 403 }
        )
      }
      if (Array.isArray(unidades)) {
        let unidadesConDatos = 0
        for (let i = 1; i < unidades.length && i <= 8; i++) {
          if (unidadPlanTieneConfiguracion(unidades[i] ?? {})) unidadesConDatos += 1
        }
        if (unidadesConDatos > 1) {
          return NextResponse.json(
            { error: MSG_TRIAL_UNA_UNIDAD_PLAN, code: 'TRIAL_UNA_UNIDAD_PLAN' },
            { status: 403 }
          )
        }
      }
    }

    console.log('📥 [DEBUG] Datos recibidos:', {
      tieneFormData: !!formData,
      tieneUnidades: !!unidades,
      cantidadUnidades: unidades?.length || 0,
      modoGeneracion,
      unidadesParaGenerar: unidadesParaGenerar,
      datosExistentes: datosExistentes,
      keysDatosExistentes: Object.keys(datosExistentes),
      unidades: unidades?.map((u: any, i: number) => ({
        index: i,
        producto: u.producto,
        competenciasSeleccionadas: u.competenciasSeleccionadas?.length || 0,
        conocimientosSeleccionados: u.conocimientosSeleccionados?.length || 0,
        desempeniosSeleccionados: u.desempeniosSeleccionados?.length || 0
      }))
    })
    
    // Log detallado de datos existentes
    if (datosExistentes && Object.keys(datosExistentes).length > 0) {
      console.log('📦 [DEBUG] Datos existentes recibidos:', Object.keys(datosExistentes).map((key: string) => {
        const index = parseInt(key)
        const datos = datosExistentes[index]
        return {
          unidad: index,
          tieneSituacion: !!(datos?.situacionSignificativa),
          longitudSituacion: datos?.situacionSignificativa?.length || 0,
          tieneCampoTematico: !!(datos?.campoTematico),
          longitudCampoTematico: datos?.campoTematico?.length || 0,
          tieneTitulo: !!(datos?.tituloUnidad),
          situacionPrimeros100: datos?.situacionSignificativa?.substring(0, 100) || '(vacío)',
          campoTematicoPrimeros100: datos?.campoTematico?.substring(0, 100) || '(vacío)'
        }
      }))
    } else {
      console.log('⚠️ [DEBUG] No se recibieron datos existentes')
    }

    // Resolver plantilla (hardcoded por área y grado). Si no encuentra match, usa la plantilla general.
    const templatePath = resolvePlanAnualTemplatePath(formData)
    console.log('📄 [DEBUG] Plantilla seleccionada:', templatePath)

    // Verificar que la plantilla existe
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
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
        console.log(`⚠️ [DEBUG] Variable no encontrada: ${part.module || part.value || 'desconocida'}`)
        return ''
      },
      errorLogging: true
    })

    // Preparar los datos básicos para reemplazar
    const data: any = {
      dre: formData?.dre || '',
      ugel: formData?.ugel || '',
      institucioneducativa: formData?.institucion || '',
      director: formData?.director || '',
      cordinador: formData?.coordinador || '',
      coordinador: formData?.coordinador || '',
      docente: formData?.docente || '',
      area: formData?.area || '',
      grados: formData?.grado || '',
      grado: formData?.grado || '',
      nivel: formData?.nivel || '',
      duracion: formData?.duracion || '',
      fechainicio: formData?.fechaInicio || '',
      fechaterming: formData?.fechaTermino || '', // Nota: se mantiene el nombre exacto de la plantilla (parece ser typo, pero se respeta)
      ciclo: formData?.ciclo || '', // Ciclo del grado seleccionado
    }
    
    // Agregar mapeos adicionales para compatibilidad con nombres de variables que pueden tener acentos
    data['área'] = formData?.area || ''

    // Procesar unidades y generar campo temático para cada una
    // La plantilla siempre espera 9 unidades (0-8), así que asegurémonos de procesar todas
    const unidadesRecibidas = unidades && Array.isArray(unidades) && unidades.length > 0 
      ? unidades 
      : []
    
    // Crear un array de 9 unidades, rellenando con objetos vacíos las que no tengan datos
    const unidadesParaProcesar: any[] = []
    for (let i = 0; i < 9; i++) {
      unidadesParaProcesar[i] = unidadesRecibidas[i] || {
        problemaPotencialidad: '',
        producto: '',
        competenciasSeleccionadas: [],
        conocimientosSeleccionados: [],
        desempeniosSeleccionados: [],
        tituloUnidad: '',
        situacionSignificativa: '',
        tieneTituloIA: true,
        tieneSituacionIA: true
      }
    }

    console.log(`📊 [DEBUG] Procesando ${unidadesParaProcesar.length} unidades (siempre 9 para la plantilla)...`)
    console.log(`📊 [DEBUG] Unidades recibidas del frontend: ${unidadesRecibidas.length}`)

    // Almacenar datos generados para guardar en el plan anual
    const unidadesConDatosGenerados: any[] = []
    const respuestasIAPorUnidad: RespuestaIAPlanUnidad[] = []

    for (let i = 0; i < unidadesParaProcesar.length; i++) {
      const unidad = unidadesParaProcesar[i]
      
      console.log(`📝 [DEBUG] Procesando unidad ${i}:`, {
        tieneDatos: !!(unidad.problemaPotencialidad || unidad.producto || unidad.competenciasSeleccionadas?.length || unidad.desempeniosSeleccionados?.length),
        problemaPotencialidad: unidad.problemaPotencialidad?.substring(0, 50) || '(vacío)',
        producto: unidad.producto || '(vacío)',
        competenciasSeleccionadas: unidad.competenciasSeleccionadas?.length || 0,
        conocimientosSeleccionados: unidad.conocimientosSeleccionados?.length || 0,
        desempeniosSeleccionados: unidad.desempeniosSeleccionados?.length || 0,
        tituloUnidad: unidad.tituloUnidad || '(vacío)',
        tieneTituloIA: unidad.tieneTituloIA,
        tieneSituacionIA: unidad.tieneSituacionIA,
        situacionSignificativa: unidad.situacionSignificativa
          ? `${String(unidad.situacionSignificativa).substring(0, 50)}...`
          : '(vacío)'
      })
      
      // Generar situación significativa para la unidad
      let situacionSignificativa = ''
      let tituloUnidad = unidad.tituloUnidad || ''
      let problemaPotencialidad = unidad.problemaPotencialidad || ''
      let campoTematico = '' // Campo temático ya no se usa, mantener vacío

      const generarTituloConIA = unidad.tieneTituloIA !== false
      const generarSituacionConIA = unidad.tieneSituacionIA !== false
      
      // Si título es manual, usar el ingresado
      if (!generarTituloConIA && unidad.tituloUnidad) {
        tituloUnidad = unidad.tituloUnidad
        console.log(`📝 [DEBUG] Usando título ingresado manualmente para unidad ${i}: "${tituloUnidad}"`)
      }

      // Si situación es manual, usar la ingresada
      if (!generarSituacionConIA && unidad.situacionSignificativa) {
        situacionSignificativa = String(unidad.situacionSignificativa)
        console.log(
          `📝 [DEBUG] Usando situación significativa manual para unidad ${i}: "${situacionSignificativa.substring(0, 50)}..."`
        )
      }
      
      // Verificar si esta unidad tiene datos existentes que debemos usar
      const datosExistentesUnidad = datosExistentes && datosExistentes[i]
      const debeGenerar = modoGeneracion === 'regenerar' || (unidadesParaGenerar && unidadesParaGenerar.includes(i))
      
      console.log(`🔍 [DEBUG] Unidad ${i} - Verificación de datos existentes:`, {
        tieneDatosExistentes: !!datosExistentesUnidad,
        modoGeneracion,
        estaEnUnidadesParaGenerar: unidadesParaGenerar?.includes(i),
        debeGenerar,
        situacionSignificativaExistente: datosExistentesUnidad?.situacionSignificativa?.substring(0, 50) || '(vacío)',
        campoTematicoExistente: datosExistentesUnidad?.campoTematico?.substring(0, 50) || '(vacío)',
        tituloUnidadExistente: datosExistentesUnidad?.tituloUnidad || '(vacío)'
      })
      
      // Si hay datos existentes y no debemos regenerar, usar los datos existentes (NO generar con IA)
      if (datosExistentesUnidad && !debeGenerar) {
        console.log(`📦 [DEBUG] ===== USANDO DATOS EXISTENTES PARA UNIDAD ${i} (SIN GENERAR CON IA) =====`)
        situacionSignificativa =
          (!generarSituacionConIA && unidad.situacionSignificativa
            ? String(unidad.situacionSignificativa)
            : datosExistentesUnidad.situacionSignificativa) ||
          situacionSignificativa ||
          ''
        tituloUnidad =
          (!generarTituloConIA && unidad.tituloUnidad
            ? unidad.tituloUnidad
            : datosExistentesUnidad.tituloUnidad) ||
          unidad.tituloUnidad ||
          ''
        problemaPotencialidad = unidad.problemaPotencialidad || ''
        const camposExistentes = Array.isArray(unidad.camposTematicos)
          ? unidad.camposTematicos
          : []
        campoTematico =
          camposExistentes.length > 0
            ? camposExistentes
                .map((t: string) => String(t).trim())
                .filter(Boolean)
                .map((t: string) => `- ${t}`)
                .join('\n')
            : String(unidad.campoTematico || datosExistentesUnidad.campoTematico || '').trim()
        console.log(`✅ [DEBUG] Datos existentes cargados para unidad ${i}:`, {
          tieneSituacion: !!situacionSignificativa,
          longitudSituacion: situacionSignificativa.length,
          tieneTitulo: !!tituloUnidad,
          tieneCampoTematico: !!campoTematico,
          longitudCampoTematico: campoTematico.length,
          situacionPrimeros100: situacionSignificativa.substring(0, 100),
          campoTematicoPrimeros100: campoTematico.substring(0, 100)
        })
        
        // Saltar todo el procesamiento de IA y desempeños, ir directamente a asignar datos a la plantilla
        // (continuar después del bloque else)
      } else {
        // Generar con IA (lógica original)
      // Solo generar situación significativa si hay datos en "Problema o potencialidad"
      // Si está vacío, no se envía nada al prompt
      const tieneProblemaPotencialidad = unidad.problemaPotencialidad && unidad.problemaPotencialidad.trim().length > 0
      const necesitaIA = generarSituacionConIA || generarTituloConIA
      
        if (tieneProblemaPotencialidad && debeGenerar && necesitaIA) {
        try {
          console.log(`🤖 [DEBUG] ===== GENERANDO SITUACIÓN SIGNIFICATIVA PARA UNIDAD ${i} =====`)
          console.log(`   - Problema/Potencialidad: "${unidad.problemaPotencialidad.substring(0, 50)}..."`)
          console.log(`   - Producto: "${unidad.producto}"`)
          console.log(`   - tieneTituloIA: ${generarTituloConIA}`)
          console.log(`   - tieneSituacionIA: ${generarSituacionConIA}`)
          console.log(`   - tituloUnidad recibido: "${unidad.tituloUnidad || '(vacío)'}"`)
          console.log(`   - tituloUnidad que se enviará a IA: "${generarTituloConIA ? '(vacío - IA lo generará)' : (unidad.tituloUnidad || '(vacío)')}"`)
          
          const situacionResult = await generateSituacionSignificativa(
            {
              problemaPotencialidad: unidad.problemaPotencialidad,
              producto: unidad.producto,
              // Si tieneTituloIA es true, pasar título vacío para que la IA lo genere
              // Si es false, pasar el título que el usuario ingresó
              tituloUnidad: generarTituloConIA ? '' : (unidad.tituloUnidad || ''),
              camposTematicos: Array.isArray(unidad.camposTematicos) ? unidad.camposTematicos : [],
              campotematico: String(unidad.campoTematico || '').trim()
            },
            formData,
            aiProvider,
            openaiModel
          )
          
          if (generarSituacionConIA) {
            situacionSignificativa = situacionResult.situacionSignificativa || ''
          } else {
            situacionSignificativa = String(unidad.situacionSignificativa || situacionSignificativa || '')
          }
          
          if (situacionResult.respuestaCompleta?.trim()) {
            respuestasIAPorUnidad.push({
              unidad: i,
              respuestaCompleta: situacionResult.respuestaCompleta,
              tituloExtraido: situacionResult.titulo || undefined,
              situacionParseada: situacionSignificativa || undefined
            })
          }
          
          // Solo usar el título generado por IA si tieneTituloIA es true
          if (generarTituloConIA) {
            tituloUnidad = situacionResult.titulo || unidad.tituloUnidad || ''
            console.log(`✅ [DEBUG] Título generado por IA para unidad ${i}: "${tituloUnidad}"`)
          } else {
            // Si tieneTituloIA es false, mantener el título ingresado manualmente
            tituloUnidad = unidad.tituloUnidad || ''
            console.log(`📝 [DEBUG] Manteniendo título ingresado manualmente para unidad ${i}: "${tituloUnidad}"`)
          }
          
          console.log(`✅ [DEBUG] Situación significativa generada para unidad ${i}:`, {
            tieneSituacion: !!situacionSignificativa,
            longitud: situacionSignificativa.length,
            titulo: tituloUnidad,
            primeros100: situacionSignificativa.substring(0, 100)
          })
        } catch (error: any) {
          console.error(`❌ [DEBUG] Error al generar situación significativa para unidad ${i}:`, {
            error: error.message,
            stack: error.stack
          })
          // Continuar sin situación significativa generada (si era manual, mantenerla)
          if (generarSituacionConIA) {
            situacionSignificativa = ''
          }
        }
      } else {
          console.log(`⏭️ [DEBUG] Unidad ${i}: No se enviará al prompt (vacío, no debe generarse, o ambos campos son manuales)`)
        // Mantener valores manuales si aplican
        if (generarSituacionConIA) {
          situacionSignificativa = ''
        } else {
          situacionSignificativa = String(unidad.situacionSignificativa || situacionSignificativa || '')
        }
        if (generarTituloConIA) {
          tituloUnidad = '' // Si la IA debía generar el título pero no hay datos, dejar vacío
        } else {
          tituloUnidad = unidad.tituloUnidad || '' // Si el usuario ingresó un título manual, mantenerlo
          }
        }
      }
      
      // Si no hay título aún, usar el de la unidad si existe
      if (!tituloUnidad && unidad.tituloUnidad) {
        tituloUnidad = unidad.tituloUnidad
      }

      // Si no hay situación aún y era manual, usar la de la unidad
      if (!situacionSignificativa && !generarSituacionConIA && unidad.situacionSignificativa) {
        situacionSignificativa = String(unidad.situacionSignificativa)
      }
      
      // Obtener competencias desde la BD (múltiples)
      let competenciasTexto = ''
      
      // Intentar obtener competencias del array primero, luego del valor individual como fallback
      let competenciasIds: number[] = []
      
      if (unidad.competenciasSeleccionadas && Array.isArray(unidad.competenciasSeleccionadas) && unidad.competenciasSeleccionadas.length > 0) {
        competenciasIds = unidad.competenciasSeleccionadas
          .map((id: string | number) => parseInt(String(id)))
          .filter((id: number) => !isNaN(id))
      } else if (unidad.competenciaSeleccionada) {
        // Fallback: usar competenciaSeleccionada si no hay array
        const competenciaId = parseInt(String(unidad.competenciaSeleccionada))
        if (!isNaN(competenciaId)) {
          competenciasIds = [competenciaId]
        }
      }
      
      console.log(`🔍 [DEBUG] Competencias para unidad ${i}:`, {
        tieneArray: !!unidad.competenciasSeleccionadas,
        arrayLength: unidad.competenciasSeleccionadas?.length || 0,
        tieneIndividual: !!unidad.competenciaSeleccionada,
        competenciasIds: competenciasIds
      })
      
      if (competenciasIds.length > 0) {
        try {
          const competencias = await prisma.competencia.findMany({
            where: { id: { in: competenciasIds } },
            include: { area: true }
          })
          
          if (competencias.length > 0) {
            // Combinar todas las competencias en un texto con viñetas
            competenciasTexto = competencias.map(c => `• ${c.descripcion}`).join('\n')
            console.log(`✅ [DEBUG] ${competencias.length} competencia(s) encontrada(s) para unidad ${i}: "${competenciasTexto.substring(0, 100)}..."`)
          } else {
            console.warn(`⚠️ [DEBUG] No se encontraron competencias con IDs: ${competenciasIds.join(', ')}`)
          }
        } catch (error) {
          console.error(`❌ [DEBUG] Error al obtener competencias para unidad ${i}:`, error)
        }
      } else {
        console.warn(`⚠️ [DEBUG] No hay IDs de competencias para unidad ${i}`)
      }
      
      // Campo temático ingresado por el usuario en el plan anual
      const camposDesdeUnidad = Array.isArray(unidad.camposTematicos)
        ? unidad.camposTematicos
        : []
      campoTematico =
        camposDesdeUnidad.length > 0
          ? camposDesdeUnidad
              .map((t: string) => String(t).trim())
              .filter(Boolean)
              .map((t: string) => `- ${t}`)
              .join('\n')
          : String(unidad.campoTematico || '').trim()
      console.log(
        `📝 [DEBUG] Unidad ${i}: Campo temático desde formulario (${camposDesdeUnidad.length} ítems)`
      )
      
      // Asignar datos a las variables de la plantilla
      // Asegurarse de que los valores sean strings y no undefined/null
      // Formato: campotematico0, campotematico1, campotematico2, etc.
      console.log(`📋 [DEBUG] ===== ASIGNANDO DATOS A VARIABLES DE PLANTILLA PARA UNIDAD ${i} =====`)
      console.log(`   - Antes de asignar - situacionSignificativa: "${situacionSignificativa?.substring(0, 50) || '(vacío)'}" (longitud: ${situacionSignificativa?.length || 0}, tipo: ${typeof situacionSignificativa})`)
      console.log(`   - Antes de asignar - campoTematico: "${campoTematico?.substring(0, 50) || '(vacío)'}" (longitud: ${campoTematico?.length || 0}, tipo: ${typeof campoTematico})`)
      console.log(`   - Antes de asignar - tituloUnidad: "${tituloUnidad || '(vacío)'}"`)
      console.log(`   - Usando datos existentes: ${!!(datosExistentesUnidad && !debeGenerar)}`)
      
      // Asegurarse de que los valores no sean undefined o null
      const situacionFinal = situacionSignificativa || ''
      const campoTematicoFinal = campoTematico || ''
      const tituloFinal = tituloUnidad || ''
      
      data[`titulosituacionsignificativa${i}`] = String(tituloFinal).trim()
      data[`situacionsignificativa${i}`] = String(situacionFinal).trim()
      data[`problemapotencialidad${i}`] = String(problemaPotencialidad || '').trim()
      // Columna CAMPO TEMATICO de la plantilla: {{campotematico0}}, {{campotematico1}}, ...
      data[`campotematico${i}`] = String(campoTematicoFinal).trim()
      data[`competencias${i}`] = String(competenciasTexto || '').trim()
      data[`producto${i}`] = String(unidad.producto || '').trim()
      
      console.log(`   - titulosituacionsignificativa${i}: "${data[`titulosituacionsignificativa${i}`]?.substring(0, 50) || '(vacío)'}"`)
      console.log(`   - situacionsignificativa${i}: "${data[`situacionsignificativa${i}`]?.substring(0, 50) || '(vacío)'}" (longitud: ${data[`situacionsignificativa${i}`]?.length || 0})`)
      console.log(`   - problemapotencialidad${i}: "${data[`problemapotencialidad${i}`]?.substring(0, 50) || '(vacío)'}"`)
      console.log(`   - campotematico${i}: "${data[`campotematico${i}`]?.substring(0, 50) || '(vacío)'}" (longitud: ${data[`campotematico${i}`]?.length || 0})`)
      console.log(`   - competencias${i}: "${data[`competencias${i}`]?.substring(0, 50) || '(vacío)'}"`)
      console.log(`   - producto${i}: "${data[`producto${i}`] || '(vacío)'}"`)
      
      // Guardar datos generados o existentes para esta unidad
      // Siempre guardar los datos, ya sean generados con IA o existentes de la BD
      unidadesConDatosGenerados[i] = {
        ...unidad,
        situacionSignificativa: situacionSignificativa || '',
        campoTematico: campoTematico || '',
        camposTematicos: Array.isArray(unidad.camposTematicos) ? unidad.camposTematicos : [],
        tituloUnidad: tituloUnidad || ''
      }
      
      console.log(`💾 [DEBUG] Guardando datos para unidad ${i} en unidadesConDatosGenerados:`, {
        tieneSituacion: !!situacionSignificativa,
        longitudSituacion: situacionSignificativa?.length || 0,
        tieneCampoTematico: !!campoTematico,
        longitudCampoTematico: campoTematico?.length || 0,
        tieneTitulo: !!tituloUnidad,
        esDatosExistentes: !!(datosExistentesUnidad && !debeGenerar),
        esGeneradoConIA: debeGenerar
      })
      
      console.log(`📦 [DEBUG] Datos asignados para unidad ${i}:`, {
        [`titulosituacionsignificativa${i}`]: data[`titulosituacionsignificativa${i}`]?.substring(0, 50) || '(vacío)',
        [`situacionsignificativa${i}`]: data[`situacionsignificativa${i}`]?.substring(0, 50) || '(vacío)',
        [`problemapotencialidad${i}`]: data[`problemapotencialidad${i}`]?.substring(0, 50) || '(vacío)',
        [`campotematico${i}`]: data[`campotematico${i}`]?.substring(0, 50) || '(vacío)',
        [`competencias${i}`]: data[`competencias${i}`]?.substring(0, 50) || '(vacío)',
        [`producto${i}`]: data[`producto${i}`] || '(vacío)',
        tipoTitulo: typeof data[`titulosituacionsignificativa${i}`],
        tipoSituacion: typeof data[`situacionsignificativa${i}`],
        tipoCampo: typeof data[`campotematico${i}`],
        tipoCompetencias: typeof data[`competencias${i}`],
        tipoProducto: typeof data[`producto${i}`]
      })
    }

    console.log('📊 [DEBUG] Datos finales que se enviarán a la plantilla:', Object.keys(data).filter(k => k.includes('campotematic') || k.includes('competencias') || k.includes('producto') || k.includes('titulosituacionsignificativa')))
    
    // Mostrar todos los valores de las variables clave
    for (let i = 0; i < unidadesParaProcesar.length; i++) {
      console.log(`📋 [DEBUG] Unidad ${i} - Valores finales:`, {
        titulo: data[`titulosituacionsignificativa${i}`] || '(vacío)',
        situacionSignificativa: data[`situacionsignificativa${i}`]?.substring(0, 100) || '(vacío)',
        problemaPotencialidad: data[`problemapotencialidad${i}`]?.substring(0, 100) || '(vacío)',
        campoTematico: data[`campotematico${i}`]?.substring(0, 100) || '(vacío)',
        competencias: data[`competencias${i}`]?.substring(0, 100) || '(vacío)',
        producto: data[`producto${i}`] || '(vacío)'
      })
    }
    
    // VERIFICAR unidadesConDatosGenerados DESPUÉS DE QUE TERMINE EL LOOP
    console.log(`🔍 [DEBUG] ===== VERIFICACIÓN DE unidadesConDatosGenerados DESPUÉS DEL LOOP =====`)
    console.log(`   - Total unidades: ${unidadesConDatosGenerados.length}`)
    unidadesConDatosGenerados.forEach((u, idx) => {
      console.log(`   - Unidad ${idx}:`)
      console.log(`     * tiene situacionSignificativa: ${!!u?.situacionSignificativa}`)
      console.log(`     * longitud situacionSignificativa: ${u?.situacionSignificativa?.length || 0}`)
      console.log(`     * tiene campoTematico: ${!!u?.campoTematico}`)
      console.log(`     * longitud campoTematico: ${u?.campoTematico?.length || 0}`)
      if (idx === 0) {
        console.log(`     * JSON completo de unidad 0:`, JSON.stringify(u, null, 2))
      }
    })

    // ===== GUARDAR EN BD DESPUÉS DE QUE LA IA TERMINE DE GENERAR TODO =====
    // Ahora que todas las unidades tienen sus datos generados por IA en unidadesConDatosGenerados,
    // construimos el JSON y guardamos en la BD
    if (!soloExportar && (planAnualId || modoGeneracion)) {
      try {
          if (userId) {
          const anio = new Date().getFullYear()

          let planExistente = null as Awaited<ReturnType<typeof prisma.planAnual.findFirst>>

          if (planAnualId !== undefined && planAnualId !== null && planAnualId !== '') {
            const pid =
              typeof planAnualId === 'number' ? planAnualId : parseInt(String(planAnualId), 10)
            if (!Number.isNaN(pid)) {
              planExistente = await prisma.planAnual.findFirst({
                where: { id: pid, idusuario: userId }
              })
            }
          }

          if (!planExistente && formData) {
            const aid = normalizePlanIdField(formData.areaId)
            const nid = normalizePlanIdField(formData.nivelId)
            const gid = normalizePlanIdField(formData.gradoId)
            if (aid !== '' || nid !== '' || gid !== '') {
              planExistente = await prisma.planAnual.findFirst({
                where: {
                  idusuario: userId,
                  anio,
                  areaId: aid,
                  nivelId: nid,
                  gradoId: gid
                }
              })
            }
          }

          const unidadesParaGuardar = unidadesConDatosGenerados.map((unidadConDatos, idx) => {
              // VERIFICAR QUE unidadConDatos TENGA LOS DATOS
              if (idx === 0) {
                console.log(`🔍 [DEBUG] Unidad 0 - unidadConDatos recibido:`)
                console.log(`   - tiene situacionSignificativa: ${!!unidadConDatos?.situacionSignificativa}`)
                console.log(`   - longitud situacionSignificativa: ${unidadConDatos?.situacionSignificativa?.length || 0}`)
                console.log(`   - tiene campoTematico: ${!!unidadConDatos?.campoTematico}`)
                console.log(`   - longitud campoTematico: ${unidadConDatos?.campoTematico?.length || 0}`)
                console.log(`   - JSON completo de unidadConDatos:`, JSON.stringify(unidadConDatos, null, 2))
              }
              
              // Usar directamente unidadConDatos que ya tiene situacionSignificativa y campoTematico
              const unidadFinal: any = {
                // Campos básicos de la unidad original
                problemaPotencialidad: unidadConDatos?.problemaPotencialidad || '',
                producto: unidadConDatos?.producto || '',
                competenciasSeleccionadas: unidadConDatos?.competenciasSeleccionadas || [],
                capacidadesSeleccionadas: unidadConDatos?.capacidadesSeleccionadas || [],
                desempeniosSeleccionados: unidadConDatos?.desempeniosSeleccionados || [],
                competenciaSeleccionada: unidadConDatos?.competenciaSeleccionada || '',
                capacidadSeleccionada: unidadConDatos?.capacidadSeleccionada || '',
                conocimientos: unidadConDatos?.conocimientos || '',
                tieneTituloIA: unidadConDatos?.tieneTituloIA !== undefined ? unidadConDatos.tieneTituloIA : true,
                tieneSituacionIA:
                  unidadConDatos?.tieneSituacionIA !== undefined
                    ? unidadConDatos.tieneSituacionIA
                    : true,
                // Campos generados por IA o ingresados manualmente
                situacionSignificativa: unidadConDatos?.situacionSignificativa || '',
                campoTematico: unidadConDatos?.campoTematico || '',
                camposTematicos: Array.isArray(unidadConDatos?.camposTematicos)
                  ? unidadConDatos.camposTematicos
                  : [],
                tituloUnidad: unidadConDatos?.tituloUnidad || ''
              }
              
              if (idx === 0) {
                console.log(`🔍 [DEBUG] Unidad 0 - unidadFinal construido:`)
                console.log(`   - tiene situacionSignificativa: ${!!unidadFinal.situacionSignificativa}`)
                console.log(`   - longitud situacionSignificativa: ${unidadFinal.situacionSignificativa?.length || 0}`)
                console.log(`   - tiene campoTematico: ${!!unidadFinal.campoTematico}`)
                console.log(`   - longitud campoTematico: ${unidadFinal.campoTematico?.length || 0}`)
                console.log(`   - JSON completo de unidadFinal:`, JSON.stringify(unidadFinal, null, 2))
              }
              
              return unidadFinal
            })

          const base = planExistente
          const dataParaGuardar = {
            area: formData?.area ?? base?.area ?? null,
            areaId: normalizePlanIdField(formData?.areaId ?? base?.areaId),
            grado: formData?.grado ?? base?.grado ?? null,
            gradoId: normalizePlanIdField(formData?.gradoId ?? base?.gradoId),
            institucion: formData?.institucion ?? base?.institucion ?? null,
            docente: formData?.docente ?? base?.docente ?? null,
            dre: formData?.dre ?? base?.dre ?? null,
            ugel: formData?.ugel ?? base?.ugel ?? null,
            director: formData?.director ?? base?.director ?? null,
            coordinador: formData?.coordinador ?? base?.coordinador ?? null,
            nivel: formData?.nivel ?? base?.nivel ?? null,
            nivelId: normalizePlanIdField(formData?.nivelId ?? base?.nivelId),
            departamento: formData?.departamento ?? base?.departamento ?? null,
            provincia: formData?.provincia ?? base?.provincia ?? null,
            distrito: formData?.distrito ?? base?.distrito ?? null,
            unidades: unidadesParaGuardar,
            variablesTemplate: {
              aiProvider: aiProvider,
              openaiModel: openaiModel
            },
            fechaHora: new Date()
          }

          if (planExistente) {
            console.log(`💾 [DEBUG] Actualizando plan anual id=${planExistente.id}`)
            await prisma.planAnual.update({
              where: { id: planExistente.id },
              data: dataParaGuardar
            })
          } else if (formData) {
            const limitePlan = await assertPuedeCrearPlanAnual(userId)
            if (!limitePlan.ok) {
              throw new Error(limitePlan.error)
            }
            console.log('💾 [DEBUG] Creando plan anual nuevo al generar documento')
            await prisma.planAnual.create({
              data: {
                idusuario: userId,
                anio,
                ...dataParaGuardar
              }
            })
          }

          console.log('✅ [DEBUG] Plan anual guardado en BD')
        }
      } catch (error: any) {
        console.error('❌ [DEBUG] Error al guardar en BD:', error)
        // No fallar el proceso si hay error al guardar, solo loguear
      }
    }

    // Reemplazar las variables en la plantilla
    console.log('🔄 [DEBUG] Asignando datos a la plantilla...')
    console.log('📋 [DEBUG] Total de variables a asignar:', Object.keys(data).length)
    console.log('📋 [DEBUG] Variables clave:', {
      titulosituacionsignificativa0: data.titulosituacionsignificativa0 || '(vacío)',
      situacionsignificativa0: data.situacionsignificativa0 ? `"${data.situacionsignificativa0.substring(0, 50)}..."` : '(vacío)',
      problemapotencialidad0: data.problemapotencialidad0 ? `"${data.problemapotencialidad0.substring(0, 50)}..."` : '(vacío)',
      campotematico0: data.campotematico0 ? `"${data.campotematico0.substring(0, 50)}..."` : '(vacío)',
      competencias0: data.competencias0 ? `"${data.competencias0.substring(0, 50)}..."` : '(vacío)',
      producto0: data.producto0 || '(vacío)'
    })
    
    // Intentar obtener las variables que docxtemplater detecta en la plantilla
    try {
      // Crear una copia temporal para inspeccionar
      const tempZip = new PizZip(content)
      const tempDoc = new Docxtemplater(tempZip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      })
      
      // Intentar obtener las variables (esto puede fallar si hay errores en la plantilla)
      const fullText = tempZip.files['word/document.xml']?.asText() || ''
      const variablesEncontradas = fullText.match(/\{\{([^}]+)\}\}/g) || []
      
      // Extraer solo los nombres de las variables (sin las llaves)
      const nombresVariables = variablesEncontradas.map(v => v.replace(/\{\{|\}\}/g, '').trim())
      
      console.log('🔍 [DEBUG] Variables encontradas en la plantilla (con llaves):', variablesEncontradas.slice(0, 20))
      console.log('🔍 [DEBUG] Nombres de variables encontradas (sin llaves):', nombresVariables.slice(0, 20))
      console.log('🔍 [DEBUG] Total de variables encontradas:', nombresVariables.length)
      console.log('🔍 [DEBUG] Variables esperadas:', ['campotematico0', 'competencias0', 'producto0', 'titulosituacionsignificativa0'])
      
      // Verificar si las variables esperadas están en la plantilla (búsqueda exacta)
      const variablesEsperadas = ['campotematico0', 'competencias0', 'producto0', 'titulosituacionsignificativa0']
      variablesEsperadas.forEach(variable => {
        const encontrada = nombresVariables.some(v => v === variable || v.includes(variable))
        const variableExacta = nombresVariables.find(v => v === variable)
        const variableParcial = nombresVariables.find(v => v.includes(variable) || variable.includes(v))
        console.log(`  ${variable}: ${encontrada ? '✅ encontrada' : '❌ NO encontrada'}`)
        if (!encontrada && variableParcial) {
          console.log(`     ⚠️ Variable similar encontrada: "${variableParcial}"`)
        }
      })
      
      // Mostrar todas las variables que contienen "titulo" o "situacion" para debugging
      const variablesTitulo = nombresVariables.filter(v => v.toLowerCase().includes('titulo') || v.toLowerCase().includes('situacion'))
      if (variablesTitulo.length > 0) {
        console.log('🔍 [DEBUG] Variables relacionadas con título/situación encontradas:', variablesTitulo)
      }
    } catch (error) {
      console.warn('⚠️ [DEBUG] No se pudo inspeccionar las variables de la plantilla:', error)
    }
    
    // Usar el método actualizado de docxtemplater (aunque setData sigue funcionando)
    console.log('📋 [DEBUG] Asignando datos a docxtemplater...')
    console.log('📋 [DEBUG] Total de claves en data:', Object.keys(data).length)
    console.log('📋 [DEBUG] Claves relevantes:', Object.keys(data).filter(k => 
      k.includes('campotematic') || k.includes('competencias') || k.includes('producto') || k.includes('titulosituacionsignificativa')
    ))
    
    doc.setData(data)

    try {
      console.log('🔄 [DEBUG] Renderizando documento...')
      console.log('📋 [DEBUG] Verificando variables antes de renderizar...')
      
      // Verificar que las variables clave tienen valores
      const variablesClave = [
        'titulosituacionsignificativa0',
        'situacionsignificativa0',
        'problemapotencialidad0',
        'campotematico0',
        'competencias0',
        'producto0'
      ]
      variablesClave.forEach(variable => {
        const valor = data[variable]
        console.log(`  ${variable}: ${valor ? `"${String(valor).substring(0, 50)}..." (tipo: ${typeof valor}, longitud: ${String(valor).length})` : '(vacío o undefined)'}`)
      })
      
      doc.render()
      console.log('✅ [DEBUG] Documento renderizado exitosamente')
    } catch (error: any) {
      console.error('Error al renderizar el documento:', error)
      
      // Extraer información útil del error
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
        
        // Mensaje específico para variables divididas
        if (errors.some((e: any) => e.id === 'duplicate_open_tag' || e.id === 'duplicate_close_tag')) {
          errorMessage = 'La plantilla tiene variables divididas entre diferentes elementos XML'
          errorDetails += '\n\nSOLUCIÓN: En Word, selecciona la variable completa (incluyendo las llaves {{ }}) y presiona Ctrl+Shift+F9 para convertirla en texto plano, luego vuelve a escribirla sin formato especial.'
        }
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

    // El guardado ya se hizo después de que la IA terminó de generar (ver línea ~505)
    // No es necesario guardar de nuevo aquí

    // Generar el buffer del documento DESPUÉS de guardar los datos
    console.log('📄 [DEBUG] Generando buffer del documento después de guardar datos...')
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    // Generar nombre del archivo
    let fileName = `PLANIFICACION_ANUAL_${formData.area || 'documento'}_${formData.grado || ''}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')

    let entrega
    try {
      if (!tieneSuscripcion) {
        console.log('🔒 [DEBUG] Modo prueba: convirtiendo plan anual a PDF protegido...')
      }
      entrega = await prepararEntregaDocumento(buf as Buffer, fileName, !tieneSuscripcion)
    } catch (pdfError) {
      console.error('Error al generar PDF protegido (modo prueba):', pdfError)
      return NextResponse.json(
        { error: MSG_PDF_TRIAL_NO_DISPONIBLE, code: CODE_PDF_TRIAL_NO_DISPONIBLE },
        { status: 503 }
      )
    }

    console.log('✅ [DEBUG] Buffer generado, devolviendo documento...')

    // Devolver el archivo como respuesta
    if (consumirTrialPlan && !soloExportar) {
      await marcarTrialConsumido(userId, 'plan')
    }
    if (suscripcionRegenId != null) {
      await consumirCreditoRegeneracion(suscripcionRegenId)
    }

    if (respuestasIAPorUnidad.length > 0) {
      const iaBuf = await generarDocxRespuestasIAPlanAnual(respuestasIAPorUnidad, {
        area: formData?.area,
        grado: formData?.grado
      })
      const baseName = entrega.fileName.replace(/\.(docx|pdf)$/i, '')
      const iaFileName = `${baseName}_RESPUESTA_IA.docx`
      const zip = new JSZip()
      zip.file(entrega.fileName, entrega.buffer)
      zip.file(iaFileName, iaBuf)
      const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      const zipName = `${baseName}_con_respuesta_IA.zip`

      return new NextResponse(zipBuf as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipName}"`,
          'X-Documento-Incluye-Respuesta-IA': '1'
        }
      })
    }

    return new NextResponse(entrega.buffer as any, {
      headers: {
        'Content-Type': entrega.contentType,
        'Content-Disposition': `attachment; filename="${entrega.fileName}"`,
        ...entrega.extraHeaders
      }
    })
  } catch (error: any) {
    console.error('Error al generar el documento:', error)
    
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
