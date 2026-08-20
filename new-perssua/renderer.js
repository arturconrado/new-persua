/**
 * New Perssua - Renderer Process
 * Lógica principal do frontend
 */

// Estado global
const state = {
  isAudioCapturing: false,
  isTranscribing: false,
  isLLMReady: true,
  autoSuggestMode: false,
  currentTranscription: '',
  currentResponse: '',
  transcriptionHistory: [],
  config: {}
};

// Elementos DOM
const elements = {};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log('New Perssua - Renderer iniciado');
  
  // Cache DOM elements
  cacheElements();
  
  // Load config
  await loadConfig();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup IPC listeners
  setupIPCListeners();
  
  // Initialize waveform
  if (window.WaveformVisualizer) {
    window.waveformViz = new window.WaveformVisualizer('waveform-canvas');
  }
  
  // Update version
  updateVersion();
  
  logger.info('Interface inicializada');
});

// Cache DOM elements
function cacheElements() {
  elements.btnAudioToggle = document.getElementById('btn-audio-toggle');
  elements.btnSettings = document.getElementById('btn-settings');
  elements.btnSend = document.getElementById('btn-send');
  elements.btnCopyResponse = document.getElementById('btn-copy-response');
  elements.manualInput = document.getElementById('manual-input');
  elements.transcriptionText = document.getElementById('transcription-text');
  elements.responseText = document.getElementById('response-text');
  elements.transcriptionStatus = document.getElementById('transcription-status');
  elements.modeIndicator = document.getElementById('mode-indicator');
  elements.statusIndicator = document.getElementById('status-indicator');
  elements.audioStatus = document.getElementById('audio-status');
  elements.transcriptionStatusBar = document.getElementById('transcription-status-bar');
  elements.llmStatusBar = document.getElementById('llm-status-bar');
  elements.appVersion = document.getElementById('app-version');
  
  // Settings modal elements
  elements.settingsModal = document.getElementById('settings-modal');
  elements.btnSaveSettings = document.getElementById('btn-save-settings');
  elements.btnCancelSettings = document.getElementById('btn-cancel-settings');
  elements.btnCloseSettings = document.getElementById('btn-close-settings');
  elements.configLlmProvider = document.getElementById('config-llm-provider');
  elements.configOpenRouterKey = document.getElementById('config-openrouter-key');
  elements.configModel = document.getElementById('config-model');
  elements.configLanguage = document.getElementById('config-language');
  elements.configWhisperMode = document.getElementById('config-whisper-mode');
  elements.configOpacity = document.getElementById('config-opacity');
  elements.opacityValue = document.getElementById('opacity-value');
  elements.configAudioSource = document.getElementById('config-audio-source');
  elements.configAutoSuggest = document.getElementById('config-auto-suggest');
  elements.configShowTranscription = document.getElementById('config-show-transcription');
  
  // Setting groups
  elements.openRouterKeyGroup = document.getElementById('openrouter-key-group');
}

// Load configuration
async function loadConfig() {
  try {
    state.config = await window.electronAPI.getAllConfigs();
    
    // Apply config to UI
    elements.configLlmProvider.value = state.config.llmProvider || 'openrouter';
    elements.configOpenRouterKey.value = state.config.openrouterApiKey || '';
    elements.configModel.value = state.config.model || 'openai/gpt-4-turbo';
    elements.configLanguage.value = state.config.language || 'pt-BR';
    elements.configWhisperMode.value = state.config.whisperMode || 'api';
    elements.configOpacity.value = state.config.opacity || 0.95;
    elements.opacityValue.textContent = `${Math.round((state.config.opacity || 0.95) * 100)}%`;
    elements.configAudioSource.value = state.config.audioSource || 'system';
    elements.configAutoSuggest.checked = state.config.autoSuggestMode || false;
    elements.configShowTranscription.checked = state.config.showTranscription !== false;
    
    state.autoSuggestMode = state.config.autoSuggestMode || false;
    updateModeIndicator();
    
    // Show/hide API key fields based on provider
    updateAPIKeyFields();
    
    logger.info('Configuração carregada');
  } catch (error) {
    logger.error('Erro ao carregar configuração: ' + error.message);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Audio toggle button
  elements.btnAudioToggle.addEventListener('click', () => {
    toggleAudioCapture();
  });
  
  // Settings button
  elements.btnSettings.addEventListener('click', () => {
    showSettingsModal();
  });
  
  // Send button
  elements.btnSend.addEventListener('click', () => {
    sendManualQuestion();
  });
  
  // Manual input enter key
  elements.manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendManualQuestion();
    }
  });
  
  // Copy response button
  elements.btnCopyResponse.addEventListener('click', () => {
    copyLastResponse();
  });
  
  // Settings modal buttons
  elements.btnSaveSettings.addEventListener('click', saveSettings);
  elements.btnCancelSettings.addEventListener('click', hideSettingsModal);
  elements.btnCloseSettings.addEventListener('click', hideSettingsModal);
  
  // Close modal on overlay click
  elements.settingsModal.querySelector('.modal-overlay').addEventListener('click', hideSettingsModal);
  
  // LLM provider change
  elements.configLlmProvider.addEventListener('change', () => {
    // OpenRouter é o único provedor - não há necessidade de mudar
    // Apenas manter a UI consistente
    updateAPIKeyFields();
  });
  
  // Opacity slider
  elements.configOpacity.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    elements.opacityValue.textContent = `${Math.round(value * 100)}%`;
    document.body.style.opacity = value;
  });
}

