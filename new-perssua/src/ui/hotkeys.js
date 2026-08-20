/**
 * New Perssua - Hotkey Manager
 * Gerenciamento de atalhos globais
 */

const { globalShortcut } = require('electron');

class HotkeyManager {
  constructor(mainWindow) {
    this.window = mainWindow;
    this.registeredShortcuts = new Map();
    this.isMac = process.platform === 'darwin';
    this.modifier = this.isMac ? 'Command' : 'Control';
  }

  /**
   * Registrar todos os atalhos padrão
   */
  registerAll() {
    // Ctrl/Cmd + B: Mostrar/Ocultar overlay
    this.register(
      `${this.modifier}+B`,
      () => this.handleToggleOverlay(),
      'toggle-overlay'
    );

    // Ctrl/Cmd + K: Focar no input manual
    this.register(
      `${this.modifier}+K`,
      () => this.handleFocusInput(),
      'focus-input'
    );

    // Ctrl/Cmd + Shift + S: Iniciar/Parar captura de áudio
    this.register(
      `${this.modifier}+Shift+S`,
      () => this.handleToggleAudio(),
      'toggle-audio'
    );

    // Ctrl/Cmd + Shift + M: Alternar modo (Auto/Manual)
    this.register(
      `${this.modifier}+Shift+M`,
      () => this.handleToggleMode(),
      'toggle-mode'
    );

    // Ctrl/Cmd + Shift + C: Copiar última resposta
    this.register(
      `${this.modifier}+Shift+C`,
      () => this.handleCopyResponse(),
      'copy-response'
    );

    // Ctrl/Cmd + Q: Sair do aplicativo
    this.register(
      `${this.modifier}+Q`,
      () => this.handleQuit(),
      'quit'
    );

    // Ctrl/Cmd + H: Ocultar rapidamente (hide)
    this.register(
      `${this.modifier}+H`,
      () => this.handleHide(),
      'hide'
    );

    // Ctrl/Cmd + Shift + E: Exportar histórico
    this.register(
      `${this.modifier}+Shift+E`,
      () => this.handleExportHistory(),
      'export-history'
    );

    console.log(`${this.registeredShortcuts.size} atalhos registrados`);
  }

  /**
   * Registrar um atalho
   * @param {string} accelerator - Combinação de teclas
   * @param {Function} callback - Função a ser executada
   * @param {string} name - Nome do atalho (para referência)
   * @returns {boolean} - Sucesso do registro
   */
  register(accelerator, callback, name = '') {
    try {
      const success = globalShortcut.register(accelerator, callback);
      
      if (success) {
        this.registeredShortcuts.set(name || accelerator, {
          accelerator,
          callback,
          active: true
        });
        console.log(`Atalho registrado: ${accelerator} (${name})`);
      } else {
        console.warn(`Falha ao registrar atalho: ${accelerator}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Erro ao registrar atalho ${accelerator}:`, error.message);
      return false;
    }
  }

  /**
   * Desregistrar um atalho específico
   * @param {string} name - Nome do atalho
   */
  unregister(name) {
    const shortcut = this.registeredShortcuts.get(name);
    
    if (shortcut) {
      globalShortcut.unregister(shortcut.accelerator);
      this.registeredShortcuts.delete(name);
      console.log(`Atalho desregistrado: ${shortcut.accelerator} (${name})`);
    }
  }

  /**
   * Desregistrar todos os atalhos
   */
  unregisterAll() {
    globalShortcut.unregisterAll();
    this.registeredShortcuts.clear();
    console.log('Todos os atalhos desregistrados');
  }

  /**
   * Reconfigurar um atalho existente
   * @param {string} name - Nome do atalho
   * @param {string} newAccelerator - Nova combinação de teclas
   * @param {Function} callback - Callback atualizado
   */
  reconfigure(name, newAccelerator, callback) {
    this.unregister(name);
    this.register(newAccelerator, callback, name);
  }

  // Handlers dos atalhos

  handleToggleOverlay() {
    if (!this.window || this.window.isDestroyed()) return;
    
    const isVisible = this.window.isVisible();
    
    if (isVisible) {
      this.window.hide();
      this.window.webContents.send('overlay-visibility-changed', false);
    } else {
      this.window.showInactive();
      this.window.webContents.send('overlay-visibility-changed', true);
    }
    
    console.log('Overlay:', isVisible ? 'oculto' : 'mostrado');
  }

  handleFocusInput() {
    if (!this.window || this.window.isDestroyed()) return;
    if (!this.window.isVisible()) return;
    
    this.window.webContents.send('focus-manual-input');
    console.log('Input focado');
  }

  handleToggleAudio() {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.window.webContents.send('toggle-audio-capture');
    console.log('Captura de áudio alternada');
  }

  handleToggleMode() {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.window.webContents.send('toggle-mode');
    console.log('Modo alternado');
  }

  handleCopyResponse() {
    if (!this.window || this.window.isDestroyed()) return;
    if (!this.window.isVisible()) return;
    
    this.window.webContents.send('copy-last-response');
    console.log('Copiar resposta acionado');
  }

  handleQuit() {
    console.log('Saindo do aplicativo...');
    
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('stop-audio-capture');
    }
    
    this.unregisterAll();
    
    const { app } = require('electron');
    app.quit();
  }

  handleHide() {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.window.hide();
    this.window.webContents.send('overlay-visibility-changed', false);
    console.log('Oculto rapidamente');
  }

  handleExportHistory() {
    if (!this.window || this.window.isDestroyed()) return;
    if (!this.window.isVisible()) return;
    
    this.window.webContents.send('export-history');
    console.log('Exportar histórico acionado');
  }

  /**
   * Obter lista de atalhos registrados
   */
  getRegisteredShortcuts() {
    return Array.from(this.registeredShortcuts.entries()).map(([name, data]) => ({
      name,
      accelerator: data.accelerator,
      active: data.active
    }));
  }

  /**
   * Verificar se um atalho está registrado
   */
  isRegistered(name) {
    return this.registeredShortcuts.has(name);
  }

  /**
   * Testar se um atalho está sendo pressionado (debug)
   */
  async testShortcut(accelerator) {
    return new Promise((resolve) => {
      let triggered = false;
      
      const callback = () => {
        triggered = true;
        console.log(`Teste: Atalho ${accelerator} funcionou!`);
      };
      
      const registered = this.register(accelerator, callback, 'test');
      
      setTimeout(() => {
        if (registered) {
          this.unregister('test');
        }
        resolve(triggered);
      }, 5000);
      
      console.log(`Testando atalho ${accelerator} por 5 segundos...`);
    });
  }

  /**
   * Obter alternativas para atalhos conflitantes
   */
  static getAlternativeShortcuts(conflict) {
    const alternatives = {
      'toggle-overlay': ['CommandOrControl+Shift+B', 'CommandOrControl+Alt+B', 'F12'],
      'focus-input': ['CommandOrControl+Shift+K', 'CommandOrControl+Alt+K', 'F9'],
      'toggle-audio': ['CommandOrControl+Shift+A', 'CommandOrControl+Alt+A', 'F10'],
      'toggle-mode': ['CommandOrControl+Shift+T', 'CommandOrControl+Alt+T', 'F11'],
      'copy-response': ['CommandOrControl+Shift+L', 'CommandOrControl+Alt+L'],
      'quit': ['CommandOrControl+Shift+Q']
    };
    
    return alternatives[conflict] || [];
  }
}

module.exports = HotkeyManager;
