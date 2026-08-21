/**
 * New Perssua - contexto nativo de tela + microfone e assistência automática.
 */

const AUDIO_CHUNK_MS = 8000;
const SCREEN_CAPTURE_MS = 5000;
const MIN_SUGGESTION_INTERVAL_MS = 12000;

const state = {
  isAudioCapturing: false,
  isTranscribing: false,
  isLLMReady: true,
  assistantMode: 'meeting',
  currentTranscription: '',
  currentResponse: '',
  transcriptSegments: [],
  transcriptionHistory: [],
  latestScreenFrame: '',
  screenFingerprint: '',
  screenCaptureFailed: false,
  screenCaptureBlocked: false,
  lastSuggestionFingerprint: '',
  lastSuggestionAt: 0,
  lastReportedError: '',
  audioStream: null,
  audioRecorder: null,
  audioStopTimer: null,
  audioContext: null,
  analyserFrame: null,
  screenTimer: null,
  suggestionTimer: null,
  transcriptionQueue: Promise.resolve(),
  config: {}
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  await loadConfig();
  setupEventListeners();
  setupIPCListeners();

  if (window.WaveformVisualizer) {
    window.waveformViz = new window.WaveformVisualizer('waveform-canvas');
  }

  updateVersion();
  startScreenCapture();
  await startAudioCapture();
  if (!hasOpenRouterKey()) showMissingAPIKeyState();
  logger.info('Interface inicializada com contexto nativo');
});

function cacheElements() {
  elements.btnAudioToggle = document.getElementById('btn-audio-toggle');
  elements.btnSettings = document.getElementById('btn-settings');
  elements.btnSend = document.getElementById('btn-send');
  elements.btnCopyResponse = document.getElementById('btn-copy-response');
  elements.manualInput = document.getElementById('manual-input');
  elements.transcriptionSection = document.getElementById('transcription-section');
  elements.transcriptionText = document.getElementById('transcription-text');
  elements.responseText = document.getElementById('response-text');
  elements.responseSectionTitle = document.getElementById('response-section-title');
  elements.transcriptionStatus = document.getElementById('transcription-status');
  elements.modeSelector = document.getElementById('mode-selector');
  elements.audioStatus = document.getElementById('audio-status');
  elements.screenStatus = document.getElementById('screen-status');
  elements.llmStatusBar = document.getElementById('llm-status-bar');
  elements.appVersion = document.getElementById('app-version');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.btnSaveSettings = document.getElementById('btn-save-settings');
  elements.btnCancelSettings = document.getElementById('btn-cancel-settings');
  elements.btnCloseSettings = document.getElementById('btn-close-settings');
  elements.configLlmProvider = document.getElementById('config-llm-provider');
  elements.configOpenRouterKey = document.getElementById('config-openrouter-key');
  elements.configModel = document.getElementById('config-model');
  elements.configTranscriptionModel = document.getElementById('config-transcription-model');
  elements.configLanguage = document.getElementById('config-language');
  elements.configOpacity = document.getElementById('config-opacity');
  elements.opacityValue = document.getElementById('opacity-value');
  elements.configShowTranscription = document.getElementById('config-show-transcription');
}

async function loadConfig() {
  try {
    state.config = await window.electronAPI.getAllConfigs();
    state.assistantMode = window.AssistantModes.normalizeAssistantMode(state.config.assistantMode);

    elements.configLlmProvider.value = 'openrouter';
    elements.configOpenRouterKey.value = state.config.openrouterApiKey || '';
    elements.configModel.value = state.config.model || 'google/gemini-2.5-flash';
    elements.configTranscriptionModel.value = state.config.transcriptionModel || 'openai/whisper-1';
    elements.configLanguage.value = state.config.language || 'pt-BR';
    elements.configOpacity.value = state.config.opacity || 0.95;
    elements.opacityValue.textContent = `${Math.round((state.config.opacity || 0.95) * 100)}%`;
    elements.configShowTranscription.checked = state.config.showTranscription !== false;
    document.body.style.opacity = state.config.opacity || 0.95;

    updateModeUI();
    applyTranscriptionVisibility();
  } catch (error) {
    logger.error('Erro ao carregar configuração: ' + error.message);
  }
}

