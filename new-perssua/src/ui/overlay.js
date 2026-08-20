/**
 * New Perssua - Overlay Controller
 * Controle da janela overlay invisível
 */

const { BrowserWindow } = require('electron');

class OverlayController {
  constructor(window) {
    this.window = window;
    this.isVisible = true;
    this.opacity = 0.95;
    this.position = { x: null, y: null };
  }

  /**
   * Mostrar overlay sem roubar foco
   */
  show() {
    if (!this.window) return;
    
    this.window.showInactive();
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.isVisible = true;
    
    this.emitEvent('overlay-visibility-changed', true);
  }

  /**
   * Ocultar overlay
   */
  hide() {
    if (!this.window) return;
    
    this.window.hide();
    this.isVisible = false;
    
    this.emitEvent('overlay-visibility-changed', false);
  }

  /**
   * Alternar visibilidade
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Ajustar opacidade da janela
   * @param {number} value - Opacidade entre 0 e 1
   */
  setOpacity(value) {
    this.opacity = Math.max(0, Math.min(1, value));
    this.window.setOpacity(this.opacity);
  }

  /**
   * Obter opacidade atual
   */
  getOpacity() {
    return this.opacity;
  }

  /**
   * Mover para posição específica
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  setPosition(x, y) {
    if (!this.window) return;
    
    this.window.setPosition(x, y);
    this.position = { x, y };
  }

  /**
   * Mover para canto da tela
   * @param {string} corner - 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
   * @param {number} offset - Distância do canto em pixels
   */
  moveToCorner(corner = 'bottom-right', offset = 20) {
    if (!this.window) return;
    
    const { screen } = require('electron');
    const displays = screen.getAllDisplays();
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const { x: dx, y: dy, width, height } = display.workArea;
    const { width: ww, height: wh } = this.window.getBounds();

    let x, y;

    switch (corner) {
      case 'top-left':
        x = dx + offset;
        y = dy + offset;
        break;
      case 'top-right':
        x = dx + width - ww - offset;
        y = dy + offset;
        break;
      case 'bottom-left':
        x = dx + offset;
        y = dy + height - wh - offset;
        break;
      case 'bottom-right':
      default:
        x = dx + width - ww - offset;
        y = dy + height - wh - offset;
        break;
    }

    this.setPosition(x, y);
  }

  /**
   * Redimensionar janela
   * @param {number} width - Largura
   * @param {number} height - Altura
   */
  setSize(width, height) {
    if (!this.window) return;
    
    this.window.setSize(width, height);
  }

  /**
   * Tornar janela clicável (para arrastar)
   */
  setIgnoreMouseEvents(ignore) {
    if (!this.window) return;
    
    this.window.setIgnoreMouseEvents(ignore, { forward: true });
  }

  /**
   * Sempre no topo
   * @param {boolean} alwaysOnTop
   */
  setAlwaysOnTop(alwaysOnTop) {
    if (!this.window) return;
    
    this.window.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
  }

  /**
   * Visível em todos os workspaces
   * @param {boolean} visible
   */
  setVisibleOnAllWorkspaces(visible) {
    if (!this.window) return;
    
    this.window.setVisibleOnAllWorkspaces(visible, { visibleOnFullScreen: true });
  }

  /**
   * Habilitar/desabilitar proteção de conteúdo
   * @param {boolean} protect
   */
  setContentProtection(protect) {
    if (!this.window) return;
    
    this.window.setContentProtection(protect);
  }

  /**
   * Obter status atual
   */
  getStatus() {
    return {
      isVisible: this.isVisible,
      opacity: this.opacity,
      position: this.position,
      size: this.window?.getBounds() || null,
      isAlwaysOnTop: this.window?.isAlwaysOnTop() || false
    };
  }

  /**
   * Emitir evento para o renderer
   */
  emitEvent(channel, data) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  /**
   * Focar na janela (use com cuidado - pode roubar foco)
   */
  focus() {
    if (!this.window) return;
    
    this.window.focus();
  }

  /**
   * Fechar janela
   */
  close() {
    if (!this.window) return;
    
    this.window.close();
  }

  /**
   * Minimizar (se permitido)
   */
  minimize() {
    if (!this.window) return;
    
    this.window.minimize();
  }

  /**
   * Restaurar após minimizar
   */
  restore() {
    if (!this.window) return;
    
    this.window.restore();
    this.show();
  }

  /**
   * Entrar em modo picture-in-picture (alternativa)
   */
  async enterPictureInPicture() {
    if (!this.window) return;
    
    // Definir tamanho pequeno
    this.setSize(320, 240);
    
    // Mover para canto
    this.moveToCorner('bottom-right', 10);
    
    // Sempre no topo
    this.setAlwaysOnTop(true);
  }

  /**
   * Sair do modo picture-in-picture
   */
  async exitPictureInPicture() {
    if (!this.window) return;
    
    // Restaurar tamanho padrão
    this.setSize(400, 600);
  }
}

module.exports = OverlayController;
