/**
 * Interpreter Agent - Entende linguagem natural e extrai intenções
 */

class InterpreterAgent {
    constructor() {
      this.id = 'interpreter';
      
      // Dicionário de capacidades (palavras-chave)
      this.capabilityKeywords = {
        email: ['email', 'e-mail', 'gmail', 'outlook', 'enviar', 'responder', 'mensagem'],
        calendar: ['calendário', 'agenda', 'reunião', 'meeting', 'agendar', 'marcar'],
        whatsapp: ['whatsapp', 'whats', 'zap', 'mensagem', 'cliente'],
        database: ['banco de dados', 'database', 'sql', 'consultar', 'buscar', 'dados'],
        api: ['api', 'endpoint', 'rest', 'integração', 'webhook'],
        automation: ['automatizar', 'automação', 'automático', 'rotina', 'processo'],
        analysis: ['analisar', 'análise', 'relatório', 'dashboard', 'métricas', 'insights'],
        support: ['suporte', 'atendimento', 'cliente', 'ajuda', 'responder'],
        code: ['código', 'programar', 'desenvolvimento', 'bug', 'feature', 'revisar']
      };
      
      // Tipos de agentes
      this.agentTypes = {
        support: ['suporte', 'atendimento', 'ajuda', 'cliente', 'responder'],
        sales: ['vendas', 'vender', 'comercial', 'lead', 'proposta', 'negócio'],
        analyst: ['análise', 'analisar', 'relatório', 'dados', 'insights', 'métricas'],
        assistant: ['assistente', 'ajudante', 'auxiliar', 'secretária', 'organizar'],
        developer: ['código', 'programar', 'desenvolvimento', 'revisar', 'bug'],
        monitor: ['monitorar', 'observar', 'alertar', 'avisar', 'notificar']
      };
      
      // Métodos de entrega
      this.deliveryKeywords = {
        whatsapp: ['whatsapp', 'whats', 'zap'],
        telegram: ['telegram'],
        email: ['email', 'e-mail'],
        api: ['api', 'endpoint', 'integração'],
        web: ['site', 'web', 'browser', 'navegador'],
        slack: ['slack'],
        discord: ['discord']
      };
    }
  
    /**
     * Processa mensagem e extrai todas as informações
     */
    async process(message, context) {
      const description = message.originalDescription || message;
      
      console.log('INTERPRETER: Analyzing description...');
      console.log('Input:', description);
      
      // Análise completa da descrição
      const interpretation = {
        // Dados originais
        originalDescription: description,
        
        // Análise de capacidades
        capabilities: this.extractCapabilities(description),
        
        // Tipo de agente
        agentType: this.identifyAgentType(description),
        
        // Métodos de entrega
        deliveryMethods: this.extractDeliveryMethods(description),
        
        // Complexidade estimada
        complexity: this.assessComplexity(description),
        
        // Nome sugerido
        suggestedName: this.suggestName(description),
        
        // Ferramentas necessárias
        tools: this.identifyRequiredTools(description),
        
        // Análise adicional
        language: 'pt-BR',
        wordCount: description.split(' ').length,
        hasUrgency: this.detectUrgency(description),
        industry: this.detectIndustry(description)
      };
      
      console.log('INTERPRETER: Analysis complete');
      console.log('Found capabilities:', interpretation.capabilities);
      console.log('Agent type:', interpretation.agentType);
      console.log('Delivery methods:', interpretation.deliveryMethods);
      
      return interpretation;
    }
  
