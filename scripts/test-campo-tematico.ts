// Script de prueba para verificar el contenido de campo temático
function convertCampoTematicoJSONToText(): string {
  const templateObj = {
    header: "PROMPT- Extraer el campo temático",
    introduccion: "Actúa como un experto pedagogo del Ministerio de Educación de Perú con más de 30 años de experiencia. Tus estudios de especialización se centran en el Currículo Nacional de la Educación Básica Regular. Tu labor fundamental es EXTRAER LOS TEMAS O CAMPOS TEMÁTICOS de cualquier desempeño.",
    condicionCentral: {
      titulo: "Condición central:",
      descripcion: "Solicitar uno o una lista de DESEMPEÑOS.",
      estructura: "Para la extracción del campo temático del desempeño es necesario guiarte de la siguiente estructura: Habilidad + campo temático + contexto (condición).",
      ejemplo: {
        titulo: "DESEMPEÑO:",
        desempenio: "{{desempenios}}",
        modelo: {
          titulo: "Para la extracción del campo temático debes considerar el siguiente MODELO aplicado al desempeño anterior:",
          habilidad: "HABILIDAD: \"Identifica\"",
          campoTematico: "CAMPO TEMÁTICO: \"información explícita, relevante y complementaria\"",
          contexto: "CONTEXTO (CONDICIÓN): \"seleccionando datos específicos y algunos detalles en diversos tipos de texto de estructura compleja y con información contrapuesta y vocabulario variado\". Si el desempeño no tiene contexto, no influye en el análisis, ni la extracción del campo semántico."
        },
        resultado: "Luego de este análisis el producto o resultado que debes presentar solo el campo temático."
      }
    },
    otrasCondiciones: [
      "Tu lenguaje debes ser claro, coherente y evitar ambigüedades.",
      "Por favor, no inventar ni imaginar sobre algún asunto del tema.",
      "Tu redacción escrita debe estar delineada a las normas de la Real Academia de la Lengua Española."
    ],
    footer: "Muy agradecido por el excelente trabajo."
  }

  const partesPrompt: string[] = []
  
  if (templateObj.header) {
    partesPrompt.push(templateObj.header)
    partesPrompt.push('')
  }
  
  if (templateObj.introduccion) {
    partesPrompt.push(templateObj.introduccion)
    partesPrompt.push('')
  }
  
  if (templateObj.condicionCentral) {
    if (templateObj.condicionCentral.titulo) {
      partesPrompt.push(templateObj.condicionCentral.titulo)
    }
    if (templateObj.condicionCentral.descripcion) {
      partesPrompt.push(templateObj.condicionCentral.descripcion)
      partesPrompt.push('')
    }
    if (templateObj.condicionCentral.estructura) {
      partesPrompt.push(templateObj.condicionCentral.estructura)
      partesPrompt.push('')
    }
    
    if (templateObj.condicionCentral.ejemplo) {
      const ejemplo = templateObj.condicionCentral.ejemplo
      if (ejemplo.titulo) partesPrompt.push(ejemplo.titulo)
      if (ejemplo.desempenio) {
        partesPrompt.push(ejemplo.desempenio)
      }
      partesPrompt.push('')
      if (ejemplo.modelo) {
        if (ejemplo.modelo.titulo) partesPrompt.push(ejemplo.modelo.titulo)
        if (ejemplo.modelo.habilidad) partesPrompt.push(ejemplo.modelo.habilidad)
        if (ejemplo.modelo.campoTematico) partesPrompt.push(ejemplo.modelo.campoTematico)
        if (ejemplo.modelo.contexto) partesPrompt.push(ejemplo.modelo.contexto)
        partesPrompt.push('')
      }
      if (ejemplo.resultado) partesPrompt.push(ejemplo.resultado)
      partesPrompt.push('')
    }
  }
  
  if (templateObj.otrasCondiciones && Array.isArray(templateObj.otrasCondiciones)) {
    partesPrompt.push('Otras condiciones:')
    templateObj.otrasCondiciones.forEach((condicion: string) => {
      partesPrompt.push(condicion)
    })
    partesPrompt.push('')
  }
  
  if (templateObj.footer) {
    partesPrompt.push(templateObj.footer)
  }
  
  return partesPrompt.join('\n')
}

const resultado = convertCampoTematicoJSONToText()
console.log('Longitud del texto:', resultado.length)
console.log('\n=== CONTENIDO COMPLETO ===')
console.log(resultado)
console.log('\n=== FIN ===')

