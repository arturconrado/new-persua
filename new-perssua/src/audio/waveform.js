/**
 * New Perssua - Waveform Visualizer
 * Visualização de áudio em tempo real usando Canvas API
 */

class WaveformVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas com ID "${canvasId}" não encontrado`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    
    this.options = {
      barWidth: options.barWidth || 3,
      barGap: options.barGap || 1,
      barColor: options.barColor || '#3b82f6',
      barColorActive: options.barColorActive || '#10b981',
      backgroundColor: options.backgroundColor || 'transparent',
      smoothing: options.smoothing || 0.8,
      sensitivity: options.sensitivity || 2.0,
      maxBars: options.maxBars || 20
    };

    this.isRunning = false;
    this.audioData = new Float32Array(0);
    this.animationFrame = null;
    this.barHeights = [];
    this.targetBarHeights = [];

    // Configurar tamanho do canvas
    this._resizeCanvas();
    
    // Observar mudanças de tamanho
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => this._resizeCanvas());
      resizeObserver.observe(this.canvas.parentElement);
    }
  }

  /**
   * Redimensionar canvas para o tamanho correto
   */
  _resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    
    // Inicializar alturas das barras
    const numBars = Math.floor(this.canvasWidth / (this.options.barWidth + this.options.barGap));
    this.barHeights = new Array(numBars).fill(0);
    this.targetBarHeights = new Array(numBars).fill(0);
  }

  /**
   * Iniciar visualização
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._animate();
  }

  /**
   * Parar visualização
   */
  stop() {
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Limpar canvas
    this._clear();
  }

  /**
   * Atualizar com novos dados de áudio
   */
  update(audioData) {
    if (!audioData) return;
    
    this.audioData = audioData;
  }

  /**
   * Calcular dados do waveform a partir dos dados de áudio
   */
  _calculateWaveformData() {
    if (this.audioData.length === 0) {
      return new Array(this.barHeights.length).fill(0);
    }

    const numBars = this.barHeights.length;
    const blockSize = Math.floor(this.audioData.length / numBars);
    const values = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      
      // Calcular valor RMS (Root Mean Square) para cada bloco
      let sum = 0;
      for (let j = start; j < Math.min(end, this.audioData.length); j++) {
        sum += this.audioData[j] * this.audioData[j];
      }
      
      const rms = Math.sqrt(sum / blockSize);
      const normalizedValue = Math.min(1, rms * this.options.sensitivity);
      
      values.push(normalizedValue);
    }

    return values;
  }

  /**
   * Loop de animação
   */
  _animate() {
    if (!this.isRunning) return;

    // Calcular valores alvo das barras
    const targetValues = this._calculateWaveformData();
    
    // Suavizar transição das alturas
    for (let i = 0; i < this.barHeights.length; i++) {
      const target = targetValues[i] || 0;
      const current = this.barHeights[i];
      
      // Interpolação linear suave
      this.barHeights[i] = current + (target - current) * (1 - this.options.smoothing);
    }

    // Renderizar
    this._render();

    // Próximo frame
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }

  /**
   * Renderizar waveform no canvas
   */
  _render() {
    this._clear();

    const { barWidth, barGap, barColor, barColorActive, backgroundColor } = this.options;
    const maxHeight = this.canvasHeight * 0.8; // 80% da altura máxima

    // Fundo
    if (backgroundColor) {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    // Centralizar verticalmente
    const centerY = this.canvasHeight / 2;

    // Desenhar barras
    for (let i = 0; i < this.barHeights.length; i++) {
      const height = this.barHeights[i] * maxHeight;
      const x = i * (barWidth + barGap);
      
      if (height < 1) continue; // Não desenhar barras muito pequenas

      const y = centerY - height / 2;

      // Gradiente de cor baseado na altura
      const intensity = this.barHeights[i];
      const color = intensity > 0.5 ? barColorActive : barColor;
      
      this.ctx.fillStyle = color;
      
      // Barras com cantos arredondados
      this._roundRect(x, y, barWidth, height, Math.min(barWidth / 2, 2));
      this.ctx.fill();
    }
  }

  /**
   * Desenhar retângulo com cantos arredondados
   */
  _roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Limpar canvas
   */
  _clear() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Mostrar estado inativo (silêncio)
   */
  showIdle() {
    this._clear();
    
    const centerY = this.canvasHeight / 2;
    const centerX = this.canvasWidth / 2;
    
    this.ctx.fillStyle = this.options.barColor;
    this.ctx.globalAlpha = 0.3;
    
    // Desenhar algumas barras pequenas no centro
    for (let i = -3; i <= 3; i++) {
      const height = 4 + Math.random() * 4;
      const x = centerX + i * 6;
      const y = centerY - height / 2;
      
      this.ctx.fillRect(x, y, 2, height);
    }
    
    this.ctx.globalAlpha = 1;
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.WaveformVisualizer = WaveformVisualizer;
}

module.exports = WaveformVisualizer;
