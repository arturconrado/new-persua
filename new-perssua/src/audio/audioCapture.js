/**
 * New Perssua - Audio Capture Module
 * Captura de áudio do sistema ou microfone
 */

const { EventEmitter } = require('events');

class AudioCapture extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      sampleRate: options.sampleRate || 16000,
      channels: options.channels || 1,
      chunkDuration: options.chunkDuration || 5000, // 5 segundos
      audioSource: options.audioSource || 'system', // 'system' | 'microphone'
      platform: options.platform || process.platform
    };
    
    this.isCapturing = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.audioDataBuffer = [];
    this.lastChunkTime = Date.now();
    
    // Platform-specific modules (loaded dynamically)
    this.systemAudioModule = null;
  }

  /**
   * Iniciar captura de áudio
   */
  async start() {
    if (this.isCapturing) {
      console.warn('Captura de áudio já está ativa');
      return false;
    }

    try {
      console.log(`Iniciando captura de áudio (${this.options.audioSource})`);
      
      if (this.options.audioSource === 'system') {
        await this._startSystemAudioCapture();
      } else {
        await this._startMicrophoneCapture();
      }
      
      this.isCapturing = true;
      this.lastChunkTime = Date.now();
      this.emit('started');
      
      return true;
    } catch (error) {
      console.error('Erro ao iniciar captura de áudio:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Parar captura de áudio
   */
  async stop() {
    if (!this.isCapturing) {
      return;
    }

    try {
      console.log('Parando captura de áudio');
      
      // Parar stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      // Fechar contexto de áudio
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      // Limpar buffer
      this.audioDataBuffer = [];
      this.isCapturing = false;
      
      this.emit('stopped');
    } catch (error) {
      console.error('Erro ao parar captura de áudio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Iniciar captura do sistema (Windows/macOS)
   */
  async _startSystemAudioCapture() {
    const platform = this.options.platform;
    
    if (platform === 'win32') {
      await this._captureWindowsSystemAudio();
    } else if (platform === 'darwin') {
      await this._captureMacSystemAudio();
    } else {
      // Linux ou fallback para microfone
      console.warn('Captura de áudio do sistema não suportada neste OS. Usando microfone.');
      await this._startMicrophoneCapture();
    }
  }

  /**
   * Captura de áudio do sistema no Windows
   * Requer: windows-audio-capture ou similar
   */
  async _captureWindowsSystemAudio() {
    try {
      // Tentar carregar módulo nativo para Windows
      // Nota: Em produção, use windows-audio-capture ou node-wasapi
      console.log('Tentando captura de áudio do sistema Windows...');
      
      // Fallback: Usar Web Audio API com seleção de dispositivo
      await this._setupWebAudioCapture(true);
    } catch (error) {
      console.warn('Falha na captura do sistema Windows, tentando microfone:', error.message);
      await this._startMicrophoneCapture();
    }
  }

  /**
   * Captura de áudio do sistema no macOS
   * Requer: BlackHole instalado
   */
  async _captureMacSystemAudio() {
    try {
      console.log('Tentando captura de áudio do sistema macOS...');
      
      // Verificar se BlackHole está disponível
      // Em produção, use node-mac-permissions para verificar permissões
      
      // Configurar entrada de áudio para usar BlackHole
      await this._setupWebAudioCapture(true);
    } catch (error) {
      console.warn('Falha na captura do sistema macOS, tentando microfone:', error.message);
      await this._startMicrophoneCapture();
    }
  }

  /**
   * Captura via microfone
   */
  async _startMicrophoneCapture() {
    try {
      await this._setupWebAudioCapture(false);
    } catch (error) {
      throw new Error('Não foi possível acessar o microfone: ' + error.message);
    }
  }

  /**
   * Configurar Web Audio API para captura
   */
  async _setupWebAudioCapture(isSystemAudio) {
    // Criar contexto de áudio
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.options.sampleRate
    });

    // Obter stream de áudio
    const constraints = {
      audio: {
        sampleRate: this.options.sampleRate,
        channelCount: this.options.channels,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };

    // Se for áudio do sistema, tentar selecionar dispositivo específico
    if (isSystemAudio) {
      // Em produção, liste dispositivos e selecione o apropriado
      // constraints.deviceId = { exact: 'device-id-aqui' };
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Conectar stream ao contexto
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Criar script processor para processar áudio em chunks
    const bufferSize = 4096;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    
    // Processar dados de áudio
    this.scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      this._processAudioChunk(inputData);
    };

    console.log('Captura de áudio configurada com sucesso');
  }

  /**
   * Processar chunk de áudio
   */
  _processAudioChunk(audioData) {
    // Converter Float32Array para Int16Array (formato esperado pelo Whisper)
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Adicionar ao buffer
    this.audioDataBuffer.push(int16Data);

    // Verificar se é hora de enviar um chunk (a cada 5 segundos)
    const now = Date.now();
    if (now - this.lastChunkTime >= this.options.chunkDuration) {
      this._sendAudioChunk();
      this.lastChunkTime = now;
    }

    // Emitir dados para visualização do waveform
    this.emit('audio-data', audioData);
  }

  /**
   * Enviar chunk de áudio para transcrição
   */
  _sendAudioChunk() {
    if (this.audioDataBuffer.length === 0) {
      return;
    }

    // Concatenar todos os buffers
    const totalLength = this.audioDataBuffer.reduce((acc, buf) => acc + buf.length, 0);
    const combinedBuffer = new Int16Array(totalLength);
    
    let offset = 0;
    for (const buffer of this.audioDataBuffer) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Limpar buffer
    this.audioDataBuffer = [];

    // Emitir chunk para transcrição
    this.emit('chunk', {
      audioData: combinedBuffer,
      sampleRate: this.options.sampleRate,
      channels: this.options.channels,
      timestamp: Date.now()
    });
  }

  /**
   * Obter nível de áudio atual (para visualização)
   */
  getAudioLevel() {
    if (!this.audioDataBuffer.length) {
      return 0;
    }

    const lastBuffer = this.audioDataBuffer[this.audioDataBuffer.length - 1];
    let sum = 0;
    for (let i = 0; i < Math.min(100, lastBuffer.length); i++) {
      sum += Math.abs(lastBuffer[i]);
    }
    return sum / Math.min(100, lastBuffer.length);
  }

  /**
   * Obter status da captura
   */
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      audioSource: this.options.audioSource,
      sampleRate: this.options.sampleRate,
      bufferLength: this.audioDataBuffer.length,
      platform: this.options.platform
    };
  }
}

// Exportar para uso no renderer
if (typeof window !== 'undefined') {
  window.AudioCapture = AudioCapture;
}

module.exports = AudioCapture;
