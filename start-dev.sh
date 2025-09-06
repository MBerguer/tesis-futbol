#!/bin/bash

# Script de inicio para desarrollo local
# Levanta backend (Rust) y frontend (Next.js) simultáneamente

echo "🚀 Iniciando proyecto de tesis de fútbol..."

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Capturar Ctrl+C para limpiar procesos
trap cleanup SIGINT

# Verificar que estamos en el directorio correcto
if [ ! -f "rust/Cargo.toml" ] || [ ! -f "new-front/package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar dependencias
echo "📦 Verificando dependencias..."

# Backend dependencies
if [ ! -d "rust/target" ]; then
    echo "🔨 Compilando backend por primera vez..."
    cd rust && cargo build
    cd ..
fi

# Frontend dependencies
if [ ! -d "new-front/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    cd new-front && npm install
    cd ..
fi

# Verificar que PostgreSQL esté corriendo
echo "🗄️ Verificando base de datos..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "⚠️ PostgreSQL no está corriendo. Iniciando con Docker..."
    docker-compose up -d db-futbol
    sleep 5
fi

# Iniciar backend
echo "🦀 Iniciando backend (Rust) en puerto 8000..."
cd rust
cargo run &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo "⏳ Esperando que el backend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8000 >/dev/null 2>&1; then
        echo "✅ Backend listo!"
        break
    fi
    sleep 1
done

# Iniciar frontend
echo "⚛️ Iniciando frontend (Next.js) en puerto 3000..."
cd new-front
npm run dev &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend esté listo
echo "⏳ Esperando que el frontend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend listo!"
        break
    fi
    sleep 1
done

echo ""
echo "🎉 ¡Servicios iniciados correctamente!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Jupyter: http://localhost:8888 (si está corriendo)"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Mantener el script corriendo
wait
