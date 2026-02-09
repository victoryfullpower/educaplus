import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.join(__dirname, '..', 'templates', 'gradosunidades', '1° UNIDAD - COMUNICACIÓN .docx'));
const zip = new PizZip(content);
let xmlContent = zip.files['word/document.xml'].asText();

// Buscar {{competencias}}
const idx = xmlContent.indexOf('{{competencias}}');
if (idx === -1) {
  console.log('No se encontró {{competencias}}');
  process.exit(1);
}

// Buscar el párrafo que lo contiene
let paraStart = idx;
while (paraStart > 0 && xmlContent.substring(paraStart - 10, paraStart + 5).indexOf('<w:p') === -1) {
  paraStart--;
  if (idx - paraStart > 2000) break;
}
const paraStartMatch = xmlContent.substring(Math.max(0, paraStart - 200), paraStart + 100).lastIndexOf('<w:p');
if (paraStartMatch > -1) {
  paraStart = Math.max(0, paraStart - 200) + paraStartMatch;
}

let paraEnd = idx;
while (paraEnd < xmlContent.length && xmlContent.substring(paraEnd, paraEnd + 5) !== '</w:p>') {
  paraEnd++;
  if (paraEnd - idx > 2000) break;
}
paraEnd += 5;

// Tabla de 2 filas y 2 columnas vacías
const tabla = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="2962"/><w:gridCol w:w="11907"/></w:tblGrid><w:tr w:rsidR="0070116D" w:rsidRPr="00AF5D18" w14:paraId="44109EAE" w14:textId="77777777" w:rsidTr="002669F9"><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7" w:themeFill="accent3" w:themeFillTint="33"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="761D858C" w14:textId="77777777" w:rsidR="0070116D" w:rsidRPr="00AF5D18" w:rsidRDefault="0062243F" w:rsidP="002669F9"><w:pPr><w:pStyle w:val="ListParagraph"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r w:rsidRPr="00AF5D18"><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t></w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="C1F0C7" w:themeFill="accent3" w:themeFillTint="33"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="761D858C" w14:textId="77777777" w:rsidR="0070116D" w:rsidRPr="00AF5D18" w:rsidRDefault="0062243F" w:rsidP="002669F9"><w:pPr><w:pStyle w:val="ListParagraph"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r w:rsidRPr="00AF5D18"><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t></w:t></w:r></w:p></w:tc></w:tr><w:tr w:rsidR="0070116D" w:rsidRPr="00AF5D18" w14:paraId="44109EAE" w14:textId="77777777" w:rsidTr="002669F9"><w:trPr><w:trHeight w:val="340"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2962" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="761D858C" w14:textId="77777777" w:rsidR="0070116D" w:rsidRPr="00AF5D18" w:rsidRDefault="0062243F" w:rsidP="002669F9"><w:pPr><w:pStyle w:val="ListParagraph"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r w:rsidRPr="00AF5D18"><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t></w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="11907" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="761D858C" w14:textId="77777777" w:rsidR="0070116D" w:rsidRPr="00AF5D18" w:rsidRDefault="0062243F" w:rsidP="002669F9"><w:pPr><w:pStyle w:val="ListParagraph"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r w:rsidRPr="00AF5D18"><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t></w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;

const newXml = xmlContent.substring(0, paraStart) + tabla + xmlContent.substring(paraEnd);

zip.file('word/document.xml', newXml);
const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(path.join(__dirname, '..', 'templates', 'gradosunidades', '1° UNIDAD - COMUNICACIÓN .docx'), buffer);

console.log('✓ Tabla de 2 filas y 2 columnas creada en lugar de {{competencias}}');

