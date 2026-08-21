/**
 * Os dois modos operacionais do assistente e seus prompts.
 */
const ASSISTANT_MODES = {
  meeting: {
    label: 'Reunião',
    system: 'Você acompanha uma reunião em tempo real. Sugira falas curtas, diretas e naturais, destaque decisões, riscos e próximos passos. Não invente fatos que não estejam na tela ou na conversa.'
  },
  study: {
    label: 'Estudo',
    system: 'Você acompanha uma sessão de estudo em tempo real. Explique o conceito atual com clareza, resuma os pontos importantes e produza anotações curtas. Não invente fatos que não estejam na tela ou na fala.'
  }
};

function normalizeAssistantMode(mode) {
  return Object.hasOwn(ASSISTANT_MODES, mode) ? mode : 'meeting';
}

function buildAssistantPrompt({ mode, transcript = '', question = '', hasScreen = false }) {
  const selectedMode = normalizeAssistantMode(mode);
  const action = selectedMode === 'meeting'
    ? 'Dê a melhor sugestão de fala ou ação para este momento.'
    : 'Explique ou resuma o que está sendo estudado neste momento.';

  return [
    ASSISTANT_MODES[selectedMode].system,
    hasScreen ? 'Considere também a captura de tela anexada.' : 'A captura de tela ainda não está disponível.',
    `Fala recente: ${transcript.trim() || 'Nenhuma fala transcrita ainda.'}`,
    question.trim() ? `Pedido do usuário: ${question.trim()}` : action,
    'Responda em português do Brasil, de forma concisa e imediatamente útil.'
  ].join('\n\n');
}

if (typeof window !== 'undefined') {
  window.AssistantModes = { ASSISTANT_MODES, normalizeAssistantMode, buildAssistantPrompt };
}

if (typeof module !== 'undefined') {
  module.exports = { ASSISTANT_MODES, normalizeAssistantMode, buildAssistantPrompt };
}
