import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    // Probar ambos endpoints: v1 y v1beta
    const resultados: any = {
      v1: null,
      v1beta: null,
    }

    // Intentar con v1
    try {
      const responseV1 = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      
      if (responseV1.ok) {
        const data = await responseV1.json()
        resultados.v1 = {
          success: true,
          models: data.models?.map((m: any) => ({
            name: m.name,
            displayName: m.displayName,
            supportedMethods: m.supportedGenerationMethods,
          })) || []
        }
      } else {
        resultados.v1 = {
          success: false,
          error: await responseV1.text()
        }
      }
    } catch (error: any) {
      resultados.v1 = {
        success: false,
        error: error.message
      }
    }

    // Intentar con v1beta
    try {
      const responseV1beta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      
      if (responseV1beta.ok) {
        const data = await responseV1beta.json()
        resultados.v1beta = {
          success: true,
          models: data.models?.map((m: any) => ({
            name: m.name,
            displayName: m.displayName,
            supportedMethods: m.supportedGenerationMethods,
          })) || []
        }
      } else {
        resultados.v1beta = {
          success: false,
          error: await responseV1beta.text()
        }
      }
    } catch (error: any) {
      resultados.v1beta = {
        success: false,
        error: error.message
      }
    }

    // Filtrar modelos que soportan generateContent
    const modelosDisponibles = []
    
    if (resultados.v1?.success) {
      modelosDisponibles.push(...resultados.v1.models.filter((m: any) => 
        m.supportedMethods?.includes('generateContent')
      ).map((m: any) => ({ ...m, version: 'v1' })))
    }
    
    if (resultados.v1beta?.success) {
      modelosDisponibles.push(...resultados.v1beta.models.filter((m: any) => 
        m.supportedMethods?.includes('generateContent')
      ).map((m: any) => ({ ...m, version: 'v1beta' })))
    }

    return NextResponse.json({
      modelosDisponibles,
      resultadosCompletos: resultados,
      recomendacion: modelosDisponibles.length > 0 
        ? `Usar el modelo: ${modelosDisponibles[0].name}` 
        : 'No se encontraron modelos disponibles'
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Error al listar modelos',
        details: error.message
      },
      { status: 500 }
    )
  }
}

