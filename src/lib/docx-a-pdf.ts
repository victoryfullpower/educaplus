import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { Readable } from 'node:stream'

const SCRIPT_DOCX_A_PDF = join(process.cwd(), 'scripts', 'docx-a-pdf.mjs')

function streamABuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/** Convierte un buffer .docx a PDF usando LibreOffice en subproceso. */
export function convertirDocxAPdfBuffer(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_DOCX_A_PDF], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })

    const stderrChunks: Buffer[] = []
    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })

    const stdoutPromise = streamABuffer(child.stdout)

    child.on('error', (err) => {
      reject(new Error(`No se pudo iniciar la conversión a PDF: ${err.message}`))
    })

    child.stdin.write(input)
    child.stdin.end()

    child.on('close', async (code) => {
      if (code !== 0) {
        const detalle = Buffer.concat(stderrChunks).toString('utf8').trim()
        reject(
          new Error(
            detalle ||
              'No se pudo convertir el documento a PDF. Instala LibreOffice o define LIBREOFFICE_PATH.'
          )
        )
        return
      }

      try {
        const out = await stdoutPromise
        if (out.length === 0) {
          reject(new Error('La conversión a PDF no devolvió datos'))
          return
        }
        resolve(out)
      } catch (err) {
        reject(err)
      }
    })
  })
}
