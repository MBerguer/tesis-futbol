#!/bin/bash

echo "🦀 Compilando backend con Docker..."

# Usar el Dockerfile de Rust para compilar
docker run --rm \
  -v /workspaces/tesis-futbol/rust:/workspace \
  -w /workspace \
  rust:latest \
  bash -c "
    echo 'Instalando dependencias...'
    cargo build --release
    
    echo 'Copiando binario...'
    cp target/release/rust-futbol /workspace/target/debug/rust-futbol
    chmod +x /workspace/target/debug/rust-futbol
    
    echo 'Compilación completada!'
  "

echo "✅ Backend compilado exitosamente"
