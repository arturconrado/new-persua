/**
 * New Perssua - Main Process
 * Processo principal do Electron com configuração de overlay invisível
 */

const { app, BrowserWindow, desktopCapturer, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');

// Inicializa o store de configurações
const store = new Store({
  defaults: {
    openrouterApiKey: '',
    llmProvider: 'openrouter', // 'openrouter' (único provedor)
    model: 'google/gemini-2.5-flash',
    transcriptionModel: 'openai/whisper-1',
    language: 'pt-BR',
    opacity: 0.95,
    assistantMode: 'meeting',
    showTranscription: true,
    windowPosition: { x: null, y: null, width: 400, height: 600 }
  }
});

let mainWindow = null;
let isOverlayVisible = false;
let audioCaptureActive = true;

// Configurações da janela overlay invisível
function createWindow() {
  const savedPosition = store.get('windowPosition') || {};
  const displays = screen.getAllDisplays();
  const primaryDisplay = displays[0];
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Posição padrão: canto inferior direito
  const defaultX = screenWidth - 450;
  const defaultY = screenHeight - 650;

  mainWindow = new BrowserWindow({
    width: savedPosition.width || 400,
    height: savedPosition.height || 600,
    x: savedPosition.x !== null ? savedPosition.x : defaultX,
    y: savedPosition.y !== null ? savedPosition.y : defaultY,
    
    // Configurações CRÍTICAS para invisibilidade
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'panel',
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    
    // Nível da janela - 'screen-saver' é o mais alto
    level: 'screen-saver',
    
    // Web preferences
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true,
      enableRemoteModule: false
    },
    
    // Otimizações de performance
    backgroundColor: '#00000000',
    paintWhenInitiallyHidden: true,
    show: false // Não mostrar inicialmente
  });

  // CRÍTICO: Proteger conteúdo contra captura de tela
  mainWindow.setContentProtection(true);
  
  // Carregar a interface
  mainWindow.loadFile('index.html');
  
  // Abrir DevTools apenas em modo desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Quando a janela estiver pronta
  mainWindow.once('ready-to-show', () => {
    // Mostrar sem roubar foco (anti-detecção)
    mainWindow.showInactive();
    isOverlayVisible = true;
  });

  // Salvar posição ao mover/redimensionar
  let saveTimeout = null;
  mainWindow.on('moved', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const bounds = mainWindow.getBounds();
      store.set('windowPosition', bounds);
    }, 500);
  });

  mainWindow.on('resized', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const bounds = mainWindow.getBounds();
      store.set('windowPosition', bounds);
    }, 500);
  });

  // Prevenir fechamento acidental - apenas ocultar
  mainWindow.on('close', (e) => {
    e.preventDefault();
    hideOverlay();
  });

  // Limpeza ao fechar
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Funções de controle do overlay
function showOverlay() {
  if (mainWindow) {
    mainWindow.showInactive();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    isOverlayVisible = true;
    mainWindow.webContents.send('overlay-visibility-changed', true);
  }
}

function hideOverlay() {
  if (mainWindow) {
    mainWindow.hide();
    isOverlayVisible = false;
    mainWindow.webContents.send('overlay-visibility-changed', false);
  }
}

function toggleOverlay() {
  if (isOverlayVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// Registrar atalhos globais
function registerGlobalShortcuts() {
  // Ctrl/Cmd + B: Mostrar/Ocultar overlay
  globalShortcut.register('CommandOrControl+B', () => {
    toggleOverlay();
  });

  // Ctrl/Cmd + K: Focar no input manual
  globalShortcut.register('CommandOrControl+K', () => {
    if (mainWindow && isOverlayVisible) {
      mainWindow.webContents.send('focus-manual-input');
    }
  });

  // Ctrl/Cmd + Shift + S: Iniciar/Parar captura de áudio
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    toggleAudioCapture();
  });

  // Ctrl/Cmd + Shift + M: Alternar modo (Reunião/Estudo)
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWindow) {
      const nextMode = store.get('assistantMode') === 'study' ? 'meeting' : 'study';
      store.set('assistantMode', nextMode);
      mainWindow.webContents.send('mode-changed', nextMode);
    }
  });

  // Ctrl/Cmd + Shift + C: Copiar última resposta
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow) {
      mainWindow.webContents.send('copy-last-response');
    }
  });

  // Ctrl/Cmd + Q: Sair do aplicativo
  globalShortcut.register('CommandOrControl+Q', () => {
    quitApp();
  });

  console.log('Atalhos globais registrados');
}