function setupEventListeners() {
  elements.btnAudioToggle.addEventListener('click', () => window.electronAPI.toggleAudioCapture());
  elements.btnSettings.addEventListener('click', showSettingsModal);
  elements.btnSend.addEventListener('click', sendManualQuestion);
  elements.manualInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') sendManualQuestion();
  });
  elements.btnCopyResponse.addEventListener('click', copyLastResponse);
  elements.btnSaveSettings.addEventListener('click', saveSettings);
  elements.btnCancelSettings.addEventListener('click', hideSettingsModal);
  elements.btnCloseSettings.addEventListener('click', hideSettingsModal);
  elements.settingsModal.querySelector('.modal-overlay').addEventListener('click', hideSettingsModal);
  elements.screenStatus.addEventListener('click', openScreenPrivacySettings);
  elements.modeSelector.addEventListener('change', event => setAssistantMode(event.target.value));
  elements.configOpacity.addEventListener('input', event => {
    const value = Number(event.target.value);
    elements.opacityValue.textContent = `${Math.round(value * 100)}%`;
    document.body.style.opacity = value;
  });
}

function setupIPCListeners() {
  window.electronAPI.onOverlayVisibilityChanged(isVisible => logger.info(`Overlay visibilidade: ${isVisible}`));
  window.electronAPI.onAudioCaptureToggled(async isActive => {
    if (isActive) await startAudioCapture();
    else stopAudioCapture();
  });
  window.electronAPI.onStopAudioCapture(stopAudioCapture);
  window.electronAPI.onFocusManualInput(() => {
    elements.manualInput.focus();
    elements.manualInput.select();
  });
  window.electronAPI.onModeChanged(setAssistantMode);
  window.electronAPI.onCopyLastResponse(copyLastResponse);
}

async function setAssistantMode(mode) {
  state.assistantMode = window.AssistantModes.normalizeAssistantMode(mode);
  state.config.assistantMode = state.assistantMode;
  await window.electronAPI.setConfig('assistantMode', state.assistantMode);
  updateModeUI();
  state.lastSuggestionFingerprint = '';
  scheduleAutoSuggestion(250);
  showToast(`Modo ${state.assistantMode === 'meeting' ? 'Reunião' : 'Estudo'} ativado`, 'info');
}

function updateModeUI() {
  const isMeeting = state.assistantMode === 'meeting';
  elements.modeSelector.value = state.assistantMode;
  elements.responseSectionTitle.textContent = isMeeting ? 'Sugestões da Reunião' : 'Explicações e Anotações';
  elements.manualInput.placeholder = isMeeting
    ? 'Pergunte algo sobre a reunião (Ctrl+K)...'
    : 'Pergunte algo sobre o estudo (Ctrl+K)...';
}

async function startAudioCapture() {
  if (state.isAudioCapturing) return;

  try {
    if (!window.MediaRecorder) throw new Error('Gravação de áudio não suportada nesta versão do sistema.');
    state.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    state.isAudioCapturing = true;
    window.electronAPI.setAudioCaptureActive(true);
    updateAudioStatus(true);
    connectWaveform(state.audioStream);
    startNextAudioChunk();

    if (!hasOpenRouterKey()) {
      reportOnce('missing-key', 'Adicione sua chave OpenRouter para ativar transcrição e sugestões.', 'warning');
    }
  } catch (error) {
    state.audioStream?.getTracks().forEach(track => track.stop());
    state.audioStream = null;
    state.isAudioCapturing = false;
    window.electronAPI.setAudioCaptureActive(false);
    updateAudioStatus(false);
    const message = error.name === 'NotAllowedError'
      ? 'Autorize o microfone nas configurações de Privacidade do sistema.'
      : `Não foi possível iniciar o microfone: ${error.message}`;
    reportOnce(message, message, 'error');
    logger.error(message);
  }
}

function stopAudioCapture() {
  state.isAudioCapturing = false;
  window.electronAPI.setAudioCaptureActive(false);
  clearTimeout(state.audioStopTimer);
  if (state.audioRecorder?.state === 'recording') state.audioRecorder.stop();
  state.audioRecorder = null;
  state.audioStream?.getTracks().forEach(track => track.stop());
  state.audioStream = null;
  if (state.audioContext) state.audioContext.close().catch(() => {});
  state.audioContext = null;
  cancelAnimationFrame(state.analyserFrame);
  window.waveformViz?.stop();
  updateAudioStatus(false);
}

