@echo off
chcp 65001 >nul 2>&1
title LoRA Dataset Maker
cd /d "%~dp0"

echo.
echo  ============================================
echo    LoRA Dataset Maker - Iniciando...
echo  ============================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js no esta instalado.
    echo.
    echo  Para ejecutar esta app necesitas Node.js 18 o superior.
    echo  Descargalo gratis desde: https://nodejs.org
    echo.
    echo  Despues de instalarlo, vuelve a hacer doble clic aqui.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo  [OK] Node.js detectado: %NODE_VERSION%
echo.

REM Verificar si las dependencias estan instaladas
if not exist "node_modules" (
    echo  [i] Primera ejecucion detectada.
    echo  Necesitas internet para instalar las dependencias.
    echo  Esto solo se hace una vez. Tardara 2-5 minutos.
    echo.
    echo  Instalando dependencias...
    echo  --------------------------------------------
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [X] Error al instalar dependencias.
        echo  Verifica tu conexion a internet e intenta de nuevo.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencias instaladas correctamente.
    echo.
)

echo  [i] Iniciando servidor...
echo  URL: http://localhost:3000
echo  El navegador se abrira automaticamente en unos segundos.
echo.
echo  ============================================
echo  Para detener la app: cierra esta ventana.
echo  ============================================
echo.

REM Abrir navegador tras 7 segundos (en segundo plano)
start "" /min cmd /c "timeout /t 7 /nobreak >nul & start http://localhost:3000"

REM Iniciar servidor de desarrollo (bloquea en primer plano)
call npx next dev -p 3000
