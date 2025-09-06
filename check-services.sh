#!/bin/bash

# Script para verificar el estado de los servicios

echo "🔍 Verificando estado de los servicios..."

# Verificar backend
if curl -s http://localhost:8000 >/dev/null 2>&1; then
    echo "✅ Backend (Rust) - Puerto 8000: FUNCIONANDO"
else
    echo "❌ Backend (Rust) - Puerto 8000: NO FUNCIONANDO"
fi

# Verificar frontend
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend (Next.js) - Puerto 3000: FUNCIONANDO"
else
    echo "❌ Frontend (Next.js) - Puerto 3000: NO FUNCIONANDO"
fi

# Verificar base de datos
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL - Puerto 5432: FUNCIONANDO"
else
    echo "❌ PostgreSQL - Puerto 5432: NO FUNCIONANDO"
fi

# Verificar Jupyter
if curl -s http://localhost:8888 >/dev/null 2>&1; then
    echo "✅ Jupyter - Puerto 8888: FUNCIONANDO"
else
    echo "❌ Jupyter - Puerto 8888: NO FUNCIONANDO"
fi

echo ""
echo "📊 Resumen:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:8000"
echo "  - Jupyter: http://localhost:8888"
echo "  - PostgreSQL: localhost:5432"






