/**
 * Orchestrator Agent - Coordena o pipeline de criação de agentes
 * ATUALIZADO - DIA 4
 */

const metrics = require('../core/metrics'); // NOVO - DIA 4

class OrchestratorAgent {
    constructor(mcpServer) {
      this.id = 'orchestrator';
      this.mcp = mcpServer;
      this.pipeline = [];
      this.agents = {}; // NOVO - DIA 4: Referências aos agentes
    }
  
    /**
     * NOVO - DIA 4: Define referências aos agentes
     */
    setAgents(agents) {
      this.agents = agents;
      console.log('Agents registered with orchestrator:', Object.keys(agents));
    }
  
    /**
     * Define o pipeline de processamento
     */
    setPipeline(agents) {
      this.pipeline = agents;
      console.log(`Pipeline set: ${agents.join(' → ')}`);
    }
  
    /**
     * Processa uma descrição através do pipeline completo
     * ATUALIZADO - DIA 4
     */
    async processDescription(description) {
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Starting pipeline');
      console.log('Input:', description);
      console.log('='.repeat(50));
      
      const startTime = Date.now(); // NOVO - DIA 4
      
      // NOVO - DIA 4: Tracking com monitor
      let tracking;
      if (this.agents.monitor) {
        tracking = await this.agents.monitor.trackExecution(
          'Orchestrator', 
          'process-description', 
          { description }
        );
      }
      
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
          // Se for o validator e tivermos código gerado
          if (agentId === 'validator' && result.generatedCode && this.agents.validator) {
            console.log('VALIDATOR: Validating generated code...');
            const validationReport = await this.agents.validator.validateCode(
              result.generatedCode,
              'javascript'
            );
            result.validationReport = validationReport;
            
            // Se a validação passou, gerar testes
            if (validationReport.valid && this.agents.testWriter) {
              console.log('TEST WRITER: Generating tests...');
              const tests = await this.agents.testWriter.generateTests(
                result.generatedCode,
                result.suggestedName || 'GeneratedAgent'
              );
              result.generatedTests = tests;
            }
            
            result.pipelineSteps.push({
              agent: agentId,
              success: validationReport.valid,
              timestamp: new Date()
            });
            
            continue;
          }
          
          // Processo normal para outros agentes
          const response = await this.mcp.orchestrate(
            this.id,
            agentId,
            result
          );
          
          result = { ...result, ...response };
          
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
      
      // NOVO - DIA 4: Registrar métricas
      const executionTime = Date.now() - startTime;
      if (result.generatedCode) {
        const linesOfCode = result.generatedCode.split('\n').length;
        
        metrics.recordAgentCreation(
          result.suggestedName || 'GeneratedAgent',
          linesOfCode,
          executionTime,
          result.validationReport?.valid || true,
          true // created by ABBA
        );
        
        console.log(`
  AGENT CREATION METRICS
   Lines Generated: ${linesOfCode}
   Execution Time: ${executionTime}ms
   Validation: ${result.validationReport?.valid ? 'PASSED' : 'FAILED'}
   Tests Generated: ${result.generatedTests ? 'YES' : 'NO'}
        `);
      }
      
      // NOVO - DIA 4: Completar tracking
      if (tracking) {
        await tracking.complete(result);
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Pipeline complete');
      console.log('='.repeat(50));
      
      return result;
    }
  
    /**
     * Cria especificação final do agente
     * ATUALIZADO - DIA 4
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
        // NOVO - DIA 4: Adicionar informações de validação e testes
        validation: processedData.validationReport || null,
        hasTests: !!processedData.generatedTests,
        metrics: {
          linesOfCode: processedData.generatedCode ? 
            processedData.generatedCode.split('\n').length : 0,
          validated: processedData.validationReport?.valid || false,
          testsGenerated: !!processedData.generatedTests
        },
        createdAt: new Date(),
        specification: processedData
      };
      
      // NOVO - DIA 4: Se tudo passou, preparar para deploy
      if (spec.validation?.valid && this.agents.deployer) {
        console.log('DEPLOYER: Preparing deployment...');
        const deployment = await this.agents.deployer.deployAgent(
          spec.name,
          processedData.generatedCode,
          'docker'
        );
        spec.deployment = deployment;
      }
      
      return spec;
    }
  
    /**
     * Método requerido para agentes
     */
    async process(message, context) {
      return {
        status: 'orchestrator_ready',
        pipeline: this.pipeline,
        agents: Object.keys(this.agents) // NOVO - DIA 4
      };
    }
  }
  
  module.exports = OrchestratorAgent;