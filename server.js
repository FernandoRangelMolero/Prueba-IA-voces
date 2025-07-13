// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { extractTextFromDocument, isSupportedFileType, getSupportedFileTypes } from "./services/documentService.js";

// Configurar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificar que las variables de entorno necesarias estén configuradas
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY no está configurada');
  process.exit(1);
}

console.log('🚀 Iniciando servidor...');
console.log('📁 Directorio actual:', __dirname);
console.log('🔑 OpenAI API Key configurada:', process.env.OPENAI_API_KEY ? 'Sí' : 'No');

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('📁 Directorio uploads creado');
}

// Configurar multer para subida de archivos
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    if (isSupportedFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}`));
    }
  }
});

// Usar una configuración de CORS más abierta para producción
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://prueba-ia-voces.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===============================================
// === TUS ENDPOINTS DE API (SIN CAMBIOS) ========
// ===============================================

// Health check endpoint para Render
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
        apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
    });
});

// Endpoint para la sesión WebRTC
app.post("/session", async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        console.log('🔑 API Key check:', apiKey ? `Configurada (${apiKey.length} chars)` : 'NO ENCONTRADA');
        
        if (!apiKey) {
          throw new Error("OpenAI API key is not configured on the server.");
        }

        console.log('🔐 Creando sesión de OpenAI Realtime...');
        
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-10-01",
            voice: "alloy",
          }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ OpenAI session creation failed:", {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                apiKeyLength: apiKey ? apiKey.length : 0
            });
            throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Sesión OpenAI creada exitosamente');
        res.send(data);
      } catch (error) {
        console.error("❌ Error in /session endpoint:", {
          message: error.message,
          stack: error.stack,
          apiKeyPresent: !!process.env.OPENAI_API_KEY,
          environment: process.env.NODE_ENV
        });
        res.status(500).send({ 
          error: "Failed to create session",
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
});

// Endpoint para procesar documentos
app.post("/process-document", upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ error: "No se subió ningún archivo" });
        }

        const { originalname, mimetype, path: filePath } = req.file;
        console.log(`Procesando documento: ${originalname} (${mimetype})`);

        // Extraer texto del documento
        const extractedText = await extractTextFromDocument(filePath, mimetype);
        
        // Limpiar el archivo temporal
        fs.unlinkSync(filePath);

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).send({ error: "No se pudo extraer texto del documento" });
        }

        res.send({ 
            filename: originalname,
            text: extractedText,
            wordCount: extractedText.split(/\s+/).length,
            characterCount: extractedText.length
        });

    } catch (error) {
        // Limpiar archivo temporal en caso de error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error("Error procesando documento:", error);
        res.status(500).send({ error: error.message || "Error procesando el documento" });
    }
});

// Endpoint para obtener tipos de archivo soportados
app.get("/supported-file-types", (req, res) => {
    res.send(getSupportedFileTypes());
});


// ===============================================
// === CÓDIGO AÑADIDO PARA SERVIR EL FRONTEND ====
// ===============================================

// Servir los archivos estáticos de la aplicación de React desde la carpeta 'dist'
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  // Configurar tipos MIME correctos para archivos estáticos
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));
  console.log('📦 Sirviendo archivos estáticos desde:', distPath);
} else {
  console.warn('⚠️ Directorio dist no encontrado. Ejecute "npm run build" primero.');
}

// También servir archivos de public/ (como vite.svg)
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));
  console.log('📁 Sirviendo archivos públicos desde:', publicPath);
}

// Para cualquier otra petición que no coincida con la API, se sirve el index.html de React.
// Esto es crucial para que el enrutador de React (client-side routing) funcione.
app.use((req, res, next) => {
  // Manejar archivos CSS que no existen (como index.css que Vite no genera)
  if (req.path.endsWith('.css') && !fs.existsSync(path.join(__dirname, 'dist', req.path))) {
    console.log(`⚠️ CSS file not found: ${req.path}, sending empty CSS`);
    res.setHeader('Content-Type', 'text/css');
    res.send('/* CSS file not found - styles are inlined */');
    return;
  }
  
  // Solo aplicar para rutas GET que no sean de API
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Aplicación no construida. Ejecute "npm run build" primero.');
    }
  } else {
    next();
  }
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

app.listen(port, '0.0.0.0', () => {
  console.log('🚀 Servidor iniciado exitosamente');
  console.log(`📡 Escuchando en puerto: ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📂 Directorio de trabajo: ${__dirname}`);
  console.log(`🔗 URL local: http://localhost:${port}`);
  
  // Verificar que el directorio dist existe
  const distExists = fs.existsSync(path.join(__dirname, 'dist'));
  console.log(`📦 Archivos estáticos: ${distExists ? '✅ Disponibles' : '❌ No encontrados'}`);
});