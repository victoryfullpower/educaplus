/**
 * Convierte un .docx (stdin) a PDF (stdout).
 * 1) LibreOffice headless (producción / Linux)
 * 2) Microsoft Word vía COM en Windows (desarrollo sin LibreOffice)
 */
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Readable } from 'node:stream'

function findSofficePath() {
  const envPath = process.env.LIBREOFFICE_PATH
  if (envPath && existsSync(envPath)) return envPath

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ]
    for (const c of candidates) {
      if (existsSync(c)) return c
    }
  }

  if (process.platform === 'darwin') {
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    if (existsSync(macPath)) return macPath
  }

  return null
}

function libreOfficeDisponible() {
  const path = findSofficePath()
  if (path) return path
  const test = spawnSync('soffice', ['--version'], {
    encoding: 'utf8',
    timeout: 8000,
    windowsHide: true
  })
  if (!test.error && test.status === 0) return 'soffice'
  return null
}

async function leerStdin() {
  const chunks = []
  for await (const chunk of Readable.toWeb(process.stdin)) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function leerPdfGenerado(dir, baseName = 'input') {
  const pdfDirecto = join(dir, `${baseName}.pdf`)
  if (existsSync(pdfDirecto)) {
    return readFileSync(pdfDirecto)
  }
  const pdfs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (pdfs.length === 0) {
    throw new Error('No se generó ningún archivo PDF')
  }
  return readFileSync(join(dir, pdfs[0]))
}

function convertirConLibreOffice(soffice, docxPath, dir) {
  const result = spawnSync(
    soffice,
    [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--convert-to',
      'pdf',
      '--outdir',
      dir,
      docxPath
    ],
    { encoding: 'utf8', timeout: 120000, windowsHide: true }
  )

  if (result.error) {
    throw new Error(
      `No se pudo ejecutar LibreOffice (${soffice}): ${result.error.message}`
    )
  }
  if (result.status !== 0) {
    const detalle = (result.stderr || result.stdout || '').trim()
    throw new Error(
      detalle ||
        `LibreOffice terminó con código ${result.status}. Instálalo o define LIBREOFFICE_PATH.`
    )
  }

  return leerPdfGenerado(dir)
}

function convertirConWordWindows(docxPath, pdfPath) {
  const psScript = join(tmpdir(), `docx2pdf-word-${Date.now()}.ps1`)
  writeFileSync(
    psScript,
    `param([string]$Docx, [string]$Pdf)
$ErrorActionPreference = 'Stop'
$word = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($Docx)
  $wdFormatPDF = 17
  $doc.SaveAs([ref]$Pdf, [ref]$wdFormatPDF)
  $doc.Close()
} catch {
  Write-Error $_.Exception.Message
  exit 1
} finally {
  if ($word -ne $null) {
    $word.Quit()
    [void][System.Runtime.Interopservices.Marshal]::ReleaseComObject($word)
  }
}
`,
    'utf8'
  )

  try {
    const result = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        psScript,
        '-Docx',
        docxPath,
        '-Pdf',
        pdfPath
      ],
      { encoding: 'utf8', timeout: 120000, windowsHide: true }
    )

    if (result.status !== 0) {
      const detalle = (result.stderr || result.stdout || '').trim()
      throw new Error(
        detalle ||
          'Microsoft Word no pudo convertir el documento. ¿Tienes Word instalado?'
      )
    }
    if (!existsSync(pdfPath)) {
      throw new Error('Microsoft Word no generó el archivo PDF')
    }
    return readFileSync(pdfPath)
  } finally {
    try {
      rmSync(psScript, { force: true })
    } catch {
      /* ignorar */
    }
  }
}

function convertirBuffer(input) {
  const dir = mkdtempSync(join(tmpdir(), 'docx2pdf-'))
  const docxPath = join(dir, 'input.docx')
  const pdfPath = join(dir, 'input.pdf')
  writeFileSync(docxPath, input)

  const errores = []

  try {
    const soffice = libreOfficeDisponible()
    if (soffice) {
      try {
        return convertirConLibreOffice(soffice, docxPath, dir)
      } catch (e) {
        errores.push(`LibreOffice: ${e instanceof Error ? e.message : String(e)}`)
      }
    } else {
      errores.push('LibreOffice: no instalado')
    }

    if (process.platform === 'win32') {
      try {
        return convertirConWordWindows(docxPath, pdfPath)
      } catch (e) {
        errores.push(`Word: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    throw new Error(
      `No se pudo convertir DOCX a PDF. ${errores.join(' | ')}. ` +
        'En servidor instala LibreOffice; en Windows de desarrollo puedes usar Microsoft Word.'
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  const input = await leerStdin()
  if (input.length === 0) {
    throw new Error('No se recibió ningún DOCX en la entrada')
  }
  const out = convertirBuffer(input)
  process.stdout.write(out)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
})
