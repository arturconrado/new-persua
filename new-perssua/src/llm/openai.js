/**
 * New Perssua - OpenAI LLM Integration
 * Integração com GPT-4 e outros modelos OpenAI via streaming
 */

const OpenAI = require('openai');

class OpenAILLM {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.model = options.model || 'gpt-4';
    this.maxTokens = options.maxTokens || 500;
    this.temperature = options.temperature || 0.7;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key não configurada. LLM não funcionará.');
    }
    
    // Inicializar cliente OpenAI
    this.client = null;
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl
      });
    }
  }

  /**
   * Gerar resposta com streaming
   * @param {string} prompt - Prompt para o modelo
   * @param {Function} onChunk - Callback para cada chunk do stream
   * @returns {Promise<string>} - Resposta completa
   */
  async generateStream(prompt, onChunk) {
    if (!this.client) {
      throw new Error('OpenAI API key não configurada');
    }

    let fullResponse = '';

    try {
      const stream = await this.client.chat.completions.create({
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
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          
          // Chamar callback com o chunk
          if (onChunk) {
            onChunk(content, fullResponse);
          }
        }
      }

      return fullResponse.trim();
    } catch (error) {
      console.error('Erro na geração OpenAI:', error.response?.data || error.message);
      throw new Error(`Falha na geração: ${error.message}`);
    }
  }

  /**
   * Gerar resposta completa (sem streaming)
   * @param {string} prompt - Prompt para o modelo
   * @returns {Promise<string>} - Resposta completa
   */
  async generate(prompt) {
    if (!this.client) {
      throw new Error('OpenAI API key não configurada');
    }

    try {
      const response = await this.client.chat.completions.create({
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
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Erro na geração OpenAI:', error.response?.data || error.message);
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
        message: error.message,
        code: error.response?.status 
      };
    }
  }

  /**
   * Obter custo estimado
   * Preços aproximados (por 1K tokens):
   * - gpt-4: $0.03 input, $0.06 output
   * - gpt-4-turbo: $0.01 input, $0.03 output
   * - gpt-3.5-turbo: $0.0005 input, $0.0015 output
   */
  getEstimatedCost(inputTokens, outputTokens) {
    const pricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const prices = pricing[this.model] || pricing['gpt-4'];
    const cost = (inputTokens * prices.input + outputTokens * prices.output) / 1000;

    return {
      inputTokens,
      outputTokens,
      costUSD: cost.toFixed(4),
      costBRL: (cost * 5).toFixed(4)
    };
  }

  /**
   * Contar tokens aproximados (estimativa simples)
   * 1 token ≈ 4 caracteres em inglês, ≈ 2-3 em português
   */
  countTokens(text) {
    // Estimativa conservadora para português
    return Math.ceil(text.length / 3);
  }
}

module.exports = OpenAILLM;
