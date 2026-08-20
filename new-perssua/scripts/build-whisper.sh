#!/bin/bash
# New Perssua - Script de Build do Whisper.cpp (macOS/Linux)
# Este script baixa e compila o Whisper.cpp para transcrição local

set -e

echo "🔨 New Perssua - Build do Whisper.cpp"
echo "======================================"

WHISPER_DIR="whisper.cpp"
BUILD_DIR="build"

# Verificar se git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git não encontrado. Instale git primeiro."
    exit 1
fi

# Verificar se make/gcc estão instalados
if ! command -v make &> /dev/null; then
    echo "❌ Make não encontrado. Instale Xcode Command Line Tools (macOS) ou build-essential (Linux)."
    exit 1
fi

# Criar diretório de build
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Clonar repositório do Whisper.cpp se não existir
if [ ! -d "$WHISPER_DIR" ]; then
    echo "📦 Clonando whisper.cpp..."
    git clone https://github.com/ggerganov/whisper.cpp.git
else
    echo "📦 Atualizando whisper.cpp..."
    cd "$WHISPER_DIR"
    git pull
    cd ..
fi

# Compilar Whisper.cpp
cd "$WHISPER_DIR"
echo "🔧 Compilando Whisper.cpp..."
make clean
make -j

# Baixar modelo small (opcional, pode ser alterado)
echo "📥 Baixando modelo small (pode demorar)..."
./models/download-model-small.sh

# Copiar binário para a pasta do projeto
echo "📁 Copiando binários..."
cp main ../../src/transcription/bin/whisper-main
cp models/ggml-small.bin ../../src/transcription/models/ggml-small.bin 2>/dev/null || true

echo ""
echo "✅ Build concluído com sucesso!"
echo ""
echo "Uso:"
echo "  ./src/transcription/bin/whisper-main -m src/transcription/models/ggml-small.bin audio.wav"
echo ""
echo "Modelos disponíveis:"
echo "  - tiny (mais rápido, menos preciso)"
echo "  - base"
echo "  - small (recomendado)"
echo "  - medium"
echo "  - large (mais lento, mais preciso)"
echo ""
