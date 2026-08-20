/**
 * New Perssua - Whisper API Integration
 * Transcrição de áudio usando OpenAI Whisper API
 * Nota: Para usar com OpenRouter, configure OPENAI_API_KEY no .env
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');

class WhisperAPI {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.model = options.model || 'whisper-1';
    this.language = options.language || 'pt-BR';
    this.endpoint = `${this.baseUrl}/audio/transcriptions`;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key não configurada. Whisper API não funcionará.');
    }
  }

  /**
   * Transcrever chunk de áudio
   * @param {Int16Array} audioData - Dados de áudio em formato PCM 16-bit
   * @param {Object} options - Opções adicionais
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribe(audioData, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    try {
      // Converter Int16Array para WAV
      const wavBuffer = this._int16ToWav(audioData, options.sampleRate || 16000);
      
      // Criar form data
      const formData = new FormData();
      formData.append('file', wavBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', this.model);
      formData.append('language', this._getLanguageCode(options.language || this.language));
      formData.append('response_format', 'text');
      formData.append('temperature', '0');

      // Fazer requisição à API usando node-fetch
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData,
        timeout: 30000
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const text = await response.text();
      return text.trim();
    } catch (error) {
      console.error('Erro na transcrição Whisper API:', error.message);
      throw new Error(`Falha na transcrição: ${error.message}`);
    }
  }

  /**
   * Transcrição com detecção de idioma automática
   */
  async transcribeAutoLanguage(audioData, options = {}) {
    return this.transcribe(audioData, { ...options, language: 'auto' });
  }

  /**
   * Transcrever múltiplos chunks com contexto
   * @param {Array<Int16Array>} chunks - Array de chunks de áudio
   * @param {string} previousTranscript - Transcrição anterior para contexto
   * @returns {Promise<string>} - Texto transcrito combinado
   */
  async transcribeWithContext(chunks, previousTranscript = '') {
    const results = [];
    
    for (const chunk of chunks) {
      try {
        const transcript = await this.transcribe(chunk);
        results.push(transcript);
      } catch (error) {
        console.warn('Falha ao transcrever chunk:', error.message);
        results.push('[Erro na transcrição]');
      }
    }

    // Combinar resultados e remover duplicatas
    const combinedText = results.join(' ').trim();
    
    // Se tiver transcrição anterior, verificar sobreposição
    if (previousTranscript && combinedText) {
      return this._mergeTranscripts(previousTranscript, combinedText);
    }

    return combinedText;
  }

  /**
   * Converter Int16Array para buffer WAV
   */
  _int16ToWav(int16Data, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = int16Data.length * (bitsPerSample / 8);
    const bufferSize = 44 + dataSize;

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset);
    offset += 4;
    buffer.writeUInt32LE(bufferSize - 8, offset);
    offset += 4;
    buffer.write('WAVE', offset);
    offset += 4;

    // fmt sub-chunk
    buffer.write('fmt ', offset);
    offset += 4;
    buffer.writeUInt32LE(16, offset); // Subchunk1Size
    offset += 4;
    buffer.writeUInt16LE(1, offset); // AudioFormat (PCM)
    offset += 2;
    buffer.writeUInt16LE(numChannels, offset);
    offset += 2;
    buffer.writeUInt32LE(sampleRate, offset);
    offset += 2;
    buffer.writeUInt32LE(byteRate, offset);
    offset += 2;
    buffer.writeUInt16LE(blockAlign, offset);
    offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset);
    offset += 2;

    // data sub-chunk
    buffer.write('data', offset);
    offset += 4;
    buffer.writeUInt32LE(dataSize, offset);
    offset += 4;

    // Escrever dados de áudio
    for (let i = 0; i < int16Data.length; i++) {
      buffer.writeInt16LE(int16Data[i], offset);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Obter código de idioma no formato correto
   */
  _getLanguageCode(language) {
    const languageMap = {
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
      'ru-RU': 'ru',
      'auto': null // Whisper detecta automaticamente
    };

    return languageMap[language] || language.split('-')[0] || null;
  }

  /**
   * Mesclar transcrições removendo sobreposições
   */
  _mergeTranscripts(previous, current) {
    // Estratégia simples: se o início do current estiver contido no final do previous,
    // remover a sobreposição
    
    const overlapLength = Math.min(50, previous.length, current.length);
    const previousEnd = previous.slice(-overlapLength).toLowerCase().trim();
    const currentStart = current.slice(0, overlapLength).toLowerCase().trim();

    // Procurar sobreposição
    const overlapIndex = previousEnd.indexOf(currentStart);
    
    if (overlapIndex !== -1 && overlapIndex > 0) {
      // Há sobreposição, remover do current
      const cutPoint = previous.length - overlapIndex;
      return previous + ' ' + current.slice(overlapLength);
    }

    // Sem sobreposição clara, apenas concatenar
    return previous + ' ' + current;
  }

  /**
   * Verificar saúde da API
   */
  async healthCheck() {
    try {
      // Testar com um pequeno payload
      const testAudio = new Int16Array(16000); // 1 segundo de silêncio
      await this.transcribe(testAudio, { timeout: 5000 });
      return { status: 'ok', message: 'API funcionando' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        code: error.response?.status 
      };
    }
  }

  /**
   * Obter custo estimado da transcrição
   * Preço: $0.006 por minuto (Whisper)
   */
  getEstimatedCost(audioDurationSeconds) {
    const minutes = audioDurationSeconds / 60;
    const cost = minutes * 0.006;
    return {
      minutes: minutes.toFixed(2),
      costUSD: cost.toFixed(4),
      costBRL: (cost * 5).toFixed(4) // Conversão aproximada
    };
  }
}

module.exports = WhisperAPI;
