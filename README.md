# 🎤 Asistente de Voz con OpenAI Realtime API

Un asistente de voz inteligente que utiliza la OpenAI Realtime API para conversaciones en tiempo real con GPT-4o.

## ✨ Características

- 🗣️ **Conversaciones de voz en tiempo real** con GPT-4o
- 📋 **Ejemplos predefinidos** (Mercadona, restaurante, tienda, empresa)
- 📄 **Documentos personalizados** configurables
- 🎨 **Interfaz moderna** y fácil de usar
- ⚡ **WebRTC** para audio de baja latencia
- 🔒 **Configuración segura** de API keys

## 🚀 Despliegue en Render

### Configuración Automática

1. **Fork este repositorio** en tu cuenta de GitHub
2. **Conecta tu repositorio** a Render.com
3. **Configura las variables de entorno**:
   - `OPENAI_API_KEY`: Tu API key de OpenAI
   - `NODE_ENV`: `production`

### Configuración Manual en Render

- **Build Command**: `npm run render-build`
- **Start Command**: `npm start`
- **Environment**: Node.js
- **Node Version**: 18 o superior

## 🛠️ Desarrollo Local

### Prerrequisitos

- Node.js 18+
- npm o yarn
- API Key de OpenAI con acceso a Realtime API

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/FernandoRangelMolero/Prueba-IA-voces.git
cd Prueba-IA-voces

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu OPENAI_API_KEY
```

### Scripts Disponibles

```bash
# Desarrollo (frontend + backend)
npm run dev          # Frontend en localhost:5173
node server.js       # Backend en localhost:3001

# Producción
npm run build        # Construir para producción
npm start            # Iniciar servidor de producción
```

## 🔧 Configuración

### Variables de Entorno

```env
OPENAI_API_KEY=sk-proj-...  # Tu API key de OpenAI
NODE_ENV=production         # Solo para producción
```

## 🎯 Uso

1. **Selecciona un ejemplo** predefinido o crea uno personalizado
2. **Configura las instrucciones** del asistente
3. **Sube un documento** (opcional) para contexto adicional
4. **Inicia la llamada** y comienza a hablar
5. **El asistente responderá** en tiempo real usando tu voz

## 🌟 Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express 5, Multer
- **IA**: OpenAI Realtime API (GPT-4o)
- **Audio**: WebRTC, MediaDevices API
- **Despliegue**: Render.com

---

**Desarrollado con ❤️ usando OpenAI Realtime API**