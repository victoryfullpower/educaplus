import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    // Listar modelos disponibles
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Filtrar solo modelos que soportan generateContent
    const availableModels = data.models?.filter((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    ) || []

    return NextResponse.json({
      models: availableModels.map((model: any) => ({
        name: model.name,
        displayName: model.displayName,
        supportedMethods: model.supportedGenerationMethods,
      })),
      allModels: data.models,
    })
  } catch (error: any) {
    console.error('Error al listar modelos:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return NextResponse.json(
      { 
        error: 'Error al listar modelos de Gemini',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