// Setup IPC listeners
function setupIPCListeners() {
  // Overlay visibility changed
  window.electronAPI.onOverlayVisibilityChanged((isVisible) => {
    logger.info(`Overlay visibilidade: ${isVisible}`);
  });
  
  // Audio capture toggled
  window.electronAPI.onAudioCaptureToggled((isActive) => {
    state.isAudioCapturing = isActive;
    updateAudioStatus(isActive);
    
    if (isActive && window.waveformViz) {
      window.waveformViz.start();
    } else if (window.waveformViz) {
      window.waveformViz.stop();
    }
  });
  
  // Stop audio capture
  window.electronAPI.onStopAudioCapture(() => {
    state.isAudioCapturing = false;
    updateAudioStatus(false);
    if (window.waveformViz) {
      window.waveformViz.stop();
    }
  });
  
  // Focus manual input
  window.electronAPI.onFocusManualInput(() => {
    elements.manualInput.focus();
    elements.manualInput.select();
  });
  
  // Mode changed
  window.electronAPI.onModeChanged((isAutoMode) => {
    state.autoSuggestMode = isAutoMode;
    updateModeIndicator();
    showToast(`Modo ${isAutoMode ? 'Automático' : 'Manual'} ativado`, 'info');
  });
  
  // Copy last response
  window.electronAPI.onCopyLastResponse(() => {
    copyLastResponse();
  });
}

// Toggle audio capture
function toggleAudioCapture() {
  window.electronAPI.toggleAudioCapture();
}

// Update audio status UI
function updateAudioStatus(isActive) {
  const statusDot = elements.audioStatus.querySelector('.status-dot');
  const statusText = elements.audioStatus.querySelector('.status-text');
  
  if (isActive) {
    statusDot.classList.add('active');
    statusText.textContent = 'Ativo';
    elements.transcriptionStatus.textContent = 'Ouvindo...';
    elements.btnAudioToggle.style.background = 'var(--accent-success)';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = 'Inativo';
    elements.transcriptionStatus.textContent = 'Aguardando...';
    elements.btnAudioToggle.style.background = '';
  }
}

// Update mode indicator
function updateModeIndicator() {
  if (state.autoSuggestMode) {
    elements.modeIndicator.textContent = 'AUTO';
    elements.modeIndicator.style.background = 'var(--accent-success)';
  } else {
    elements.modeIndicator.textContent = 'MANUAL';
    elements.modeIndicator.style.background = 'var(--accent-warning)';
  }
}

// Update API key fields visibility
function updateAPIKeyFields() {
  // OpenRouter é o único provedor - sempre mostrar o campo de API Key do OpenRouter
  elements.openRouterKeyGroup.style.display = 'block';
}

// Show settings modal
function showSettingsModal() {
  elements.settingsModal.classList.remove('hidden');
}

// Hide settings modal
function hideSettingsModal() {
  elements.settingsModal.classList.add('hidden');
}

// Save settings
async function saveSettings() {
  try {
    const configs = {
      llmProvider: elements.configLlmProvider.value,
      openrouterApiKey: elements.configOpenRouterKey.value,
      model: elements.configModel.value,
      language: elements.configLanguage.value,
      whisperMode: elements.configWhisperMode.value,
      opacity: parseFloat(elements.configOpacity.value),
      audioSource: elements.configAudioSource.value,
      autoSuggestMode: elements.configAutoSuggest.checked,
      showTranscription: elements.configShowTranscription.checked
    };
    
    await window.electronAPI.setMultipleConfigs(configs);
    state.config = configs;
    
    // Apply opacity
    document.body.style.opacity = configs.opacity;
    
    hideSettingsModal();
    showToast('Configurações salvas com sucesso!', 'success');
    logger.info('Configurações salvas');
  } catch (error) {
    showToast('Erro ao salvar configurações: ' + error.message, 'error');
    logger.error('Erro ao salvar configurações: ' + error.message);
  }
}

