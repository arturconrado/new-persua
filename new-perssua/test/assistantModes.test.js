const assert = require('node:assert/strict');
const { ASSISTANT_MODES, normalizeAssistantMode, buildAssistantPrompt } = require('../src/context/assistantModes');

assert.deepEqual(Object.keys(ASSISTANT_MODES), ['meeting', 'study']);
assert.equal(normalizeAssistantMode('anything-else'), 'meeting');

const meetingPrompt = buildAssistantPrompt({ mode: 'meeting', transcript: 'O prazo é sexta.', hasScreen: true });
assert.match(meetingPrompt, /sugestão de fala ou ação/i);
assert.match(meetingPrompt, /O prazo é sexta/);
assert.match(meetingPrompt, /captura de tela anexada/i);

const studyPrompt = buildAssistantPrompt({ mode: 'study', question: 'Explique este gráfico.' });
assert.match(studyPrompt, /sessão de estudo/i);
assert.match(studyPrompt, /Explique este gráfico/);

console.log('assistantModes: ok');
