const RE = /\s*[-–—−]?\s*¿[^?\n]+?\?\s*:?\s*/gu
const t = `¿Qué? Identificar y nombrar emociones en un texto oral y acompañarlas con gestos; ¿Cómo? Escuchando un relato corto, reconociendo palabras emocionales y practicando gestos; ¿Para qué? Para comunicar claramente cómo nos sentimos.`
const partes = t.split(RE).map(s => s.trim()).filter(Boolean)
console.log('partes', partes)
console.log('len', partes.length)
