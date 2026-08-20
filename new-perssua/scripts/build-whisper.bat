@echo off
REM New Perssua - Script de Build do Whisper.cpp (Windows)
REM Este script baixa e compila o Whisper.cpp para transcrição local

echo.
echo ======================================
echo   New Perssua - Build do Whisper.cpp
echo ======================================
echo.

set WHISPER_DIR=whisper.cpp
set BUILD_DIR=build

REM Verificar se git está instalado
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Git não encontrado. Instale Git para Windows primeiro.
    echo Baixe em: https://git-scm.com/download/win
    exit /b 1
)

REM Criar diretório de build
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

REM Clonar repositório do Whisper.cpp se não existir
if not exist "%WHISPER_DIR%" (
    echo [INFO] Clonando whisper.cpp...
    git clone https://github.com/ggerganov/whisper.cpp.git
) else (
    echo [INFO] Atualizando whisper.cpp...
    cd "%WHISPER_DIR%"
    git pull
    cd ..
)

REM Compilar Whisper.cpp
cd "%WHISPER_DIR%"
echo [INFO] Compilando Whisper.cpp...

REM Verificar se MSVC está disponível
where cl >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Usando MSVC para compilação...
    call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" 2>nul || ^
    call "C:\Program Files (x86)\Microsoft Visual Studio\2017\BuildTools\VC\Auxiliary\Build\vcvars64.bat" 2>nul || ^
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" 2>nul
    nmake /f Makefile.vc clean
    nmake /f Makefile.vc
) else (
    echo [INFO] Tentando compilação com MinGW...
    make clean
    make -j
)

REM Copiar binário para a pasta do projeto
echo [INFO] Copiando binários...
if exist "bin\Release\main.exe" (
    copy "bin\Release\main.exe" "..\..\src\transcription\bin\whisper-main.exe"
) else if exist "main.exe" (
    copy "main.exe" "..\..\src\transcription\bin\whisper-main.exe"
)

REM Baixar modelo small (Python necessário)
echo [INFO] Para baixar modelos, execute manualmente:
echo   python models\download-ggml-model.py small
echo.
echo Ou baixe diretamente de:
echo   https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
echo.

cd ..\..

echo.
echo [SUCESSO] Build concluído!
echo.
echo Uso:
echo   src\transcription\bin\whisper-main.exe -m src\transcription\models\ggml-small.bin audio.wav
echo.
echo Modelos disponíveis:
echo   - tiny    (mais rápido, menos preciso)
echo   - base
echo   - small   (recomendado)
echo   - medium
echo   - large   (mais lento, mais preciso)
echo.

pause
