/**
 * MCP Server - Model Context Protocol Server
 * 
 * Este é o orquestrador central do ABBA. Ele gerencia:
 * - Comunicação entre agentes
 * - Contexto e memória de cada agente
 * - Protocolos de mensagens
 * - Pipeline de processamento
 */

class MCPServer {
    constructor() {
      // Armazena protocolos de comunicação disponíveis
      this.protocols = new Map();
      
      // Contexto de cada agente (memória, estado, etc)
      this.contexts = new Map();
      
      // Registro de agentes disponíveis
      this.agents = new Map();
      
      // Histórico de mensagens para debug
      this.messageHistory = [];
      
      console.log('MCP Server initialized');
    }
  
    /**
     * Registra um novo protocolo de comunicação
     * Protocolos definem como agentes trocam mensagens
     */
    registerProtocol(name, handler) {
      this.protocols.set(name, handler);
      console.log(`Protocol registered: ${name}`);
    }
  
    /**
     * Cria contexto para um agente
     * Contexto é a memória e estado do agente
     */
    createContext(agentId) {
      const context = {
        id: agentId,
        memory: [],        // Histórico de interações
        tools: [],         // Ferramentas disponíveis
        state: {},         // Estado atual do agente
        metadata: {},      // Metadados adicionais
        created: new Date(),
        lastActive: new Date()
      };
      
      this.contexts.set(agentId, context);
      return context;
    }
  
    /**
     * Atualiza contexto de um agente
     */
    updateContext(agentId, updates) {
      const context = this.contexts.get(agentId);
      if (!context) {
        throw new Error(`Context not found for agent: ${agentId}`);
      }
      
      Object.assign(context, updates);
      context.lastActive = new Date();
      this.contexts.set(agentId, context);
    }
  
    /**
     * Processa mensagem através de um protocolo específico
     */
    async processMessage(protocol, message) {
      const handler = this.protocols.get(protocol);
      if (!handler) {
        throw new Error(`Protocol ${protocol} not found`);
      }
      
      // Log para debug
      this.messageHistory.push({
        protocol,
        message,
        timestamp: new Date()
      });
      
      return await handler(message);
    }
  
    /**
     * MÉTODO PRINCIPAL: Orquestra comunicação entre agentes
     * Este é o coração do MCP - coordena agentes trabalhando juntos
     */
    async orchestrate(fromAgent, toAgent, message) {
      console.log(`\n Orchestrating: ${fromAgent} -> ${toAgent}`);
      
      // Verifica se o agente destino existe
      const agent = this.agents.get(toAgent);
      if (!agent) {
        throw new Error(`Agent ${toAgent} not found`);
      }
      
      // Obtém ou cria contexto para o agente
      let context = this.contexts.get(toAgent);
      if (!context) {
        context = this.createContext(toAgent);
      }
      
      // Adiciona mensagem à memória do agente
      context.memory.push({
        from: fromAgent,
        message,
        timestamp: new Date()
      });
      
      // Processa mensagem através do agente
      try {
        const response = await agent.process(message, context);
        
        // Atualiza contexto com resposta
        context.memory.push({
          from: toAgent,
          response,
          timestamp: new Date()
        });
        
        return response;
      } catch (error) {
        console.error(`Error in agent ${toAgent}:`, error);
        throw error;
      }
    }
  
    /**
     * Registra um agente no sistema
     */
    registerAgent(id, agent) {
      this.agents.set(id, agent);
      this.createContext(id);
      console.log(`Agent registered: ${id}`);
    }
  
    /**
     * Obtém status do sistema
     */
    getStatus() {
      return {
        agents: Array.from(this.agents.keys()),
        protocols: Array.from(this.protocols.keys()),
        contexts: this.contexts.size,
        messages: this.messageHistory.length
      };
    }
  }
  
  module.exports = MCPServer;