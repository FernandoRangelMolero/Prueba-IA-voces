# Dockerfile opcional para Render
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3001

# Variables de entorno
ENV NODE_ENV=production

# Comando de inicio
CMD ["npm", "start"]
