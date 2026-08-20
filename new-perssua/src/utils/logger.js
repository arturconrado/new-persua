/**
 * New Perssua - Logger Utility
 * Sistema de logs centralizado
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info'; // debug, info, warn, error
    this.logToFile = options.logToFile || false;
    this.logFilePath = options.logFilePath || 'logs/app.log';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    
    // Níveis de log (numéricos para comparação)
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // Garantir que nível seja válido
    if (!this.levels[this.level]) {
      this.level = 'info';
    }
    
    // Criar diretório de logs se necessário
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Format timestamp
   */
  _timestamp() {
    return new Date().toISOString();
  }

  /**
   * Format message with level
   */
  _format(level, message, data = null) {
    let formatted = `[${this._timestamp()}] [${level.toUpperCase()}] ${message}`;
    
    if (data !== null) {
      try {
        formatted += ` ${JSON.stringify(data)}`;
      } catch (e) {
        formatted += ` [Object]`;
      }
    }
    
    return formatted;
  }

  /**
   * Write to file
   */
  _writeToFile(formattedMessage) {
    if (!this.logToFile) return;
    
    try {
      // Verificar tamanho do arquivo
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.maxFileSize) {
          // Rotacionar log
          const oldPath = this.logFilePath.replace('.log', '.old.log');
          fs.renameSync(this.logFilePath, oldPath);
        }
      }
      
      fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
    } catch (error) {
      console.error('[Logger] Erro ao escrever no arquivo:', error.message);
    }
  }

  /**
   * Log genérico
   */
  _log(level, message, data = null) {
    // Verificar se nível deve ser logado
    if (this.levels[level] < this.levels[this.level]) {
      return;
    }
    
    const formatted = this._format(level, message, data);
    
    // Console output com cores
    switch (level) {
      case 'debug':
        console.log(formatted);
        break;
      case 'info':
        console.info('\x1b[36m%s\x1b[0m', formatted); // Cyan
        break;
      case 'warn':
        console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
        break;
      case 'error':
        console.error('\x1b[31m%s\x1b[0m', formatted); // Red
        break;
    }
    
    // File output
    this._writeToFile(formatted);
  }

  /**
   * Debug log
   */
  debug(message, data = null) {
    this._log('debug', message, data);
  }

  /**
   * Info log
   */
  info(message, data = null) {
    this._log('info', message, data);
  }

  /**
   * Warning log
   */
  warn(message, data = null) {
    this._log('warn', message, data);
  }

  /**
   * Error log
   */
  error(message, data = null) {
    this._log('error', message, data);
  }

  /**
   * Log de erro com stack trace
   */
  errorWithStack(error, context = '') {
    const message = context ? `${context}: ${error.message}` : error.message;
    this._log('error', message, {
      stack: error.stack,
      name: error.name
    });
  }

  /**
   * Performance timing
   */
  time(label) {
    console.time(`[${label}]`);
  }

  /**
   * Performance timing end
   */
  timeEnd(label) {
    console.timeEnd(`[${label}]`);
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels[level]) {
      this.level = level;
      this.info(`Log level alterado para: ${level}`);
    } else {
      this.warn(`Nível de log inválido: ${level}`);
    }
  }

  /**
   * Get current level
   */
  getLevel() {
    return this.level;
  }

  /**
   * Enable file logging
   */
  enableFileLogging(filePath) {
    if (filePath) {
      this.logFilePath = filePath;
    }
    this.logToFile = true;
    this.info('Log em arquivo ativado');
  }

  /**
   * Disable file logging
   */
  disableFileLogging() {
    this.logToFile = false;
    this.info('Log em arquivo desativado');
  }

  /**
   * Clear log file
   */
  clearLogFile() {
    if (fs.existsSync(this.logFilePath)) {
      fs.unlinkSync(this.logFilePath);
      this.info('Arquivo de log limpo');
    }
  }

  /**
   * Get log file path
   */
  getLogFilePath() {
    return this.logFilePath;
  }
}

// Exportar instância singleton
const defaultLogger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  logToFile: process.env.LOG_TO_FILE === 'true',
  logFilePath: process.env.LOG_FILE_PATH || 'logs/new-perssua.log'
});

module.exports = defaultLogger;
module.exports.Logger = Logger;
