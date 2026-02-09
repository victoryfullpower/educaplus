import { NextRequest, NextResponse } from 'next/server'
import { generateCampoTematico } from '@/lib/generate-campo-tematico'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const tiempoInicio = Date.now()
  console.log('⏱️  [INICIO] Iniciando generación de campo temático...')
  
  try {
    const { desempenios, formData, aiProvider = 'gemini', openaiModel = 'gpt-5.1' } = await request.json()
    console.log(`⏱️  [0.0s] Datos recibidos del cliente`)

    if (!desempenios || !Array.isArray(desempenios) || desempenios.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un desempeño' },
        { status: 400 }
      )
    }

    // Usar la función helper para generar el campo temático
    const resultado = await generateCampoTematico(desempenios, aiProvider, openaiModel)

    const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
    console.log(`✅ [FIN] Campo temático generado en ${tiempoTotal}s`)
    console.log(`📝 Campo temático: "${resultado.campoTematico}"`)

    return NextResponse.json({
      campoTematico: resultado.campoTematico,
      respuestaCompleta: resultado.respuestaCompleta
    })
  } catch (error: any) {
    const tiempoError = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
    console.error(`❌ [ERROR] Falló después de ${tiempoError}s:`, error)
    
    let errorMessage = 'Error al generar el campo temático'
    
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

