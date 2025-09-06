#!/bin/sh

# Script temporal para iniciar el backend manualmente
# Esto es necesario hasta que reconstruyamos el devcontainer

echo "🦀 Iniciando backend manualmente..."

# Verificar si cargo está disponible
if ! command -v cargo >/dev/null 2>&1; then
    echo "❌ Cargo no está disponible en este contenedor"
    echo "💡 Necesitas reconstruir el devcontainer para que funcione correctamente"
    echo ""
    echo "Pasos para solucionarlo:"
    echo "1. Ctrl+Shift+P → 'Dev Containers: Rebuild Container'"
    echo "2. O desde Docker Desktop: Detener y eliminar contenedores, luego reconstruir"
    echo ""
    echo "Mientras tanto, puedes usar el desarrollo local:"
    echo "  ./start-dev.sh"
    exit 1
fi

# Iniciar backend
cd rust
echo "🔨 Compilando backend..."
cargo build

echo "🚀 Iniciando backend en puerto 8000..."
cargo run

