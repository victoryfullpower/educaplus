import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    })

    // Probar diferentes modelos
    const modelosParaProbar = ['deepseek-chat', 'deepseek-reasoner']
    const resultados: any = {}

    for (const modelo of modelosParaProbar) {
      try {
        console.log(`Probando modelo: ${modelo}`)
        const completion = await deepseekClient.chat.completions.create({
          model: modelo,
          messages: [
            {
              role: 'user',
              content: 'Hola, responde solo con "OK"'
            }
          ],
          max_tokens: 10,
        })
        
        resultados[modelo] = {
          success: true,
          response: completion.choices[0]?.message?.content || 'Sin respuesta'
        }
      } catch (error: any) {
        resultados[modelo] = {
          success: false,
          error: error?.message || String(error),
          status: error?.status || error?.code || 'unknown',
          details: error?.response?.data || error?.error || {}
        }
      }
    }

    return NextResponse.json({
      apiKey: process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...' + process.env.DEEPSEEK_API_KEY.substring(process.env.DEEPSEEK_API_KEY.length - 4),
      resultados,
      recomendacion: resultados['deepseek-chat']?.success 
        ? 'Usar: deepseek-chat'
        : 'Verifica tu API key en https://platform.deepseek.com/api_keys'
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Error al probar DeepSeek',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