function startNextAudioChunk() {
  if (!state.isAudioCapturing || !state.audioStream) return;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
  const recorder = new MediaRecorder(state.audioStream, mimeType ? { mimeType } : undefined);
  const parts = [];
  state.audioRecorder = recorder;

  recorder.addEventListener('dataavailable', event => {
    if (event.data.size) parts.push(event.data);
  });
  recorder.addEventListener('stop', () => {
    const audio = new Blob(parts, { type: recorder.mimeType || 'audio/webm' });
    if (state.isAudioCapturing) startNextAudioChunk();
    if (audio.size > 1000 && hasOpenRouterKey()) {
      state.transcriptionQueue = state.transcriptionQueue
        .then(() => transcribeAudio(audio))
        .catch(error => handleContextError('transcrição', error));
    }
  });

  recorder.start();
  state.audioStopTimer = setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, AUDIO_CHUNK_MS);
}

function connectWaveform(stream) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext || !window.waveformViz) return;

  state.audioContext = new AudioContext();
  const analyser = state.audioContext.createAnalyser();
  const samples = new Float32Array(analyser.fftSize);
  state.audioContext.createMediaStreamSource(stream).connect(analyser);
  window.waveformViz.start();

  const update = () => {
    if (!state.isAudioCapturing) return;
    analyser.getFloatTimeDomainData(samples);
    window.waveformViz.update(samples);
    state.analyserFrame = requestAnimationFrame(update);
  };
  update();
}

async function transcribeAudio(blob) {
  state.isTranscribing = true;
  elements.transcriptionStatus.textContent = 'Transcrevendo...';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.config.openrouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: state.config.transcriptionModel || 'openai/whisper-1',
        input_audio: { data: await blobToBase64(blob), format: audioFormat(blob.type) },
        language: (state.config.language || 'pt-BR').slice(0, 2)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `OpenRouter retornou ${response.status}`);
    if (data.text?.trim()) addTranscription(data.text.trim());
  } finally {
    state.isTranscribing = false;
    elements.transcriptionStatus.textContent = state.isAudioCapturing ? 'Ouvindo...' : 'Pausado';
  }
}

