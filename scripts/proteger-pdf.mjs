/**
 * Procesa un PDF por stdin y escribe el PDF protegido por stdout.
 * Se ejecuta fuera del bundle de Next.js para evitar errores del worker de pdfjs.
 */
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { PDFDocument as PDFDocumentEncrypt } from 'pdf-lib-with-encrypt'

const SCALE = 2

/** Permisos PDF: imprimir sí; copiar, editar y extraer no (sin pedir clave al abrir). */
async function aplicarPermisosPdf(pdfBytes) {
  const ownerPassword = randomBytes(24).toString('hex')
  const doc = await PDFDocumentEncrypt.load(pdfBytes)
  await doc.encrypt({
    userPassword: '',
    ownerPassword,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false
    }
  })
  return Buffer.from(await doc.save({ useObjectStreams: false }))
}

async function leerStdin() {
  const chunks = []
  for await (const chunk of Readable.toWeb(process.stdin)) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function configurarPdfJs() {
  const require = createRequire(import.meta.url)
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
  const workerMod = await import(pathToFileURL(workerPath).href)
  globalThis.pdfjsWorker = workerMod

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
}

async function protegerBuffer(input) {
  await configurarPdfJs()

  const { pdf } = await import('pdf-to-img')
  const src = await pdf(input, { scale: SCALE })
  const outDoc = await PDFDocument.create()

  try {
    for await (const pngBuffer of src) {
      const image = await outDoc.embedPng(pngBuffer)
      const page = outDoc.addPage([image.width, image.height])
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      })
    }
  } finally {
    if (typeof src.destroy === 'function') {
      await src.destroy()
    }
  }

  if (outDoc.getPageCount() === 0) {
    throw new Error('El PDF no tiene páginas válidas')
  }

  const sinPermisos = Buffer.from(await outDoc.save())
  return aplicarPermisosPdf(sinPermisos)
}

async function main() {
  const input = await leerStdin()
  if (input.length === 0) {
    throw new Error('No se recibió ningún PDF en la entrada')
  }

  const out = await protegerBuffer(input)
  process.stdout.write(out)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
})