    /**
     * Extrai capacidades da descrição
     */
    extractCapabilities(text) {
      const found = new Set();
      const lowerText = text.toLowerCase();
      
      for (const [capability, keywords] of Object.entries(this.capabilityKeywords)) {
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            found.add(capability);
            break;
          }
        }
      }
      
      return found.size > 0 ? Array.from(found) : ['general'];
    }
  
    /**
     * Identifica o tipo de agente
     */
    identifyAgentType(text) {
      const lowerText = text.toLowerCase();
      let bestMatch = 'assistant';
      let maxMatches = 0;
      
      for (const [type, keywords] of Object.entries(this.agentTypes)) {
        let matches = 0;
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            matches++;
          }
        }
        
        if (matches > maxMatches) {
          maxMatches = matches;
          bestMatch = type;
        }
      }
      
      return bestMatch;
    }
  
    /**
     * Extrai métodos de entrega
     */
    extractDeliveryMethods(text) {
      const found = new Set();
      const lowerText = text.toLowerCase();
      
      for (const [method, keywords] of Object.entries(this.deliveryKeywords)) {
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            found.add(method);
            break;
          }
        }
      }
      
      // Se não encontrou nenhum, usa API como padrão
      return found.size > 0 ? Array.from(found) : ['api'];
    }
  
    /**
     * Avalia complexidade baseado em vários fatores
     */
    assessComplexity(text) {
      const wordCount = text.split(' ').length;
      const capabilities = this.extractCapabilities(text);
      const hasIntegration = text.toLowerCase().includes('integr');
      const hasMultipleSteps = text.includes(' e ') || text.includes(', ');
      
      // Pontuação de complexidade
      let score = 0;
      score += wordCount > 50 ? 2 : wordCount > 20 ? 1 : 0;
      score += capabilities.length > 3 ? 2 : capabilities.length > 1 ? 1 : 0;
      score += hasIntegration ? 1 : 0;
      score += hasMultipleSteps ? 1 : 0;
      
      if (score >= 4) return 'complex';
      if (score >= 2) return 'medium';
      return 'simple';
    }
  
    /**
     * Sugere nome baseado no tipo e capacidades
     */
    suggestName(text) {
      const type = this.identifyAgentType(text);
      const capabilities = this.extractCapabilities(text);
      
      const typeNames = {
        support: 'Support',
        sales: 'Sales',
        analyst: 'Analytics',
        assistant: 'Assistant',
        developer: 'Dev',
        monitor: 'Monitor'
      };
      
      const baseName = typeNames[type] || 'Agent';
      const mainCapability = capabilities[0] !== 'general' ? 
        capabilities[0].charAt(0).toUpperCase() + capabilities[0].slice(1) : '';
      
      const timestamp = Date.now().toString().slice(-4);
      
      return mainCapability ? 
        `${baseName}_${mainCapability}_${timestamp}` : 
        `${baseName}_${timestamp}`;
    }
  
    /**
     * Identifica ferramentas necessárias
     */
    identifyRequiredTools(text) {
      const tools = new Set();
      const lowerText = text.toLowerCase();
      
      // Mapeia capacidades para ferramentas
      if (this.capabilityKeywords.email.some(k => lowerText.includes(k))) {
        tools.add('email_sender');
        tools.add('email_reader');
      }
      
      if (this.capabilityKeywords.calendar.some(k => lowerText.includes(k))) {
        tools.add('calendar_manager');
        tools.add('calendar_reader');
      }
      
      if (this.capabilityKeywords.database.some(k => lowerText.includes(k))) {
        tools.add('database_query');
        tools.add('database_writer');
      }
      
      if (this.capabilityKeywords.whatsapp.some(k => lowerText.includes(k))) {
        tools.add('whatsapp_sender');
        tools.add('whatsapp_receiver');
      }
      
      if (this.capabilityKeywords.api.some(k => lowerText.includes(k))) {
        tools.add('http_client');
        tools.add('webhook_handler');
      }
      
      return Array.from(tools);
    }
  
    /**
     * Detecta urgência na descrição
     */
    detectUrgency(text) {
      const urgencyKeywords = ['urgente', 'agora', 'imediato', 'rápido', 'hoje', 'asap'];
      const lowerText = text.toLowerCase();
      return urgencyKeywords.some(keyword => lowerText.includes(keyword));
    }
  
    /**
     * Detecta indústria/setor
     */
    detectIndustry(text) {
      const industries = {
        ecommerce: ['loja', 'produto', 'venda', 'cliente', 'pedido', 'compra'],
        finance: ['banco', 'financeiro', 'pagamento', 'cobrança', 'invoice'],
        health: ['saúde', 'médico', 'paciente', 'consulta', 'hospital'],
        education: ['escola', 'aluno', 'professor', 'curso', 'aula'],
        tech: ['software', 'código', 'desenvolvimento', 'bug', 'deploy']
      };
      
      const lowerText = text.toLowerCase();
      
      for (const [industry, keywords] of Object.entries(industries)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          return industry;
        }
      }
      
      return 'general';
    }
  }
  
  module.exports = InterpreterAgent;