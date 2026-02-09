import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

interface ExcelRow {
  [key: string]: any;
}

async function importExcel() {
  try {
    const excelPath = path.join(__dirname, '../templates/competencias desempenio.xlsx');
    console.log('Leyendo archivo Excel:', excelPath);

    const workbook = XLSX.readFile(excelPath);

    // Limpiar datos existentes (en orden inverso de dependencias)
    console.log('\n=== Limpiando datos existentes ===');
    await prisma.desempenio.deleteMany();
    await prisma.capacidad.deleteMany();
    await prisma.estandar.deleteMany();
    await prisma.competencia.deleteMany();
    await prisma.grado.deleteMany();
    await prisma.nivel.deleteMany();
    await prisma.area.deleteMany();

    // 1. Importar Area
    console.log('\n=== Importando Area ===');
    const areaSheet = workbook.Sheets['area'];
    const areaData: ExcelRow[] = XLSX.utils.sheet_to_json(areaSheet);
    for (const row of areaData) {
      await prisma.area.create({
        data: {
          id: row.idarea,
          descripcion: row.descripcion,
        },
      });
    }
    console.log(`✓ Importadas ${areaData.length} áreas`);

    // 2. Importar Nivel
    console.log('\n=== Importando Nivel ===');
    const nivelSheet = workbook.Sheets['nivel'];
    const nivelData: ExcelRow[] = XLSX.utils.sheet_to_json(nivelSheet);
    for (const row of nivelData) {
      await prisma.nivel.create({
        data: {
          id: row.idnivel,
          descripcion: row.descripcion,
        },
      });
    }
    console.log(`✓ Importados ${nivelData.length} niveles`);

    // 3. Importar Grado
    console.log('\n=== Importando Grado ===');
    const gradoSheet = workbook.Sheets['grados'];
    const gradoData: ExcelRow[] = XLSX.utils.sheet_to_json(gradoSheet);
    for (const row of gradoData) {
      await prisma.grado.create({
        data: {
          id: row.idgrado,
          descripcion: row.Descripcion || row['DESCRIPCION '] || null,
        },
      });
    }
    console.log(`✓ Importados ${gradoData.length} grados`);

    // 4. Importar Competencia
    console.log('\n=== Importando Competencia ===');
    const competenciaSheet = workbook.Sheets['competencias'];
    const competenciaData: ExcelRow[] = XLSX.utils.sheet_to_json(competenciaSheet);
    for (const row of competenciaData) {
      await prisma.competencia.create({
        data: {
          id: row.idcompetencia,
          descripcion: row.descripcion,
          numeroCompetencia: row['numero competencia'],
          idarea: row.idarea,
          idgrado: row.idgrado,
          idnivel: row.idnivel,
        },
      });
    }
    console.log(`✓ Importadas ${competenciaData.length} competencias`);

    // 5. Importar Estandar
    console.log('\n=== Importando Estandar ===');
    const estandarSheet = workbook.Sheets['standares'];
    const estandarData: ExcelRow[] = XLSX.utils.sheet_to_json(estandarSheet);
    for (const row of estandarData) {
      await prisma.estandar.create({
        data: {
          id: row.idstandar,
          descripcion: row.descripcion,
          ordenamiento: row.ordenamiento,
          idcompetencia: row.idcompetencia,
        },
      });
    }
    console.log(`✓ Importados ${estandarData.length} estándares`);

    // 6. Importar Capacidad
    console.log('\n=== Importando Capacidad ===');
    const capacidadSheet = workbook.Sheets['capacidades'];
    const capacidadData: ExcelRow[] = XLSX.utils.sheet_to_json(capacidadSheet);
    for (const row of capacidadData) {
      await prisma.capacidad.create({
        data: {
          id: row.idcapacidad,
          descripcion: row.descripcion,
          idcompetencia: row.idcompetencia,
          idstandar: row.idstandar,
        },
      });
    }
    console.log(`✓ Importadas ${capacidadData.length} capacidades`);

    // 7. Importar Desempenio
    console.log('\n=== Importando Desempenio ===');
    const desempenioSheet = workbook.Sheets['desempeño'];
    const desempenioData: ExcelRow[] = XLSX.utils.sheet_to_json(desempenioSheet);
    for (const row of desempenioData) {
      await prisma.desempenio.create({
        data: {
          id: row.iddesempenio,
          descripcion: row.descripcion,
          idcapacidad: row.idcapacidad,
        },
      });
    }
    console.log(`✓ Importados ${desempenioData.length} desempeños`);

    console.log('\n✅ ¡Importación completada exitosamente!');
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la importación
importExcel()
  .then(() => {
    console.log('Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

