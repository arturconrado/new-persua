/**
 * New Perssua - Context Manager
 * Gerencia histórico da conversa e contexto para o LLM
 */

class ContextManager {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 500; // Limite de tokens no contexto
    maxHistoryMinutes = options.maxHistoryMinutes || 3; // Histórico máximo em minutos
    this.language = options.language || 'pt-BR';
    
    // Buffer circular de transcrições
    this.transcriptionBuffer = [];
    
    // Histórico completo (para exportação)
    this.fullHistory = [];
    
    // Timestamp da última entrada
    this.lastTimestamp = Date.now();
    
    // Tokens atuais no buffer
    this.currentTokens = 0;
  }

  /**
   * Adicionar nova transcrição ao contexto
   * @param {string} text - Texto transcrito
   * @param {number} timestamp - Timestamp da transcrição
   */
  addTranscription(text, timestamp = Date.now()) {
    const entry = {
      type: 'transcription',
      text: text.trim(),
      timestamp,
      tokens: this._countTokens(text)
    };

    // Adicionar ao buffer
    this.transcriptionBuffer.push(entry);
    this.fullHistory.push(entry);
    
    // Atualizar contagem de tokens
    this.currentTokens += entry.tokens;
    
    // Remover entradas antigas se exceder limite
    this._pruneBuffer();
    
    // Atualizar timestamp
    this.lastTimestamp = timestamp;
  }

  /**
   * Adicionar resposta do LLM ao contexto
   * @param {string} text - Resposta gerada
   * @param {string} prompt - Prompt original
   */
  addResponse(text, prompt = '') {
    const entry = {
      type: 'response',
      text: text.trim(),
      prompt: prompt.trim(),
      timestamp: Date.now(),
      tokens: this._countTokens(text)
    };

    this.fullHistory.push(entry);
    
    // Não adicionar respostas ao buffer de contexto (apenas transcrições)
  }

  /**
   * Obter contexto atual para o LLM
   * @returns {string} - Contexto formatado
   */
  getContext() {
    if (this.transcriptionBuffer.length === 0) {
      return '';
    }

    // Ordenar por timestamp
    const sorted = [...this.transcriptionBuffer].sort((a, b) => a.timestamp - b.timestamp);
    
    // Combinar textos
    const contextText = sorted.map(entry => entry.text).join(' ');
    
    return contextText.trim();
  }

  /**
   * Obter contexto com metadados
   * @returns {Object} - Contexto estruturado
   */
  getContextWithMetadata() {
    const context = this.getContext();
    
    return {
      text: context,
      tokenCount: this.currentTokens,
      entryCount: this.transcriptionBuffer.length,
      oldestEntry: this.transcriptionBuffer[0]?.timestamp,
      newestEntry: this.transcriptionBuffer[this.transcriptionBuffer.length - 1]?.timestamp,
      durationMinutes: this.getDurationMinutes()
    };
  }

  /**
   * Obter duração do contexto em minutos
   */
  getDurationMinutes() {
    if (this.transcriptionBuffer.length < 2) {
      return 0;
    }

    const oldest = this.transcriptionBuffer[0].timestamp;
    const newest = this.transcriptionBuffer[this.transcriptionBuffer.length - 1].timestamp;
    
    return Math.round((newest - oldest) / 60000);
  }

  /**
   * Obter histórico completo
   */
  getFullHistory() {
    return this.fullHistory;
  }

  /**
   * Exportar histórico formatado
   * @param {string} format - 'markdown' | 'json' | 'text'
   * @returns {string} - Histórico formatado
   */
  exportHistory(format = 'markdown') {
    if (this.fullHistory.length === 0) {
      return 'Nenhum histórico disponível.';
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.fullHistory, null, 2);
      
      case 'text':
        return this.fullHistory.map(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString('pt-BR');
          const type = entry.type === 'transcription' ? '[Transcrição]' : '[Resposta]';
          return `${time} ${type}: ${entry.text}`;
        }).join('\n\n');
      
      case 'markdown':
      default:
        return this._exportMarkdown();
    }
  }

  /**
   * Exportar em formato Markdown
   */
  _exportMarkdown() {
    let markdown = '# New Perssua - Histórico da Reunião\n\n';
    markdown += `**Data**: ${new Date().toLocaleString('pt-BR')}\n`;
    markdown += `**Duração**: ${this.getDurationMinutes()} minutos\n`;
    markdown += `**Entradas**: ${this.fullHistory.length}\n\n`;
    markdown += '---\n\n';

    let currentTime = null;

    for (const entry of this.fullHistory) {
      const entryTime = new Date(entry.timestamp).toLocaleTimeString('pt-BR');
      
      // Adicionar timestamp se mudou
      if (entryTime !== currentTime) {
        currentTime = entryTime;
        markdown += `### ${currentTime}\n\n`;
      }

      // Tipo de entrada
      const icon = entry.type === 'transcription' ? '🎤' : '💡';
      markdown += `${icon} **${entry.type === 'transcription' ? 'Falado' : 'Sugestão'}**:\n\n`;
      markdown += `${entry.text}\n\n`;

      // Se for resposta, incluir prompt
      if (entry.prompt) {
        markdown += `> *Prompt*: ${entry.prompt}\n\n`;
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Limpar contexto
   */
  clear() {
    this.transcriptionBuffer = [];
    this.currentTokens = 0;
    // Manter fullHistory para exportação
  }

  /**
   * Limpar tudo (incluindo histórico)
   */
  clearAll() {
    this.transcriptionBuffer = [];
    this.fullHistory = [];
    this.currentTokens = 0;
  }

  /**
   * Remover entradas antigas do buffer
   */
  _pruneBuffer() {
    // Remover por tempo
    const now = Date.now();
    const maxAgeMs = this.maxHistoryMinutes * 60 * 1000;
    
    while (this.transcriptionBuffer.length > 0) {
      const oldest = this.transcriptionBuffer[0];
      if (now - oldest.timestamp > maxAgeMs) {
        this.transcriptionBuffer.shift();
        this.currentTokens -= oldest.tokens;
      } else {
        break;
      }
    }

    // Remover por tokens
    while (this.currentTokens > this.maxTokens && this.transcriptionBuffer.length > 0) {
      const removed = this.transcriptionBuffer.shift();
      this.currentTokens -= removed.tokens;
    }
  }

  /**
   * Contar tokens aproximadamente
   * Português: ~1 token por 3 caracteres
   */
  _countTokens(text) {
    return Math.ceil(text.length / 3);
  }

  /**
   * Obter estatísticas do contexto
   */
  getStats() {
    const transcriptionCount = this.fullHistory.filter(e => e.type === 'transcription').length;
    const responseCount = this.fullHistory.filter(e => e.type === 'response').length;
    const totalTokens = this.fullHistory.reduce((acc, e) => acc + (e.tokens || 0), 0);

    return {
      bufferEntries: this.transcriptionBuffer.length,
      totalEntries: this.fullHistory.length,
      transcriptions: transcriptionCount,
      responses: responseCount,
      currentTokens: this.currentTokens,
      totalTokens: totalTokens,
      durationMinutes: this.getDurationMinutes()
    };
  }

  /**
   * Buscar no histórico
   * @param {string} query - Termo de busca
   * @returns {Array} - Entradas encontradas
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    
    return this.fullHistory.filter(entry => 
      entry.text.toLowerCase().includes(lowerQuery) ||
      (entry.prompt && entry.prompt.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Obter últimas N entradas
   */
  getLast(n = 10) {
    return this.fullHistory.slice(-n);
  }
}

module.exports = ContextManager;