// Send manual question to LLM
async function sendManualQuestion() {
  const question = elements.manualInput.value.trim();
  if (!question) return;
  
  // Clear input
  elements.manualInput.value = '';
  
  // Show loading state
  elements.responseText.innerHTML = '<p class="placeholder-text">Gerando resposta...</p>';
  state.isLLMReady = false;
  
  try {
    // Get context from recent transcription
    const context = getRecentTranscription(2); // Last 2 minutes
    
    // Build prompt
    const prompt = buildPrompt(context, question);
    
    // Call LLM
    const response = await callLLM(prompt);
    
    // Display response
    displayResponse(response);
    
    // Add to history
    state.transcriptionHistory.push({
      type: 'question',
      content: question,
      timestamp: new Date().toISOString()
    });
    
    state.transcriptionHistory.push({
      type: 'response',
      content: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Erro ao enviar pergunta: ' + error.message);
    showToast('Erro ao gerar resposta: ' + error.message, 'error');
    elements.responseText.innerHTML = '<p class="placeholder-text">Erro ao gerar resposta. Tente novamente.</p>';
  } finally {
    state.isLLMReady = true;
  }
}

// Get recent transcription (last N minutes)
function getRecentTranscription(minutes = 2) {
  // This would be implemented with actual transcription data
  // For now, return empty string
  return state.currentTranscription;
}

// Build prompt for LLM
function buildPrompt(context, question) {
  const systemPrompt = `Você é um assistente de reunião especializado em fornecer respostas concisas e acionáveis.
Contexto da conversa: ${context || 'Nenhum contexto disponível'}
Pergunta do usuário: ${question}

Forneça uma resposta clara, objetiva e prática que o usuário possa usar imediatamente na reunião.`;

  return systemPrompt;
}

// Call LLM API - OpenRouter Only
async function callLLM(prompt) {
  const provider = state.config.llmProvider || 'openrouter';
  
  // OpenRouter é o único provedor suportado
  if (provider !== 'openrouter') {
    logger.warn('Provedor não suportado. Usando OpenRouter.');
  }
  
  const apiKey = state.config.openrouterApiKey;
  const model = state.config.model || 'openai/gpt-4-turbo';
  
  if (!apiKey) {
    throw new Error('API Key do OpenRouter não configurada.');
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://newperssua.com',
        'X-Title': 'New Perssua'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Você é um assistente de reuniões especializado em fornecer respostas concisas e práticas.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Erro ao chamar LLM: ' + error.message);
    throw error;
  }
}

// Display LLM response
function displayResponse(response) {
  // Parse markdown (would use marked.js in production)
  const html = parseMarkdown(response);
  elements.responseText.innerHTML = html;
  state.currentResponse = response;
  
  // Auto-scroll to bottom
  const responseContent = document.getElementById('response-content');
  responseContent.scrollTop = responseContent.scrollHeight;
}

// Simple markdown parser (placeholder for marked.js)
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

// Copy last response to clipboard
function copyLastResponse() {
  if (!state.currentResponse) {
    showToast('Nenhuma resposta para copiar', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(state.currentResponse).then(() => {
    showToast('Resposta copiada!', 'success');
  }).catch((error) => {
    showToast('Erro ao copiar: ' + error.message, 'error');
  });
}

// Update transcription display
function updateTranscription(text) {
  state.currentTranscription = text;
  elements.transcriptionText.innerHTML = `<p>${text}</p>`;
  
  // Auto-scroll to bottom
  const transcriptionContent = document.getElementById('transcription-content');
  transcriptionContent.scrollTop = transcriptionContent.scrollHeight;
}

// Show toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Update app version
async function updateVersion() {
  try {
    const version = await window.electronAPI.getAppVersion();
    elements.appVersion.textContent = version;
  } catch (error) {
    logger.error('Erro ao obter versão: ' + error.message);
  }
}

// Export conversation history
async function exportHistory() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `new-perssua-${timestamp}.md`;
  
  let content = '# New Perssua - Histórico da Reunião\n\n';
  content += `Data: ${now.toLocaleString('pt-BR')}\n\n`;
  content += '---\n\n';
  
  for (const item of state.transcriptionHistory) {
    const time = new Date(item.timestamp).toLocaleTimeString('pt-BR');
    const type = item.type === 'question' ? '❓ Pergunta' : '💡 Resposta';
    content += `**${time}** - ${type}\n\n${item.content}\n\n`;
  }
  
  try {
    const result = await window.electronAPI.exportHistory(filename, content);
    if (result.success) {
      showToast('Histórico exportado com sucesso!', 'success');
    } else {
      showToast('Erro ao exportar: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Erro ao exportar: ' + error.message, 'error');
  }
}

// Handle errors globally
window.onerror = (message, source, lineno, colno, error) => {
  logger.error(`Erro global: ${message} (${source}:${lineno}:${colno})`);
  window.electronAPI.reportError({
    message,
    source,
    lineno,
    colno,
    stack: error?.stack
  });
};

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (window.waveformViz) {
    window.waveformViz.stop();
  }
});
