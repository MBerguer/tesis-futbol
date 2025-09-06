#!/bin/bash

# Script para detener todos los servicios de desarrollo

echo "🛑 Deteniendo servicios de desarrollo..."

# Detener procesos de Node.js (frontend)
echo "⚛️ Deteniendo frontend..."
pkill -f "next dev" 2>/dev/null || true

# Detener procesos de Rust (backend)
echo "🦀 Deteniendo backend..."
pkill -f "cargo run" 2>/dev/null || true

# Detener contenedores de Docker
echo "🐳 Deteniendo contenedores Docker..."
docker-compose down 2>/dev/null || true

echo "✅ Todos los servicios han sido detenidos"
