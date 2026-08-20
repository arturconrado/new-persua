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
    throw new Error('API Key do OpenRouter não configurada. Vá em Configurações e adicione sua chave.');
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
          {
            role: 'system',
            content: 'Você é um assistente de reuniões especializado em fornecer respostas concisas, práticas e acionáveis.'
          },
          {
            role: 'user',
            content: prompt
          }
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
