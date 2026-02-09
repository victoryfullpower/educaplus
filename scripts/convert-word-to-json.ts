import mammoth from 'mammoth'
import * as fs from 'fs'
import * as path from 'path'

async function convertWordToJson() {
  const inputPath = path.join(process.cwd(), 'templates', 'PROMT_UNIDAD DE APRENDIZAJE.docx')
  const outputPath = path.join(process.cwd(), 'templates', 'PROMT_UNIDAD DE APRENDIZAJE.json')

  try {
    console.log('Leyendo archivo Word...')
    const buffer = fs.readFileSync(inputPath)
    
    console.log('Extrayendo contenido...')
    const result = await mammoth.extractRawText({ buffer })
    const htmlResult = await mammoth.convertToHtml({ buffer })
    
    // Estructura JSON con el contenido
    const jsonData = {
      metadata: {
        sourceFile: 'PROMT_UNIDAD DE APRENDIZAJE.docx',
        convertedAt: new Date().toISOString(),
        format: 'json'
      },
      content: {
        text: result.value,
        html: htmlResult.value,
        messages: result.messages
      }
    }

    // Guardar como JSON
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8')
    
    console.log(`✅ Archivo JSON creado exitosamente en: ${outputPath}`)
    console.log(`📄 Longitud del texto extraído: ${result.value.length} caracteres`)
    
    if (result.messages.length > 0) {
      console.log(`⚠️  Advertencias durante la conversión: ${result.messages.length}`)
      result.messages.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. ${msg.type}: ${msg.message}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error al convertir el archivo:', error)
    if (error instanceof Error) {
      console.error('Detalles:', error.message)
    }
    process.exit(1)
  }
}

convertWordToJson()

