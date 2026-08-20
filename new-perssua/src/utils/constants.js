/**
 * New Perssua - Constantes Globais
 */

// ============================================
// APLICAÇÃO
// ============================================

const APP_NAME = 'New Perssua';
const APP_VERSION = '1.0.0';
const APP_DESCRIPTION = 'Assistente de Reunião Invisível';

// ============================================
// JANELA OVERLAY
// ============================================

const WINDOW_DEFAULTS = {
  width: 400,
  height: 600,
  minWidth: 300,
  minHeight: 400,
  maxWidth: 800,
  maxHeight: 900,
  opacity: 0.95,
  cornerOffset: 20 // Distância do canto em pixels
};

const WINDOW_LEVELS = {
  FLOATING: 'floating',
  TORN_OFF_MENU: 'torn-off-menu',
  MODAL_PANEL: 'modal-panel',
  MAIN_MENU: 'main-menu',
  STATUS: 'status',
  POP_UP_MENU: 'pop-up-menu',
  SCREEN_SAVER: 'screen-saver' // Mais alto nível
};

// ============================================
// ÁUDIO
// ============================================

const AUDIO_DEFAULTS = {
  sampleRate: 16000, // Whisper requer 16kHz
  channels: 1, // Mono
  bitDepth: 16,
  chunkDurationMs: 5000, // Enviar chunk a cada 5 segundos
  minChunkDurationMs: 1000,
  maxChunkDurationMs: 30000
};

const AUDIO_SOURCES = {
  SYSTEM: 'system',
  MICROPHONE: 'microphone'
};

// ============================================
// TRANSCRIÇÃO
// ============================================

const TRANSCRIPTION_MODES = {
  API: 'api', // OpenAI Whisper API
  LOCAL: 'local' // Whisper.cpp local
};

const LANGUAGE_CODES = {
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'en-US': 'en',
  'en-GB': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'ja-JP': 'ja',
  'zh-CN': 'zh',
  'ko-KR': 'ko',
  'ru-RU': 'ru'
};

// ============================================
// LLM
// ============================================

const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OLLAMA: 'ollama'
};

const OPENAI_MODELS = {
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4O: 'gpt-4o',
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
};

const ANTHROPIC_MODELS = {
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307'
};

const LLM_DEFAULTS = {
  maxTokens: 500,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
};

// ============================================
// CONTEXTO
// ============================================

const CONTEXT_DEFAULTS = {
  maxTokens: 500, // Limite de tokens no buffer
  maxHistoryMinutes: 3, // Histórico máximo em minutos
  pruneIntervalMs: 60000 // Verificar limpeza a cada minuto
};

// ============================================
// ATALHOS DE TECLADO
// ============================================

const DEFAULT_SHORTCUTS = {
  TOGGLE_OVERLAY: 'CommandOrControl+B',
  FOCUS_INPUT: 'CommandOrControl+K',
  TOGGLE_AUDIO: 'CommandOrControl+Shift+S',
  TOGGLE_MODE: 'CommandOrControl+Shift+M',
  COPY_RESPONSE: 'CommandOrControl+Shift+C',
  HIDE: 'CommandOrControl+H',
  EXPORT_HISTORY: 'CommandOrControl+Shift+E',
  QUIT: 'CommandOrControl+Q'
};

// ============================================
// ARQUIVOS E DIRETÓRIOS
// ============================================

const PATHS = {
  CONFIG: 'config/',
  LOGS: 'logs/',
  EXPORTS: 'exports/',
  MODELS: 'src/transcription/models/',
  BINARIES: 'src/transcription/bin/'
};

const FILE_EXTENSIONS = {
  HISTORY_MARKDOWN: '.md',
  HISTORY_JSON: '.json',
  HISTORY_TEXT: '.txt',
  AUDIO_WAV: '.wav',
  AUDIO_MP3: '.mp3'
};

// ============================================
// PERFORMANCE
// ============================================

const PERFORMANCE_LIMITS = {
  maxMemoryMB: 300,
  maxCPUPercent: 10,
  gcIntervalMs: 300000 // 5 minutos
};

