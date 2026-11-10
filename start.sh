#!/usr/bin/env bash
# Lanzador para Linux/Mac.
set -e
cd "$(dirname "$0")"

echo ""
echo "  ============================================"
echo "    LoRA Dataset Maker - Iniciando..."
echo "  ============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "  [X] Node.js no está instalado."
    echo "  Instálalo desde: https://nodejs.org"
    exit 1
fi

echo "  [OK] Node.js: $(node --version)"

if [ ! -d "node_modules" ]; then
    echo ""
    echo "  [i] Primera ejecución: instalando dependencias..."
    echo "  Necesitas internet. Tardará 2-5 minutos."
    echo ""
    npm install
    echo ""
    echo "  [OK] Dependencias instaladas."
fi

echo ""
echo "  [i] Iniciando servidor en http://localhost:3000"
echo "  Pulsa Ctrl+C para detener."
echo ""

# Abrir navegador tras 7 segundos (background)
(sleep 7 && (xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || true)) &

npx next dev -p 3000
