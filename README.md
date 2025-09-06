# Proyecto de Tesis de Fútbol ⚽

Sistema de análisis deportivo para fútbol con análisis de datos GPS, métricas de jugadores y visualización de partidos.

## 🚀 Inicio Rápido

### Opción 1: DevContainer (Recomendado)
1. Abrir en VS Code con DevContainer
2. Los servicios se levantan automáticamente
3. Acceder a:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **Jupyter**: http://localhost:8888

### Opción 2: Desarrollo Local
```bash
# Levantar todos los servicios
./start-dev.sh

# Levantar servicios en background (recomendado para devcontainer)
./start-dev-simple.sh

# Verificar estado de servicios
./check-services.sh

# Detener todos los servicios
./stop-dev.sh
```

### Opción 3: Servicios Individuales

#### Backend (Rust)
```bash
cd rust
cargo run
# API disponible en http://localhost:8000
```

#### Frontend (Next.js)
```bash
cd new-front
npm install
npm run dev
# Frontend disponible en http://localhost:3000
```

#### Jupyter Notebooks
```bash
# Opción 1: Docker Compose
docker-compose up -d
docker logs tesis-prueba-jupyter-1 | grep http://127.0.0.1:8888/lab\?token\=

# Opción 2: Directo
docker run jupyter/datascience-notebook
```

## 📁 Estructura del Proyecto

- `rust/` - Backend API (Rust + Axum + PostgreSQL)
- `new-front/` - Frontend (Next.js + TypeScript + Tailwind)
- `notebooks/` - Análisis de datos (Jupyter + Python)
- `scripts/` - Scripts de utilidad

## 🔧 Configuración

### Variables de Entorno
- Backend: `rust/.container.env`
- Frontend: `new-front/.container.env`

### Puertos
- Frontend: 3000
- Backend API: 8000
- PostgreSQL: 5432
- Jupyter: 8888