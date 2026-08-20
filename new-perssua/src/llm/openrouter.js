/**
 * New Perssua - OpenRouter LLM Integration
 * Integração exclusiva com OpenRouter API para acesso a múltiplos modelos (GPT-4, Claude, etc.)
 * Documentação: https://openrouter.ai/docs
 */

class OpenRouterLLM {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
    this.model = options.model || 'openai/gpt-4-turbo';
    this.maxTokens = options.maxTokens || 500;
    this.temperature = options.temperature || 0.7;
    
    // Site URL e nome para ranking no OpenRouter
    this.siteUrl = options.siteUrl || 'https://newperssua.com';
    this.siteName = options.siteName || 'New Perssua';
    
    if (!this.apiKey) {
      console.warn('OpenRouter API key não configurada. LLM não funcionará.');
    }
    
    // Cache de modelos disponíveis
    this.availableModels = null;
    this.lastModelFetch = null;
  }

  /**
   * Gerar resposta com streaming
   * @param {string} prompt - Prompt para o modelo
   * @param {Function} onChunk - Callback para cada chunk do stream
   * @returns {Promise<string>} - Resposta completa
   */
  async generateStream(prompt, onChunk) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key não configurada');
    }

    let fullResponse = '';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente de reuniões especializado em fornecer respostas concisas, práticas e acionáveis. Suas respostas devem ser diretas e úteis para uso imediato em conversas profissionais.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                
                // Chamar callback com o chunk
                if (onChunk) {
                  onChunk(content, fullResponse);
                }
              }
            } catch (e) {
              // Ignorar chunks inválidos
            }
          }
        }
      }

      return fullResponse.trim();
    } catch (error) {
      console.error('Erro na geração OpenRouter:', error.message);
      throw new Error(`Falha na geração: ${error.message}`);
    }
  }

  /**
   * Gerar resposta completa (sem streaming)
   * @param {string} prompt - Prompt para o modelo
   * @returns {Promise<string>} - Resposta completa
   */
  async generate(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key não configurada');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente de reuniões especializado em fornecer respostas concisas, práticas e acionáveis. Suas respostas devem ser diretas e úteis para uso imediato em conversas profissionais.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Erro na geração OpenRouter:', error.message);
      throw new Error(`Falha na geração: ${error.message}`);
    }
  }

  /**
   * Gerar sugestão automática baseada no contexto da reunião
   * @param {string} context - Contexto/transcrição recente da reunião
   * @returns {Promise<string>} - Sugestão gerada
   */
  async generateAutoSuggestion(context) {
    const prompt = `Com base nesta transcrição de reunião, sugira uma resposta ou ação apropriada:

${context}

Forneça UMA sugestão prática e concisa que eu possa usar imediatamente na reunião.`;

    return this.generate(prompt);
  }

  /**
   * Gerar resumo da reunião
   * @param {string} fullTranscript - Transcrição completa da reunião
   * @returns {Promise<string>} - Resumo estruturado
   */
  async generateSummary(fullTranscript) {
    const prompt = `Resuma esta reunião em tópicos claros:

${fullTranscript}

Estruture o resumo como:
- **Objetivo**: Qual era o objetivo da reunião
- **Pontos principais**: 3-5 pontos chave discutidos
- **Decisões tomadas**: Decisões importantes
- **Próximos passos**: Ações e responsáveis`;

    return this.generate(prompt);
  }

  /**
   * Extrair action items da reunião
   * @param {string} transcript - Transcrição da reunião
   * @returns {Promise<Array>} - Lista de action items
   */
  async extractActionItems(transcript) {
    const prompt = `Extraia todos os action items (tarefas/ações) desta transcrição:

${transcript}

Liste cada action item com:
- O que deve ser feito
- Quem é responsável (se mencionado)
- Prazo (se mencionado)

Formato: - [ ] Tarefa (Responsável) - Prazo`;

    const response = await this.generate(prompt);
    
    // Parse simples da resposta
    const lines = response.split('\n').filter(line => line.trim().startsWith('-'));
    return lines.map(line => line.replace(/^- \[\] /, '').trim());
  }

  /**
   * Verificar saúde da API
   */
  async healthCheck() {
    try {
      await this.generate('Responda apenas "OK"');
      return { status: 'ok', message: 'API funcionando' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message
      };
    }
  }

  /**
   * Obter lista de modelos disponíveis
   * @returns {Promise<Array>} - Lista de modelos
   */
  async getAvailableModels() {
    // Cache por 1 hora
    const now = Date.now();
    if (this.availableModels && this.lastModelFetch && (now - this.lastModelFetch) < 3600000) {
      return this.availableModels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      this.availableModels = data.data || [];
      this.lastModelFetch = now;
      
      return this.availableModels;
    } catch (error) {
      console.error('Erro ao buscar modelos:', error.message);
      return [];
    }
  }

  /**
   * Obter custo estimado do modelo atual
   * Preços do OpenRouter são por 1K tokens
   */
  async getEstimatedCost(inputTokens, outputTokens) {
    try {
      const models = await this.getAvailableModels();
      const modelInfo = models.find(m => m.id === this.model);
      
      if (modelInfo && modelInfo.pricing) {
        const pricing = modelInfo.pricing;
        const inputCost = (inputTokens * pricing.prompt) / 1000;
        const outputCost = (outputTokens * pricing.completion) / 1000;
        const totalCost = inputCost + outputCost;

        return {
          inputTokens,
          outputTokens,
          costUSD: totalCost.toFixed(6),
          costBRL: (totalCost * 5).toFixed(6),
          modelPricing: pricing
        };
      }

      // Estimativa fallback (preço médio GPT-4)
      const fallbackPricing = { prompt: 0.01, completion: 0.03 };
      const inputCost = (inputTokens * fallbackPricing.prompt) / 1000;
      const outputCost = (outputTokens * fallbackPricing.completion) / 1000;
      
      return {
        inputTokens,
        outputTokens,
        costUSD: ((inputCost + outputCost) / 1000).toFixed(6),
        costBRL: ((inputCost + outputCost) * 5 / 1000).toFixed(6)
      };
    } catch (error) {
      return {
        inputTokens,
        outputTokens,
        costUSD: 'N/A',
        costBRL: 'N/A'
      };
    }
  }

  /**
   * Contar tokens aproximados (estimativa simples)
   * 1 token ≈ 4 caracteres em inglês, ≈ 2-3 em português
   */
  countTokens(text) {
    // Estimativa conservadora para português
    return Math.ceil(text.length / 3);
  }

  /**
   * Atualizar configuração
   */
  updateConfig(options) {
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.model) this.model = options.model;
    if (options.maxTokens) this.maxTokens = options.maxTokens;
    if (options.temperature) this.temperature = options.temperature;
    if (options.baseUrl) this.baseUrl = options.baseUrl;
  }
}

module.exports = OpenRouterLLM;
