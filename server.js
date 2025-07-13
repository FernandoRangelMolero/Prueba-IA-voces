// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractTextFromDocument, isSupportedFileType, getSupportedFileTypes } from "./services/documentService.js";

dotenv.config();

const app = express();
const port = 3001;

// Configurar multer para subida de archivos
const upload = multer({
  dest: 'uploads/',
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

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5176'] }));
app.use(bodyParser.json({ limit: '10mb' }));

// Crear directorio de uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Endpoint para la sesión WebRTC
app.post("/session", async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key is not configured on the server.");
        }

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-realtime-preview-2024-12-17",
            voice: "alloy",
          }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI session creation failed:", errorText);
            throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data = await response.json();
        res.send(data);
      } catch (error) {
        console.error("Error in /session endpoint:", error.message);
        res.status(500).send({ error: "Failed to create session" });
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


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});