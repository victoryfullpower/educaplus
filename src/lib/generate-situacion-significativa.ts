import OpenAI from 'openai'
import { getPromptByDescripcion, buildPromptFromText } from './prompt-helpers'

export async function generateSituacionSignificativa(
  unidadData: {
    problemaPotencialidad?: string
    producto?: string
    tituloUnidad?: string
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

  // Mapeo de variables para reemplazar en el template
  const variables = {
    area: formData?.area || 'No especificado',
    grado: formData?.grado || 'No especificado',
    institucion: formData?.institucion || 'No especificado',
    problemaPotencialidad: unidadData?.problemaPotencialidad || 'No especificado',
    departamento: formData?.departamento || 'No especificado',
    provincia: formData?.provincia || 'No especificado',
    distrito: formData?.distrito || 'No especificado',
    producto: unidadData?.producto || 'No especificado'
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

  // Extraer el título de la respuesta de la IA
  let tituloExtraido = ''
  let respuestaIAClean = respuestaIA
  
  console.log('🔍 [DEBUG generateSituacionSignificativa] Extrayendo título de la respuesta de la IA...')
  console.log('   - Primeros 500 caracteres de la respuesta:', respuestaIA.substring(0, 500))
  
  // Buscar título en diferentes formatos que la IA puede usar
  const patronesTitulo = [
    // Formato: TÍTULO: "texto" o Título: "texto"
    /TÍTULO[:\s]*["']([^"']{10,150})["']/gi,
    /Título[:\s]*["']([^"']{10,150})["']/gi,
    // Formato: "texto" al inicio (primeras líneas)
    /^["']([^"']{10,150})["']/m,
    // Formato: texto entre comillas en las primeras 3 líneas
    /(?:^|\n)["']([^"']{10,150})["']/m,
    // Formato: Promovemos... (título común)
    /["'](Promovemos[^"']{0,100})["']/gi,
    // Cualquier texto entre comillas en las primeras líneas (más de 10 caracteres)
    /(?:^|\n)[^"']*["']([^"']{15,150})["']/m,
  ]
  
  for (const patron of patronesTitulo) {
    const match = respuestaIA.match(patron)
    if (match && match[1]) {
      const tituloCandidato = match[1].trim()
      // Validar que el título tenga sentido (no sea solo números o caracteres especiales)
      if (tituloCandidato.length >= 10 && tituloCandidato.length <= 150 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(tituloCandidato)) {
        tituloExtraido = tituloCandidato
        console.log(`✅ [DEBUG generateSituacionSignificativa] Título extraído con patrón ${patronesTitulo.indexOf(patron) + 1}: "${tituloExtraido}"`)
        
        // Remover el título del contenido
        respuestaIAClean = respuestaIAClean.replace(match[0], '').trim()
        respuestaIAClean = respuestaIAClean.replace(/\n{3,}/g, '\n\n')
        
        console.log(`🧹 [DEBUG generateSituacionSignificativa] Título removido del contenido. Longitud original: ${respuestaIA.length}, nueva: ${respuestaIAClean.length}`)
        break
      }
    }
  }
  
  // Si no se encontró título, intentar extraer la primera línea significativa
  if (!tituloExtraido) {
    const lineas = respuestaIA.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lineas.length > 0) {
      const primeraLinea = lineas[0]
      // Si la primera línea parece un título (no muy larga, no empieza con número, etc.)
      if (primeraLinea.length >= 10 && primeraLinea.length <= 150 && 
          !/^\d+[\.\)]/.test(primeraLinea) && 
          /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(primeraLinea)) {
        // Remover comillas si las tiene
        tituloExtraido = primeraLinea.replace(/^["']|["']$/g, '').trim()
        console.log(`✅ [DEBUG generateSituacionSignificativa] Título extraído de la primera línea: "${tituloExtraido}"`)
        
        // Remover la primera línea del contenido
        respuestaIAClean = lineas.slice(1).join('\n').trim()
      }
    }
  }
  
  // Si aún no se encontró título, usar el valor por defecto
  if (!tituloExtraido) {
    tituloExtraido = unidadData?.tituloUnidad || 'Situación Significativa'
    console.log(`⚠️ [DEBUG generateSituacionSignificativa] No se pudo extraer título, usando valor por defecto: "${tituloExtraido}"`)
    console.log(`   - Respuesta completa de la IA (primeros 1000 caracteres):`, respuestaIA.substring(0, 1000))
  }

  // Limpiar el contenido: remover saltos de línea y espacios múltiples
  const situacionSignificativa = respuestaIAClean
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  
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

