#!/bin/bash

# Script simple de inicio para devcontainer
# Levanta backend (Rust) y frontend (Next.js) en background

echo "🚀 Iniciando proyecto de tesis de fútbol..."

# Verificar que estamos en el directorio correcto
if [ ! -f "rust/Cargo.toml" ] || [ ! -f "new-front/package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar dependencias del frontend
if [ ! -d "new-front/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    cd new-front && npm install
    cd ..
fi

# Iniciar backend en background
echo "🦀 Iniciando backend (Rust) en puerto 8000..."
cd rust
nohup cargo run > ../backend.log 2>&1 &
cd ..

# Iniciar frontend en background
echo "⚛️ Iniciando frontend (Next.js) en puerto 3000..."
cd new-front
nohup npm run dev > ../frontend.log 2>&1 &
cd ..

echo ""
echo "🎉 ¡Servicios iniciados en background!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Jupyter: http://localhost:8888"
echo ""
echo "Logs disponibles en:"
echo "  - Backend: ./backend.log"
echo "  - Frontend: ./frontend.log"
echo ""
echo "Para detener: ./stop-dev.sh"






