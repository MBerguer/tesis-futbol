#!/bin/bash

echo "🔍 Verificación rápida de servicios..."

# Verificar si estamos en el contenedor correcto
if [ -f "/workspaces/tesis-futbol/rust/Cargo.toml" ]; then
    echo "✅ Estamos en el contenedor correcto"
else
    echo "❌ No estamos en el contenedor correcto"
    exit 1
fi

# Verificar backend
echo "🦀 Verificando backend..."
if pgrep -f "cargo run" > /dev/null; then
    echo "✅ Backend Rust está ejecutándose"
else
    echo "❌ Backend Rust NO está ejecutándose"
    echo "💡 Iniciando backend..."
    cd rust && nohup cargo run > ../backend.log 2>&1 &
    sleep 3
fi

# Verificar frontend
echo "⚛️ Verificando frontend..."
if pgrep -f "npm run dev" > /dev/null; then
    echo "✅ Frontend Next.js está ejecutándose"
else
    echo "❌ Frontend Next.js NO está ejecutándose"
    echo "💡 Iniciando frontend..."
    cd new-front && nohup npm run dev > ../frontend.log 2>&1 &
    sleep 3
fi

echo ""
echo "📊 Estado final:"
echo "  - Backend: $(pgrep -f 'cargo run' > /dev/null && echo '✅ Ejecutándose' || echo '❌ No ejecutándose')"
echo "  - Frontend: $(pgrep -f 'npm run dev' > /dev/null && echo '✅ Ejecutándose' || echo '❌ No ejecutándose')"
echo ""
echo "🌐 URLs:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:8000"
echo "  - Jupyter: http://localhost:8888"


