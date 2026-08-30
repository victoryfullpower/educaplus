import OpenAI from 'openai'
import { getPromptByDescripcion, buildPromptFromText } from './prompt-helpers'
import { parseTituloYSituacionDesdeRespuestaIA } from './parse-situacion-significativa-ia'

export { parseTituloYSituacionDesdeRespuestaIA } from './parse-situacion-significativa-ia'

export async function generateSituacionSignificativa(
  unidadData: {
    problemaPotencialidad?: string
    producto?: string
    tituloUnidad?: string
    campotematico?: string
    campoTematico?: string
    camposTematicos?: string[]
  },
  formData: {
    area?: string
    grado?: string
    institucion?: string
    departamento?: string
    provincia?: string
    distrito?: string
  },
  aiProvider: string = 'gemini',
  openaiModel: string = 'gpt-5.1'
): Promise<{ situacionSignificativa: string; titulo: string; respuestaCompleta: string }> {
  // Validar que al menos una API key esté configurada
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error('Debes configurar al menos una API key: GEMINI_API_KEY o OPENAI_API_KEY')
  }

  // Obtener el prompt desde la BD
  const templateText = await getPromptByDescripcion('Situación significativa')
  
  if (!templateText) {
    throw new Error('Prompt de Situación Significativa no encontrado en la base de datos. Asegúrate de que existe un prompt activo con esa descripción.')
  }

  const listaCampos =
    Array.isArray(unidadData?.camposTematicos) && unidadData.camposTematicos.length > 0
      ? unidadData.camposTematicos
          .map((t) => String(t).trim())
          .filter(Boolean)
          .map((t) => `- ${t}`)
          .join('\n')
      : String(unidadData?.campotematico || unidadData?.campoTematico || '').trim()

  // Mapeo de variables para reemplazar en el template
  const variables = {
    area: formData?.area || 'No especificado',
    grado: formData?.grado || 'No especificado',
    institucion: formData?.institucion || 'No especificado',
    problemaPotencialidad: unidadData?.problemaPotencialidad || 'No especificado',
    departamento: formData?.departamento || 'No especificado',
    provincia: formData?.provincia || 'No especificado',
    distrito: formData?.distrito || 'No especificado',
    producto: unidadData?.producto || 'No especificado',
    // Llave del prompt en BD (programación anual / situación significativa)
    campotematico: listaCampos || 'No especificado',
    campoTematico: listaCampos || 'No especificado'
  }
  
  // Construir el prompt completo reemplazando las variables en el template de texto
  const promptCompleto = buildPromptFromText(templateText, variables)
  
  console.log('📝 [DEBUG generateSituacionSignificativa] Prompt completo construido:')
  console.log('   - Longitud del prompt:', promptCompleto.length)
  console.log('   - Primeros 200 caracteres:', promptCompleto.substring(0, 200))

  // Generar respuesta usando la IA seleccionada
  let respuestaIA = ''
  
  if (aiProvider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada')
    }
    
    let modeloGemini = 'gemini-2.5-flash'
    
    try {
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
      )
      
      if (listResponse.ok) {
        const listData = await listResponse.json()
        const models = listData.models || []
        
        const modelosDisponibles = models
          .filter((m: any) => 
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name.includes('gemini')
          )
          .map((m: any) => m.name.replace('models/', ''))
        
        if (modelosDisponibles.length > 0) {
          modeloGemini = modelosDisponibles[0]
        }
      }
    } catch (listError) {
      console.log('No se pudo listar modelos Gemini, usando modelo por defecto: gemini-2.5-flash')
    }
    
    const url = `https://generativelanguage.googleapis.com/v1/models/${modeloGemini}:generateContent?key=${process.env.GEMINI_API_KEY}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || `HTTP ${response.status}`
      throw new Error(`Gemini error: ${errorMsg}`)
    }
    
    const data = await response.json()
    respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    console.log('📥 [DEBUG generateSituacionSignificativa] Respuesta de Gemini:', {
      tieneRespuesta: !!respuestaIA,
      longitud: respuestaIA.length,
      primeros100: respuestaIA.substring(0, 100)
    })
    
    if (!respuestaIA) {
      console.error('❌ [DEBUG generateSituacionSignificativa] Gemini no generó respuesta. Data completa:', JSON.stringify(data, null, 2))
      throw new Error('Gemini no generó ninguna respuesta')
    }
  } else if (aiProvider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada')
    }
    
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const modeloOpenAI = openaiModel || 'gpt-5.1'
    
    const requestConfig: any = {
      model: modeloOpenAI,
      messages: [
        {
          role: 'system',
          content: 'You are ChatGPT, a helpful and creative assistant.'
        },
        {
          role: 'user',
          content: promptCompleto
        }
      ],
      top_p: 1,
      max_completion_tokens: modeloOpenAI === 'gpt-5-nano' ? 8192 : 4096
    }
    
    if (modeloOpenAI !== 'gpt-5-mini' && modeloOpenAI !== 'gpt-5-nano') {
      requestConfig.temperature = 0.7
    }
    
    const completion = await openaiClient.chat.completions.create(requestConfig)
    respuestaIA = completion.choices[0]?.message?.content || ''
    
    console.log('📥 [DEBUG generateSituacionSignificativa] Respuesta de OpenAI:', {
      tieneRespuesta: !!respuestaIA,
      longitud: respuestaIA.length,
      primeros100: respuestaIA.substring(0, 100),
      modelo: modeloOpenAI
    })
    
    if (!respuestaIA) {
      console.error('❌ [DEBUG generateSituacionSignificativa] OpenAI no generó respuesta. Completion:', JSON.stringify(completion, null, 2))
      throw new Error(`OpenAI no generó ninguna respuesta`)
    }
  } else {
    throw new Error(`Proveedor de IA desconocido: ${aiProvider}`)
  }
  
  if (!respuestaIA) {
    throw new Error('No se pudo generar respuesta de la IA')
  }

  console.log('🔍 [DEBUG generateSituacionSignificativa] Extrayendo título de la respuesta de la IA...')
  console.log('   - Primeros 500 caracteres de la respuesta:', respuestaIA.substring(0, 500))

  const { titulo: tituloExtraido, situacionSignificativa } = parseTituloYSituacionDesdeRespuestaIA(
    respuestaIA,
    unidadData?.tituloUnidad || 'Situación Significativa'
  )

  if (!tituloExtraido || tituloExtraido === 'Situación Significativa') {
    console.log(
      `⚠️ [DEBUG generateSituacionSignificativa] Título por defecto o vacío. Primeros 1000 caracteres:`,
      respuestaIA.substring(0, 1000)
    )
  } else {
    console.log(`✅ [DEBUG generateSituacionSignificativa] Título extraído: "${tituloExtraido}"`)
  }

  console.log('✅ [DEBUG generateSituacionSignificativa] Situación significativa final:', {
    situacionSignificativa: situacionSignificativa.substring(0, 200),
    longitud: situacionSignificativa.length,
    titulo: tituloExtraido
  })

  return {
    situacionSignificativa,
    titulo: tituloExtraido,
    respuestaCompleta: respuestaIA
  }
}

