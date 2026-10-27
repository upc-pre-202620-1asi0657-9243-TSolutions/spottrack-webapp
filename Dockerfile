# ---------- Etapa 1: build de Angular ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Etapa 2: servir con Nginx ----------
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/SpotTrack-Frontend-Web-Applications/browser /usr/share/nginx/html
ENV BACKEND_URL=http://localhost:8080
EXPOSE 8080