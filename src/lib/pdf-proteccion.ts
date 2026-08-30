import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { Readable } from 'node:stream'

/** Escala usada en scripts/proteger-pdf.mjs */
export const RASTER_SCALE = 2

const SCRIPT_PROTEGER = join(process.cwd(), 'scripts', 'proteger-pdf.mjs')

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

/**
 * Rasteriza el PDF en un subproceso Node (sin Turbopack) y devuelve el PDF protegido.
 */
export function protegerPdfBuffer(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PROTEGER], {
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
      reject(new Error(`No se pudo iniciar el proceso de protección: ${err.message}`))
    })

    child.stdin.write(input)
    child.stdin.end()

    child.on('close', async (code) => {
      if (code !== 0) {
        const detalle = Buffer.concat(stderrChunks).toString('utf8').trim()
        reject(
          new Error(detalle || `El proceso de protección terminó con código ${code}`)
        )
        return
      }

      try {
        const out = await stdoutPromise
        if (out.length === 0) {
          reject(new Error('El proceso no devolvió un PDF'))
          return
        }
        resolve(out)
      } catch (err) {
        reject(err)
      }
    })
  })
}

export function esPdfPorNombre(nombre: string): boolean {
  return nombre.toLowerCase().endsWith('.pdf')
}
