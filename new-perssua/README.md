# 🎯 New Perssua - Assistente de Reunião Invisível

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Overlay desktop invisível com transcrição em tempo real e IA via OpenRouter**

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Atalhos de Teclado](#-atalhos-de-teclado)
- [OpenRouter - Único Provedor](#-openrouter---único-provedor)
- [Troubleshooting](#-troubleshooting)
- [Teste de Invisibilidade](#-teste-de-invisibilidade)
- [FAQ](#-faq)

---

## 🌟 Visão Geral

O **New Perssua** é um assistente contextual que funciona como overlay no desktop. Ao abrir, ele usa o microfone padrão e observa a tela principal, transcreve a fala e gera sugestões via **OpenRouter** de acordo com o modo Reunião ou Estudo.

### Casos de Uso:
- ✅ Entrevistas de emprego
- ✅ Reuniões de vendas
- ✅ Negociações importantes
- ✅ Reuniões técnicas
- ✅ Calls com clientes
- ✅ Aulas e sessões de estudo

---

## ✨ Funcionalidades

### Overlay Invisível
- Janela transparente que não aparece em gravações de tela
- `setContentProtection(true)` bloqueia captura via screenshot
- Nível `'screen-saver'` garante que fique acima de tudo
- `showInactive()` não rouba foco do aplicativo ativo

### Captura de Áudio
- Inicia automaticamente com o microfone padrão
- Usa cancelamento de eco e redução de ruído do sistema
- Visualização de waveform em tempo real

### Contexto Visual
- Captura reduzida da tela principal a cada poucos segundos
- Análise multimodal combinando tela e fala recente
- Orientação clara para liberar Gravação de Tela no macOS

### Transcrição em Tempo Real
- Endpoint de transcrição do OpenRouter usando a mesma API key
- Idioma configurável
- Buffer de contexto inteligente (últimos 2-3 minutos)

### Integração com LLM via OpenRouter
- **Único provedor**: OpenRouter (chave única para +100 modelos)
- **Modelos disponíveis**: GPT-4, Claude-3, Llama-3, Mistral, Gemini, etc.
- Streaming de respostas em tempo real
- Prompt dinâmico com contexto da reunião

### Modos de Operação
- **Reunião**: sugere falas, decisões e próximos passos
- **Estudo**: explica conceitos, resume e cria anotações

### Atalhos Globais
- Ctrl/Cmd + B: Mostrar/Ocultar overlay
- Ctrl/Cmd + K: Focar input manual
- Ctrl/Cmd + Shift + S: Toggle captura de áudio
- Ctrl/Cmd + Shift + M: Alternar modo
- Ctrl/Cmd + Shift + C: Copiar última resposta
- Ctrl/Cmd + Q: Sair

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                   Audio Capture Module                   │
│              (Web Audio API / Native APIs)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Transcription Engine                    │
│            (Whisper API ou Whisper.cpp Local)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Context Manager                        │
│         (Buffer das últimas 500 tokens / 2-3 min)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    LLM Integration                       │
│    (OpenAI GPT-4 / Anthropic Claude / Ollama Local)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Overlay UI                            │
│     (Transparente, alwaysOnTop, contentProtection)       │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ ([download](https://nodejs.org/))
- npm ou yarn
- Windows 10/11 ou macOS 11+

### Passos

1. **Clonar repositório** (ou extrair arquivos)
```bash
cd new-perssua
```

2. **Instalar dependências**
```bash
npm install
```

3. **Rodar aplicação**
```bash
npm start
```

### Build para Produção

```bash
# Windows
npm run build

# macOS
npm run build
```

Os binários serão gerados na pasta `dist/`.

---

## ⚙️ Configuração

### Via Interface (Recomendado)

1. Abra o app (Ctrl/Cmd + B se não aparecer)
2. Clique no ícone de engrenagem ⚙️
3. Preencha as configurações:
   - **OpenRouter API Key**: Cole sua chave do OpenRouter
   - **Modelo**: Selecione entre GPT-4, Claude-3, Llama-3, etc.
   - **Idioma**: pt-BR, en-US, etc.
   - **Opacidade**: Ajuste transparência da janela

### Obter API Keys

#### OpenRouter (Único Provedor Necessário)
1. Acesse https://openrouter.ai/keys
2. Faça login/crie conta
3. Clique em "Create Key"
4. Copie e cole no app

---

## 🎮 Uso

### Primeiros Passos

1. **Inicie o app**: `npm start`
2. **Configure API Key**: Clique em ⚙️ e preencha
3. **Autorize o acesso**: Libere Microfone e Gravação de Tela quando solicitado
4. **Escolha o modo**: Reunião ou Estudo
5. **Comece**: A captura já estará ativa

### Durante a Reunião

- **Ver transcrição**: Olhe para o painel superior
- **Ver sugestões**: Painel inferior mostra respostas da IA
- **Fazer pergunta manual**: Ctrl/Cmd + K, digite, Enter
- **Copiar sugestão**: Ctrl/Cmd + Shift + C

### Após a Reunião

- **Exportar histórico**: Ctrl/Cmd + Shift + E
- **Limpar contexto**: Botão "Nova Reunião" nas configurações

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl/Cmd + B` | Mostrar/Ocultar overlay |
| `Ctrl/Cmd + K` | Focar input manual |
| `Ctrl/Cmd + Shift + S` | Iniciar/Parar captura de áudio |
| `Ctrl/Cmd + Shift + M` | Alternar modo (Reunião/Estudo) |
| `Ctrl/Cmd + Shift + C` | Copiar última resposta |
| `Ctrl/Cmd + H` | Ocultar rapidamente |
| `Ctrl/Cmd + Shift + E` | Exportar histórico |
| `Ctrl/Cmd + Q` | Sair do aplicativo |

---

## 🔌 OpenRouter - Único Provedor

O New Perssua usa **exclusivamente o OpenRouter** como provedor de LLM. Isso simplifica a configuração e dá acesso a mais de 100 modelos com uma única chave de API.

### O que é OpenRouter?

OpenRouter é uma plataforma que unifica o acesso a múltiplos modelos de IA (GPT-4, Claude, Llama, Gemini, etc.) através de uma única API. Você paga apenas pelo que usa, sem necessidade de múltiplas assinaturas.

### Vantagens:
- ✅ **Uma única chave**: Acesse todos os modelos com uma API key
- ✅ **Preço competitivo**: Pague por uso, sem mensalidades fixas
- ✅ **Modelos variados**: GPT-4, Claude-3, Llama-3, Mistral, Gemini, e +100 outros
- ✅ **Sem lock-in**: Troque de modelo facilmente nas configurações

### Como Obter API Key:

1. Acesse https://openrouter.ai/keys
2. Crie uma conta ou faça login
3. Clique em "Create Key"
4. Copie a chave (começa com `sk-or-`)
5. Cole no app (via UI ou `.env`)

### Modelos Recomendados:

| Modelo | Uso Ideal | Custo (1K tokens) | Latência |
|--------|-----------|-------------------|----------|
| `openai/gpt-4-turbo` | Respostas rápidas e precisas | $0.01 | ~1-2s |
| `anthropic/claude-3-opus` | Análise profunda | $0.015 | ~2-4s |
| `anthropic/claude-3-sonnet` | Equilíbrio custo/benefício | $0.003 | ~1-3s |
| `meta-llama/llama-3-70b-instruct` | Open-source potente | $0.0008 | ~2-5s |
| `google/gemini-pro-1.5` | Contexto longo | $0.00025 | ~1-3s |

### Configurar Modelo:

**Via UI:**
1. Clique em ⚙️ Configurações
2. Em "Modelo", selecione o desejado
3. Salve

**Via `.env`:**
```env
LLM_MODEL=anthropic/claude-3-sonnet
```

### Custos Estimados:

Para uso moderado (2 horas de reunião/dia):
- **Transcrição (Whisper)**: ~$0.72/dia → ~$22/mês
- **LLM (GPT-4 Turbo)**: ~$0.30/dia → ~$9/mês
- **Total estimado**: ~$31/mês

Use modelos mais baratos (Llama-3, Gemini) para reduzir custos para ~$5/mês.

### Links Úteis:
- [Lista completa de modelos](https://openrouter.ai/models)
- [Documentação da API](https://openrouter.ai/docs)
- [Ranking de modelos](https://openrouter.ai/rankings)

---

## 🐛 Troubleshooting

### Problema 1: Overlay visível no Zoom/Teams
**Solução**: Verifique se as configurações estão corretas:
- `transparent: true`
- `frame: false`
- `hasShadow: false`
- `alwaysOnTop: true` com nível `'screen-saver'`
- `setContentProtection(true)` está sendo chamado

Teste abrindo o Photo Booth (macOS) ou Camera (Windows) e veja se a janela aparece.

### Problema 2: Áudio não está sendo capturado
**Windows**: confirme o acesso ao microfone nas configurações de Privacidade.

**macOS**: autorize o app em Ajustes do Sistema > Privacidade e Segurança > Microfone.

### Problema 3: Erro "API key não configurada"
**Solução**:
1. Abra as configurações pelo ícone de engrenagem
2. Confirme que a chave `OpenRouter API Key` está preenchida
3. Salve; a captura não precisa ser reiniciada

### Problema 4: Atalhos não funcionam
**Solução**:
- Feche outros apps que podem estar usando os mesmos atalhos
- No macOS, verifique System Preferences > Keyboard > Shortcuts
- Altere os atalhos nas configurações do app

### Problema 5: App consome muita CPU/RAM
**Solução**:
- Reduza frequência de chunks de áudio (de 5s para 10s)
- Use Whisper local em vez de API
- Diminua tamanho do buffer de contexto

---

## 🧪 Teste de Invisibilidade

### Método 1: Photo Booth / Camera
1. Abra o New Perssua
2. Posicione o overlay em um canto
3. Abra Photo Booth (macOS) ou Camera (Windows)
4. **Resultado esperado**: Overlay NÃO deve aparecer na câmera

### Método 2: Gravação de Tela
1. Inicie gravação de tela (QuickTime, OBS, etc.)
2. Mostre o overlay
3. Assista a gravação
4. **Resultado esperado**: Overlay NÃO deve aparecer no vídeo

### Método 3: Compartilhamento no Zoom
1. Inicie uma reunião solo no Zoom
2. Compartilhe sua tela
3. Abra o New Perssua
4. Use outro dispositivo para ver como está aparecendo
5. **Resultado esperado**: Overlay NÃO deve ser visível

---

## ❓ FAQ

### É seguro usar em entrevistas?
Sim, o overlay é projetado para ser indetectável. Porém, use com responsabilidade e ética.

### Funciona offline?
Parcialmente. A transcrição requer API (Whisper), mas você pode configurar Whisper local para privacidade total. O LLM requer conexão para OpenRouter.

### Qual o custo mensal estimado?
Para uso moderado (2 horas de reunião/dia):
- **Whisper API**: ~$0.72/dia → ~$22/mês
- **OpenRouter (GPT-4 Turbo)**: ~$0.30/dia → ~$9/mês
- **Total estimado**: ~$31/mês

Use modelos mais baratos no OpenRouter (Llama-3, Gemini) para reduzir custos para ~$5/mês.

### Posso personalizar os prompts?
Sim, edite `src/llm/openrouter.js` ou o prompt no `renderer.js` para ajustar o system prompt.

### Como exportar o histórico?
Use Ctrl/Cmd + Shift + E ou clique no botão de exportar nas configurações. O arquivo será salvo em Markdown.

### Qual modelo do OpenRouter devo usar?
- **Melhor qualidade**: `anthropic/claude-3-opus` ou `openai/gpt-4-turbo`
- **Custo-benefício**: `anthropic/claude-3-sonnet`
- **Mais barato**: `meta-llama/llama-3-70b-instruct` ou `google/gemini-pro-1.5`

---

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

<div align="center">

**New Perssua** - Seu assistente invisível para reuniões

Feito com ❤️ por New Perssua Team

</div>