// Controle de captura de áudio
function toggleAudioCapture() {
  audioCaptureActive = !audioCaptureActive;
  
  if (mainWindow) {
    mainWindow.webContents.send('audio-capture-toggled', audioCaptureActive);
  }
  
  console.log(`Captura de áudio: ${audioCaptureActive ? 'ATIVADA' : 'DESATIVADA'}`);
}

// Sair do aplicativo
function quitApp() {
  // Parar captura de áudio
  if (mainWindow) {
    mainWindow.webContents.send('stop-audio-capture');
  }
  
  // Unregister shortcuts
  globalShortcut.unregisterAll();
  
  // Fechar aplicativo
  app.quit();
}

// IPC Handlers
function setupIpcHandlers() {
  // Obter configurações
  ipcMain.handle('get-config', (event, key) => {
    return store.get(key);
  });

  // Salvar configuração
  ipcMain.handle('set-config', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // Obter todas as configurações
  ipcMain.handle('get-all-configs', () => {
    return store.store;
  });

  // Salvar múltiplas configurações
  ipcMain.handle('set-multiple-configs', (event, configs) => {
    for (const [key, value] of Object.entries(configs)) {
      store.set(key, value);
    }
    return true;
  });

  // Toggle overlay
  ipcMain.on('toggle-overlay', () => {
    toggleOverlay();
  });

  // Toggle audio capture
  ipcMain.on('toggle-audio-capture', () => {
    toggleAudioCapture();
  });

  ipcMain.on('audio-capture-state', (event, isActive) => {
    audioCaptureActive = Boolean(isActive);
  });

  // Retorna somente uma imagem reduzida da tela principal ao renderer.
  ipcMain.handle('capture-screen-frame', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 960, height: 540 },
      fetchWindowIcons: false
    });
    const primaryId = String(screen.getPrimaryDisplay().id);
    const source = sources.find(item => item.display_id === primaryId) || sources[0];

    if (!source || source.thumbnail.isEmpty()) {
      throw new Error('Nenhuma tela disponível para captura.');
    }

    return source.thumbnail.toJPEG(70).toString('base64');
  });

  // Audio data received from renderer
  ipcMain.on('audio-data', (event, data) => {
    // Encaminhar para módulo de transcrição (será implementado)
    // Por enquanto, apenas log
    // console.log('Audio data received:', data.length);
  });

  // Transcription result
  ipcMain.on('transcription-result', (event, text) => {
    console.log('Transcrição recebida:', text);
  });

  // LLM response
  ipcMain.on('llm-response', (event, response) => {
    console.log('Resposta LLM recebida:', response);
  });

  // Error reporting
  ipcMain.on('report-error', (event, error) => {
    console.error('Erro reportado pelo renderer:', error);
  });

  // Log message
  ipcMain.on('log-message', (event, level, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  });

  // Export history
  ipcMain.handle('export-history', (event, data) => {
    const { filePath, content } = data;
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Get platform info
  ipcMain.handle('get-platform-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    };
  });
}

// Lifecycle events
app.whenReady().then(() => {
  // Setup IPC handlers
  setupIpcHandlers();
  
  // Create window
  createWindow();
  
  // Register global shortcuts
  registerGlobalShortcuts();
  
  // Log startup info
  console.log('New Perssua iniciado');
  console.log('Platform:', process.platform);
  console.log('Arch:', process.arch);
  console.log('Electron version:', process.versions.electron);
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Se já existe uma instância, mostrar o overlay
    if (mainWindow) {
      showOverlay();
      mainWindow.focus();
    }
  });
}

// Quit when all windows are closed (exceto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    showOverlay();
  }
});

// Before quit cleanup
app.on('before-quit', () => {
  console.log('Fechando New Perssua...');
  globalShortcut.unregisterAll();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