// ============================================
// API ENDPOINTS
// ============================================

const API_ENDPOINTS = {
  OPENAI_BASE: 'https://api.openai.com/v1',
  OPENAI_WHISPER: '/audio/transcriptions',
  OPENAI_CHAT: '/chat/completions',
  ANTHROPIC_BASE: 'https://api.anthropic.com/v1',
  ANTHROPIC_MESSAGES: '/messages',
  OLLAMA_DEFAULT: 'http://localhost:11434'
};

// ============================================
// ERROS
// ============================================

const ERROR_CODES = {
  API_KEY_MISSING: 'ERR_API_KEY_MISSING',
  API_REQUEST_FAILED: 'ERR_API_REQUEST_FAILED',
  AUDIO_CAPTURE_FAILED: 'ERR_AUDIO_CAPTURE_FAILED',
  TRANSCRIPTION_FAILED: 'ERR_TRANSCRIPTION_FAILED',
  LLM_GENERATION_FAILED: 'ERR_LLM_GENERATION_FAILED',
  FILE_WRITE_FAILED: 'ERR_FILE_WRITE_FAILED',
  INVALID_CONFIG: 'ERR_INVALID_CONFIG'
};

const ERROR_MESSAGES = {
  [ERROR_CODES.API_KEY_MISSING]: 'Chave de API não configurada',
  [ERROR_CODES.API_REQUEST_FAILED]: 'Falha na requisição à API',
  [ERROR_CODES.AUDIO_CAPTURE_FAILED]: 'Não foi possível capturar áudio',
  [ERROR_CODES.TRANSCRIPTION_FAILED]: 'Falha na transcrição',
  [ERROR_CODES.LLM_GENERATION_FAILED]: 'Falha ao gerar resposta',
  [ERROR_CODES.FILE_WRITE_FAILED]: 'Falha ao escrever arquivo',
  [ERROR_CODES.INVALID_CONFIG]: 'Configuração inválida'
};

// ============================================
// ESTADOS
// ============================================

const STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  TRANSCRIBING: 'transcribing',
  GENERATING: 'generating',
  ERROR: 'error'
};

// ============================================
// EVENTOS IPC
// ============================================

const IPC_EVENTS = {
  // Main -> Renderer
  OVERLAY_VISIBILITY_CHANGED: 'overlay-visibility-changed',
  AUDIO_CAPTURE_TOGGLED: 'audio-capture-toggled',
  STOP_AUDIO_CAPTURE: 'stop-audio-capture',
  FOCUS_MANUAL_INPUT: 'focus-manual-input',
  MODE_CHANGED: 'mode-changed',
  COPY_LAST_RESPONSE: 'copy-last-response',
  
  // Renderer -> Main
  TOGGLE_OVERLAY: 'toggle-overlay',
  TOGGLE_AUDIO_CAPTURE: 'toggle-audio-capture',
  AUDIO_DATA: 'audio-data',
  TRANSCRIPTION_RESULT: 'transcription-result',
  LLM_RESPONSE: 'llm-response',
  REPORT_ERROR: 'report-error',
  LOG_MESSAGE: 'log-message',
  
  // Config
  GET_CONFIG: 'get-config',
  SET_CONFIG: 'set-config',
  GET_ALL_CONFIGS: 'get-all-configs',
  SET_MULTIPLE_CONFIGS: 'set-multiple-configs',
  
  // Export
  EXPORT_HISTORY: 'export-history',
  
  // Info
  GET_APP_VERSION: 'get-app-version',
  GET_PLATFORM_INFO: 'get-platform-info'
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  WINDOW_DEFAULTS,
  WINDOW_LEVELS,
  AUDIO_DEFAULTS,
  AUDIO_SOURCES,
  TRANSCRIPTION_MODES,
  LANGUAGE_CODES,
  LLM_PROVIDERS,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  LLM_DEFAULTS,
  CONTEXT_DEFAULTS,
  DEFAULT_SHORTCUTS,
  PATHS,
  FILE_EXTENSIONS,
  PERFORMANCE_LIMITS,
  API_ENDPOINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  STATES,
  IPC_EVENTS
};