function audioFormat(mimeType) {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function addTranscription(text) {
  const now = Date.now();
  state.transcriptSegments.push({ text, timestamp: now });
  state.transcriptSegments = state.transcriptSegments.filter(item => now - item.timestamp < 3 * 60 * 1000);
  state.currentTranscription = state.transcriptSegments.map(item => item.text).join(' ');
  updateTranscription(state.currentTranscription);
  state.transcriptionHistory.push({ type: 'transcription', content: text, timestamp: new Date().toISOString() });
  window.electronAPI.sendTranscriptionResult(text);
  scheduleAutoSuggestion(1200);
}

async function startScreenCapture() {
  const shouldRetry = await captureScreenFrame();
  if (shouldRetry) state.screenTimer = setInterval(captureScreenFrame, SCREEN_CAPTURE_MS);
}

async function captureScreenFrame() {
  try {
    const result = await window.electronAPI.captureScreenFrame();
    if (!result.ok) {
      const shouldRetry = window.ScreenAccess.canRetryScreenCapture(result.status);
      setScreenAccessBlocked(!shouldRetry);
      updateStatusItem(elements.screenStatus, false, 'Sem acesso');
      if (!state.screenCaptureFailed) {
        logger.error(`Captura de tela indisponível (${result.status}): ${result.error || 'permissão necessária'}`);
      }
      state.screenCaptureFailed = true;
      if (!shouldRetry) clearInterval(state.screenTimer);
      return shouldRetry;
    }

    const jpegBase64 = result.image;
    const nextFingerprint = fingerprint(jpegBase64);
    const changed = nextFingerprint !== state.screenFingerprint;
    state.latestScreenFrame = `data:image/jpeg;base64,${jpegBase64}`;
    state.screenFingerprint = nextFingerprint;
    state.screenCaptureFailed = false;
    setScreenAccessBlocked(false);
    updateStatusItem(elements.screenStatus, true, 'Ativa');
    if (changed) scheduleAutoSuggestion(state.currentTranscription ? 3000 : 5000);
    return true;
  } catch (error) {
    updateStatusItem(elements.screenStatus, false, 'Sem acesso');
    if (!state.screenCaptureFailed) logger.error(`Falha na captura de tela: ${error.message}`);
    state.screenCaptureFailed = true;
    return true;
  }
}

function setScreenAccessBlocked(isBlocked) {
  state.screenCaptureBlocked = isBlocked;
  elements.screenStatus.classList.toggle('actionable', isBlocked);
  elements.screenStatus.title = isBlocked
    ? 'Clique para abrir as permissões de Gravação de Tela'
    : 'Status da captura de tela';

  if (isBlocked) {
    reportOnce(
      'screen-permission',
      'Tela bloqueada. Clique em “Tela: Sem acesso”, autorize o app e reinicie.',
      'warning'
    );
  }
}

async function openScreenPrivacySettings() {
  if (!state.screenCaptureBlocked) return;
  try {
    const result = await window.electronAPI.openScreenPrivacySettings();
    if (result.opened) {
      showToast(`Ative “${result.appName}” em Gravação de Tela e reinicie o app.`, 'info');
    }
  } catch (error) {
    logger.error(`Não foi possível abrir os Ajustes do Sistema: ${error.message}`);
  }
}

function fingerprint(value) {
  let hash = 2166136261;
  const step = Math.max(1, Math.floor(value.length / 128));
  for (let index = 0; index < value.length; index += step) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function scheduleAutoSuggestion(delay) {
  if (!hasOpenRouterKey()) return;
  clearTimeout(state.suggestionTimer);
  const throttle = Math.max(0, MIN_SUGGESTION_INTERVAL_MS - (Date.now() - state.lastSuggestionAt));
  state.suggestionTimer = setTimeout(generateAutoSuggestion, Math.max(delay, throttle));
}

async function generateAutoSuggestion() {
  if (!state.isLLMReady || !hasOpenRouterKey()) return;
  if (!window.AssistantModes.hasAssistantContext({
    transcript: state.currentTranscription,
    screenFrame: state.latestScreenFrame
  })) return;
  const contextFingerprint = `${state.assistantMode}:${state.screenFingerprint}:${state.currentTranscription}`;
  if (contextFingerprint === state.lastSuggestionFingerprint) return;

  state.lastSuggestionAt = Date.now();
  state.isLLMReady = false;
  updateLLMStatus('Analisando...', true);
  try {
    const prompt = window.AssistantModes.buildAssistantPrompt({
      mode: state.assistantMode,
      transcript: state.currentTranscription,
      hasScreen: Boolean(state.latestScreenFrame)
    });
    const response = await callLLM(prompt, state.latestScreenFrame);
    displayResponse(response);
    state.lastSuggestionFingerprint = contextFingerprint;
    state.transcriptionHistory.push({ type: 'response', content: response, timestamp: new Date().toISOString() });
    window.electronAPI.sendLlmResponse(response);
  } catch (error) {
    handleContextError('assistente', error);
  } finally {
    state.isLLMReady = true;
    updateLLMStatus('Pronto', false);
  }
}

async function sendManualQuestion() {
  const question = elements.manualInput.value.trim();
  if (!question || !state.isLLMReady) return;
  elements.manualInput.value = '';
  state.isLLMReady = false;
  elements.responseText.innerHTML = '<p class="placeholder-text">Gerando resposta...</p>';
  updateLLMStatus('Analisando...', true);

  try {
    const prompt = window.AssistantModes.buildAssistantPrompt({
      mode: state.assistantMode,
      transcript: state.currentTranscription,
      question,
      hasScreen: Boolean(state.latestScreenFrame)
    });
    const response = await callLLM(prompt, state.latestScreenFrame);
    displayResponse(response);
    state.transcriptionHistory.push(
      { type: 'question', content: question, timestamp: new Date().toISOString() },
      { type: 'response', content: response, timestamp: new Date().toISOString() }
    );
  } catch (error) {
    handleContextError('assistente', error);
    elements.responseText.innerHTML = '<p class="placeholder-text">Não foi possível gerar a resposta.</p>';
  } finally {
    state.isLLMReady = true;
    updateLLMStatus('Pronto', false);
  }
}

async function callLLM(prompt, screenFrame) {
  if (!hasOpenRouterKey()) throw new Error('Configure a chave OpenRouter.');
  const content = [{ type: 'text', text: prompt }];
  if (screenFrame) content.push({ type: 'image_url', image_url: { url: screenFrame } });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.config.openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://newperssua.com',
      'X-Title': 'New Perssua'
    },
    body: JSON.stringify({
      model: state.config.model || 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Você é um assistente contextual em tempo real. Seja útil, preciso e discreto.' },
        { role: 'user', content }
      ],
      max_tokens: state.assistantMode === 'meeting' ? 350 : 650,
      temperature: 0.5
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenRouter retornou ${response.status}`);
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('O modelo não retornou conteúdo.');
  return answer;
}

function displayResponse(response) {
  elements.responseText.innerHTML = parseMarkdown(response);
  state.currentResponse = response;
  const container = document.getElementById('response-content');
  container.scrollTop = container.scrollHeight;
}

function parseMarkdown(text) {
  const safe = escapeHtml(text || '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${safe}</p>`;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function updateTranscription(text) {
  elements.transcriptionText.replaceChildren();
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  elements.transcriptionText.appendChild(paragraph);
  const container = document.getElementById('transcription-content');
  container.scrollTop = container.scrollHeight;
}

function updateAudioStatus(isActive) {
  updateStatusItem(elements.audioStatus, isActive, isActive ? 'Ativo' : 'Pausado');
  elements.transcriptionStatus.textContent = isActive
    ? (hasOpenRouterKey() ? 'Ouvindo...' : 'Microfone ativo · configure a chave')
    : 'Pausado';
  elements.btnAudioToggle.classList.toggle('active', isActive);
  elements.btnAudioToggle.title = isActive ? 'Pausar microfone' : 'Retomar microfone';
}

function updateLLMStatus(text, active) {
  updateStatusItem(elements.llmStatusBar, active, text);
}

function updateStatusItem(element, active, text) {
  element.querySelector('.status-dot').classList.toggle('active', active);
  element.querySelector('.status-text').textContent = text;
}

function showSettingsModal() {
  elements.settingsModal.classList.remove('hidden');
}

function hideSettingsModal() {
  elements.settingsModal.classList.add('hidden');
}

async function saveSettings() {
  const configs = {
    openrouterApiKey: elements.configOpenRouterKey.value.trim(),
    llmProvider: 'openrouter',
    model: elements.configModel.value.trim() || 'google/gemini-2.5-flash',
    transcriptionModel: elements.configTranscriptionModel.value.trim() || 'openai/whisper-1',
    language: elements.configLanguage.value,
    opacity: Number(elements.configOpacity.value),
    assistantMode: state.assistantMode,
    showTranscription: elements.configShowTranscription.checked
  };

  try {
    await window.electronAPI.setMultipleConfigs(configs);
    state.config = { ...state.config, ...configs };
    document.body.style.opacity = configs.opacity;
    applyTranscriptionVisibility();
    if (hasOpenRouterKey()) {
      hideSettingsModal();
      state.lastReportedError = '';
      updateLLMStatus('Pronto', false);
      updateAudioStatus(state.isAudioCapturing);
      state.lastSuggestionFingerprint = '';
      scheduleAutoSuggestion(250);
      showToast('Chave salva. A transcrição começará no próximo trecho de áudio.', 'success');
    } else {
      showMissingAPIKeyState();
    }
  } catch (error) {
    showToast(`Erro ao salvar: ${error.message}`, 'error');
  }
}

function hasOpenRouterKey() {
  return Boolean(state.config.openrouterApiKey?.trim());
}

function showMissingAPIKeyState() {
  updateLLMStatus('Configure a chave', false);
  updateAudioStatus(state.isAudioCapturing);
  elements.responseText.innerHTML = '<p class="placeholder-text">O microfone está ativo, mas a transcrição precisa de uma OpenRouter API Key. Informe a chave nas configurações.</p>';
  showSettingsModal();
}

function applyTranscriptionVisibility() {
  elements.transcriptionSection.style.display = state.config.showTranscription === false ? 'none' : '';
}

function copyLastResponse() {
  if (!state.currentResponse) return showToast('Nenhuma resposta para copiar.', 'warning');
  navigator.clipboard.writeText(state.currentResponse)
    .then(() => showToast('Resposta copiada.', 'success'))
    .catch(error => showToast(`Erro ao copiar: ${error.message}`, 'error'));
}

function handleContextError(area, error) {
  const message = `Erro no ${area}: ${error.message}`;
  reportOnce(message, message, 'error');
  logger.error(message);
}

function reportOnce(key, message, type) {
  if (state.lastReportedError === key) return;
  state.lastReportedError = key;
  showToast(message, type);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function updateVersion() {
  try {
    elements.appVersion.textContent = await window.electronAPI.getAppVersion();
  } catch (error) {
    logger.error('Erro ao obter versão: ' + error.message);
  }
}

window.addEventListener('beforeunload', () => {
  clearInterval(state.screenTimer);
  clearTimeout(state.suggestionTimer);
  stopAudioCapture();
});

window.onerror = (message, source, lineno, colno, error) => {
  logger.error(`Erro global: ${message} (${source}:${lineno}:${colno})`);
  window.electronAPI.reportError({ message, source, lineno, colno, stack: error?.stack });
};
