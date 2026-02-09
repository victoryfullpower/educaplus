/**
 * Script para verificar el estado actual del template
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkTemplate(docxPath) {
  try {
    console.log(`\nVerificando template: ${path.basename(docxPath)}`);
    
    const content = fs.readFileSync(docxPath);
    const zip = new PizZip(content);
    const documentXml = zip.files['word/document.xml'];
    
    if (!documentXml) {
      console.log('  ❌ No se encontró word/document.xml');
      return;
    }
    
    let xmlContent = documentXml.asText();
    
    // Buscar las variables
    const compNroIdx = xmlContent.indexOf('{{competencianro}}');
    const compDescIdx = xmlContent.indexOf('{{competenciadescripcion}}');
    const estandaresIdx = xmlContent.indexOf('{{estandares}}');
    
    console.log('\n  Variables encontradas:');
    console.log(`    - {{competencianro}}: ${compNroIdx > -1 ? 'SÍ' : 'NO'}`);
    console.log(`    - {{competenciadescripcion}}: ${compDescIdx > -1 ? 'SÍ' : 'NO'}`);
    console.log(`    - {{estandares}}: ${estandaresIdx > -1 ? 'SÍ' : 'NO'}`);
    
    if (compNroIdx === -1) {
      console.log('\n  ❌ No se encontró {{competencianro}}');
      return;
    }
    
    // Verificar en qué fila está cada variable
    const findRowNumber = (pos) => {
      const rowsBefore = xmlContent.substring(0, pos).match(/<w:tr/g);
      return rowsBefore ? rowsBefore.length : 0;
    };
    
    if (compNroIdx > -1) {
      const rowNro = findRowNumber(compNroIdx);
      console.log(`\n  {{competencianro}} está en la fila: ${rowNro}`);
      
      // Buscar el <w:tr> que contiene esta variable
      let trStart = compNroIdx;
      while (trStart > 0 && xmlContent.substring(trStart - 5, trStart) !== '<w:tr') {
        trStart--;
        if (compNroIdx - trStart > 2000) break;
      }
      
      let trEnd = compNroIdx;
      while (trEnd < xmlContent.length && xmlContent.substring(trEnd, trEnd + 6) !== '</w:tr>') {
        trEnd++;
        if (trEnd - compNroIdx > 3000) break;
      }
      trEnd += 6;
      
      if (trStart > 0 && trEnd < xmlContent.length) {
        const rowContent = xmlContent.substring(trStart, trEnd);
        console.log(`    - Inicio de fila: ${trStart}`);
        console.log(`    - Fin de fila: ${trEnd}`);
        console.log(`    - Tiene {{competenciadescripcion}}: ${rowContent.includes('{{competenciadescripcion}}')}`);
        console.log(`    - Tiene {{estandares}}: ${rowContent.includes('{{estandares}}')}`);
        console.log(`    - Tiene {#competencias}: ${rowContent.includes('{#competencias}')}`);
        console.log(`    - Tiene {/competencias}: ${rowContent.includes('{/competencias}')}`);
        
        // Verificar tags antes y después
        const beforeRow = xmlContent.substring(Math.max(0, trStart - 200), trStart);
        const afterRow = xmlContent.substring(trEnd, Math.min(xmlContent.length, trEnd + 200));
        console.log(`    - Tiene {#competencias} antes: ${beforeRow.includes('{#competencias}')}`);
        console.log(`    - Tiene {/competencias} después: ${afterRow.includes('{/competencias}')}`);
      }
    }
    
    if (compDescIdx > -1) {
      const rowDesc = findRowNumber(compDescIdx);
      console.log(`\n  {{competenciadescripcion}} está en la fila: ${rowDesc}`);
    }
    
    if (estandaresIdx > -1) {
      const rowEst = findRowNumber(estandaresIdx);
      console.log(`\n  {{estandares}} está en la fila: ${rowEst}`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

function main() {
  const targetFile = path.join(__dirname, '..', 'templates', 'gradosunidades', '1° UNIDAD - COMUNICACIÓN .docx');
  checkTemplate(targetFile);
}

main();

