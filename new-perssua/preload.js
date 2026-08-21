/**
 * New Perssua - Preload Script
 * Bridge seguro entre o processo main e renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// API exposta ao renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configurações
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  getAllConfigs: () => ipcRenderer.invoke('get-all-configs'),
  setMultipleConfigs: (configs) => ipcRenderer.invoke('set-multiple-configs', configs),
  
  // Controle do overlay
  toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
  onOverlayVisibilityChanged: (callback) => {
    ipcRenderer.on('overlay-visibility-changed', (event, isVisible) => callback(isVisible));
  },
  
  // Captura de áudio
  toggleAudioCapture: () => ipcRenderer.send('toggle-audio-capture'),
  setAudioCaptureActive: (isActive) => ipcRenderer.send('audio-capture-state', isActive),
  onAudioCaptureToggled: (callback) => {
    ipcRenderer.on('audio-capture-toggled', (event, isActive) => callback(isActive));
  },
  onStopAudioCapture: (callback) => {
    ipcRenderer.on('stop-audio-capture', () => callback());
  },

  // Contexto visual (imagem JPEG em base64 da tela principal)
  captureScreenFrame: () => ipcRenderer.invoke('capture-screen-frame'),
  openScreenPrivacySettings: () => ipcRenderer.invoke('open-screen-privacy-settings'),
  
  // Input manual
  onFocusManualInput: (callback) => {
    ipcRenderer.on('focus-manual-input', () => callback());
  },
  
  // Modo
  onModeChanged: (callback) => {
    ipcRenderer.on('mode-changed', (event, mode) => callback(mode));
  },
  
  // Copiar resposta
  onCopyLastResponse: (callback) => {
    ipcRenderer.on('copy-last-response', () => callback());
  },
  
  // Comunicação de dados
  sendAudioData: (data) => ipcRenderer.send('audio-data', data),
  sendTranscriptionResult: (text) => ipcRenderer.send('transcription-result', text),
  sendLlmResponse: (response) => ipcRenderer.send('llm-response', response),
  
  // Logs e erros
  reportError: (error) => ipcRenderer.send('report-error', error),
  logMessage: (level, message) => ipcRenderer.send('log-message', level, message),
  
  // Exportar histórico
  exportHistory: (filePath, content) => ipcRenderer.invoke('export-history', { filePath, content }),
  
  // Info do app
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  
  // Platform info shortcuts
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});

// Logger helper
contextBridge.exposeInMainWorld('logger', {
  info: (message) => ipcRenderer.send('log-message', 'info', message),
  warn: (message) => ipcRenderer.send('log-message', 'warn', message),
  error: (message) => ipcRenderer.send('log-message', 'error', message),
  debug: (message) => ipcRenderer.send('log-message', 'debug', message)
});
