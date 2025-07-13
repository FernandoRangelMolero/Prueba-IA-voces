// documentService.js
import fs from 'fs';
import mammoth from 'mammoth';

/**
 * Extrae texto de diferentes tipos de documentos
 * @param {string} filePath - Ruta del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Promise<string>} - Texto extraído del documento
 */
export async function extractTextFromDocument(filePath, mimeType) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    switch (mimeType) {
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractTextFromDocx(buffer);
      
      case 'application/msword':
        return await extractTextFromDoc(buffer);
      
      case 'text/plain':
        return extractTextFromTxt(buffer);
      
      case 'text/rtf':
        return extractTextFromRtf(buffer);
      
      case 'text/csv':
        return extractTextFromCsv(buffer);
      
      default:
        throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error extrayendo texto del documento:', error);
    throw new Error(`Error procesando el documento: ${error.message}`);
  }
}

/**
 * Extrae texto de archivos DOCX
 */
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extrae texto de archivos DOC (versión antigua de Word)
 */
async function extractTextFromDoc(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error('Los archivos .doc antiguos no son completamente soportados. Use .docx en su lugar.');
  }
}

/**
 * Extrae texto de archivos de texto plano
 */
function extractTextFromTxt(buffer) {
  return buffer.toString('utf-8');
}

/**
 * Extrae texto de archivos RTF
 */
function extractTextFromRtf(buffer) {
  const rtfContent = buffer.toString('utf-8');
  // Removemos los códigos de control RTF básicos
  return rtfContent
    .replace(/\\[a-z]+\d*\s?/gi, '') // Códigos de control
    .replace(/[{}]/g, '') // Llaves
    .replace(/\\\\/g, '\\') // Barras dobles
    .replace(/\\'/g, "'") // Comillas escapadas
    .trim();
}

/**
 * Extrae texto de archivos CSV
 */
function extractTextFromCsv(buffer) {
  const csvContent = buffer.toString('utf-8');
  // Convertimos CSV a texto legible
  const lines = csvContent.split('\n');
  const header = lines[0]?.split(',').map(col => col.trim().replace(/"/g, ''));
  
  let textOutput = `Documento CSV con ${lines.length - 1} filas de datos.\n\n`;
  textOutput += `Columnas: ${header?.join(', ')}\n\n`;
  
  // Mostramos algunas filas de ejemplo
  const sampleRows = lines.slice(1, Math.min(6, lines.length));
  textOutput += 'Muestra de datos:\n';
  sampleRows.forEach((row, index) => {
    if (row.trim()) {
      const values = row.split(',').map(val => val.trim().replace(/"/g, ''));
      textOutput += `Fila ${index + 1}: ${values.join(' | ')}\n`;
    }
  });
  
  return textOutput;
}

/**
 * Obtiene los tipos de archivo soportados
 */
export function getSupportedFileTypes() {
  return {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (DOCX)',
    'application/msword': 'Word (DOC)',
    'text/plain': 'Texto plano (TXT)',
    'text/rtf': 'Rich Text Format (RTF)',
    'text/csv': 'CSV'
  };
}

/**
 * Valida si el tipo de archivo es soportado
 */
export function isSupportedFileType(mimeType) {
  return Object.keys(getSupportedFileTypes()).includes(mimeType);
}
