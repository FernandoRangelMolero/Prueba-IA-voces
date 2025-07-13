// config.ts - Configuración de URLs para desarrollo y producción
const isProduction = window.location.hostname !== 'localhost';

const config = {
  // En producción, usar URLs relativas al mismo dominio
  // En desarrollo, usar localhost:3001
  API_BASE_URL: isProduction ? '' : 'http://localhost:3001',
  
  endpoints: {
    session: '/session',
    supportedFileTypes: '/supported-file-types', 
    processDocument: '/process-document'
  }
};

export default config;
