/**
 * Orchestrator Agent - Coordena o pipeline de criação de agentes
 */

class OrchestratorAgent {
    constructor(mcpServer) {
      this.id = 'orchestrator';
      this.mcp = mcpServer;
      this.pipeline = [];  // Sequência de agentes para processar
    }
  
    /**
     * Define o pipeline de processamento
     * Ex: ['interpreter', 'architect', 'coder']
     */
    setPipeline(agents) {
      this.pipeline = agents;
      console.log(`Pipeline set: ${agents.join(' -> ')}`);
    }
  
    /**
     * Processa uma descrição através do pipeline completo
     */
    async processDescription(description) {
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Starting pipeline');
      console.log('Input:', description);
      console.log('='.repeat(50));
      
      // Começa com a descrição original
      let result = {
        originalDescription: description,
        timestamp: new Date(),
        pipelineSteps: []
      };
      
      // Passa por cada agente no pipeline
      for (const agentId of this.pipeline) {
        console.log(`\n→ Processing with ${agentId}...`);
        
        try {
          // Envia para o próximo agente
          const response = await this.mcp.orchestrate(
            this.id,
            agentId,
            result
          );
          
          // Adiciona resposta ao resultado
          result = { ...result, ...response };
          
          // Registra o passo
          result.pipelineSteps.push({
            agent: agentId,
            success: true,
            timestamp: new Date()
          });
          
        } catch (error) {
          console.error(`Pipeline failed at ${agentId}:`, error.message);
          result.pipelineSteps.push({
            agent: agentId,
            success: false,
            error: error.message
          });
          break;
        }
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Pipeline complete');
      console.log('='.repeat(50));
      
      return result;
    }
  
    /**
     * Cria especificação final do agente
     */
    async createAgentSpecification(processedData) {
      console.log('Creating final agent specification...');
      
      const spec = {
        id: `agent_${Date.now()}`,
        name: processedData.suggestedName || 'Generated Agent',
        description: processedData.originalDescription,
        type: processedData.agentType || 'assistant',
        capabilities: processedData.capabilities || [],
        tools: processedData.tools || [],
        deliveryMethods: processedData.deliveryMethods || ['api'],
        complexity: processedData.complexity || 'simple',
        status: 'specified',
        createdAt: new Date(),
        specification: processedData
      };
      
      return spec;
    }
  
    /**
     * Método requerido para agentes
     */
    async process(message, context) {
      // Orchestrator geralmente não é chamado por outros agentes
      // Mas precisa deste método para ser um agente válido
      return {
        status: 'orchestrator_ready',
        pipeline: this.pipeline
      };
    }
  }
  
  module.exports = OrchestratorAgent;