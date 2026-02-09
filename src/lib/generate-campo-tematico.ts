import OpenAI from 'openai'
import { getPromptByDescripcion, buildPromptFromText } from './prompt-helpers'

export async function generateCampoTematico(
  desempenios: string[],
  aiProvider: string = 'gemini',
  openaiModel: string = 'gpt-5.1'
): Promise<{ campoTematico: string; respuestaCompleta: string }> {
  if (!desempenios || desempenios.length === 0) {
    throw new Error('Se requiere al menos un desempeño')
  }

  // Validar que al menos una API key esté configurada
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error('Debes configurar al menos una API key: GEMINI_API_KEY o OPENAI_API_KEY')
  }

  // Obtener el prompt desde la BD
  const templateText = await getPromptByDescripcion('campo temático')
  
  if (!templateText) {
    throw new Error('Prompt de Campo Temático no encontrado en la base de datos. Asegúrate de que existe un prompt activo con esa descripción.')
  }
  
  // Formatear desempeños para la variable dinámica
  // Formato: cada desempeño en una línea con comillas
  const desempeniosFormateados = desempenios
    .map((desempenio: string, index: number) => `${index + 1}. "${desempenio}"`)
    .join('\n')
  
  // Variables dinámicas
  const variables = {
    desempenios: desempeniosFormateados
  }
  
  // Construir el prompt completo reemplazando las variables en el template de texto
  const promptCompleto = buildPromptFromText(templateText, variables)
  
  console.log('📝 [DEBUG generateCampoTematico] ===== PROMPT COMPLETO CONSTRUIDO =====')
  console.log('   - Longitud del prompt:', promptCompleto.length)
  console.log('   - Cantidad de desempeños recibidos:', desempenios.length)
  console.log('   - Desempeños en el prompt:')
  desempenios.forEach((d, idx) => {
    console.log(`     ${idx + 1}. ${d.substring(0, 100)}${d.length > 100 ? '...' : ''}`)
  })
  console.log('   - Primeros 300 caracteres del prompt:')
  console.log('     ' + promptCompleto.substring(0, 300).replace(/\n/g, '\\n'))
  console.log('   - Últimos 300 caracteres del prompt:')
  console.log('     ' + promptCompleto.substring(promptCompleto.length - 300).replace(/\n/g, '\\n'))

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
          maxOutputTokens: 2000,
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
    
    console.log('📥 [DEBUG generateCampoTematico] Respuesta de Gemini:', {
      tieneRespuesta: !!respuestaIA,
      longitud: respuestaIA.length,
      primeros100: respuestaIA.substring(0, 100)
    })
    
    if (!respuestaIA) {
      console.error('❌ [DEBUG generateCampoTematico] Gemini no generó respuesta. Data completa:', JSON.stringify(data, null, 2))
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
      max_completion_tokens: modeloOpenAI === 'gpt-5-nano' ? 4096 : 2048
    }
    
    if (modeloOpenAI !== 'gpt-5-mini' && modeloOpenAI !== 'gpt-5-nano') {
      requestConfig.temperature = 0.7
    }
    
    const completion = await openaiClient.chat.completions.create(requestConfig)
    respuestaIA = completion.choices[0]?.message?.content || ''
    
    console.log('📥 [DEBUG generateCampoTematico] Respuesta de OpenAI:', {
      tieneRespuesta: !!respuestaIA,
      longitud: respuestaIA.length,
      primeros100: respuestaIA.substring(0, 100),
      modelo: modeloOpenAI
    })
    
    if (!respuestaIA) {
      console.error('❌ [DEBUG generateCampoTematico] OpenAI no generó respuesta. Completion:', JSON.stringify(completion, null, 2))
      throw new Error(`OpenAI no generó ninguna respuesta`)
    }
  } else {
    throw new Error(`Proveedor de IA desconocido: ${aiProvider}`)
  }
  
  if (!respuestaIA) {
    throw new Error('No se pudo generar respuesta de la IA')
  }

  // Limpiar la respuesta: extraer solo el campo temático
  let campoTematico = respuestaIA.trim()
  
  console.log('🧹 [DEBUG generateCampoTematico] Limpiando respuesta:', {
    respuestaOriginal: respuestaIA.substring(0, 200),
    longitudOriginal: respuestaIA.length
  })
  
  // Intentar extraer texto entre comillas si existe
  const matchComillas = campoTematico.match(/"([^"]+)"/)
  if (matchComillas && matchComillas[1]) {
    console.log('   - Encontrado texto entre comillas')
    campoTematico = matchComillas[1].trim()
  }
  
  // Si hay "CAMPO TEMÁTICO:" o similar, extraer lo que viene después
  const matchCampoTematico = campoTematico.match(/CAMPO\s+TEMÁTICO[:\s]+(.+)/i)
  if (matchCampoTematico && matchCampoTematico[1]) {
    console.log('   - Encontrado patrón "CAMPO TEMÁTICO:"')
    campoTematico = matchCampoTematico[1].trim()
    // Remover comillas si las tiene
    campoTematico = campoTematico.replace(/^["']|["']$/g, '')
  }
  
  console.log('✅ [DEBUG generateCampoTematico] Campo temático final:', {
    campoTematico: campoTematico.substring(0, 200),
    longitud: campoTematico.length
  })

  return {
    campoTematico,
    respuestaCompleta: respuestaIA
  }
}


