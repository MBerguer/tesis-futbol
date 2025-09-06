#!/bin/bash

# Script de inicio para servicios en devcontainer

echo "🚀 Iniciando proyecto de tesis de fútbol..."

# Verificar dependencias del frontend
if [ ! -d "new-front/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    cd new-front && npm install
    cd ..
fi

# Verificar compilación del backend
if [ ! -d "rust/target" ]; then
    echo "🔨 Compilando backend..."
    cd rust && cargo build
    cd ..
fi

# Iniciar backend en background
echo "🦀 Iniciando backend (Rust) en puerto 8000..."
cd rust
nohup cargo run > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Esperar un poco para que el backend inicie
sleep 3

# Iniciar frontend en background
echo "⚛️ Iniciando frontend (Next.js) en puerto 3000..."
cd new-front
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
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
echo "PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID"
echo "Para detener: kill $BACKEND_PID $FRONTEND_PID"





