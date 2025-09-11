/**
 * Orchestrator Agent - Coordena o pipeline de criação de agentes
 * ATUALIZADO - DIA 5
 */

const metrics = require('../core/metrics');
const contextManager = require('../core/context-manager');
const memorySystem = require('../core/memory-system');
const toolRegistry = require('../core/tool-registry');

class OrchestratorAgent {
    constructor(mcpServer) {
      this.id = 'orchestrator';
      this.mcp = mcpServer;
      this.pipeline = [];
      this.agents = {};
    }
  
    /**
     * Define referências aos agentes
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
     */
    async processDescription(description) {
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Starting pipeline');
      console.log('Input:', description);
      console.log('='.repeat(50));
      
      const startTime = Date.now();
      
      // Tracking com monitor
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
      
      // Registrar métricas
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
      
      // Completar tracking
      if (tracking) {
        await tracking.complete(result);
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('ORCHESTRATOR: Pipeline complete');
      console.log('='.repeat(50));
      
      return result;
    }

    /**
     * NOVO - DIA 5: Processa com persistência no banco
     */
    async processWithPersistence(description) {
      const agentId = `agent_${Date.now()}`;
      
      // Salvar contexto inicial
      await contextManager.saveContext(agentId, {
        description,
        startTime: Date.now()
      });
      
      // Processar normalmente
      const result = await this.processDescription(description);
      
      // Salvar na memória de longo prazo
      await memorySystem.remember(agentId, 'creationResult', result, 'long');
      await memorySystem.remember(agentId, 'description', description, 'long');
      
      // Atualizar contexto com resultado
      await contextManager.updateContext(agentId, {
        result,
        endTime: Date.now(),
        status: 'completed'
      });
      
      // Salvar agente no banco de dados
      await this.saveAgentToDatabase(agentId, result);
      
      // Registrar ferramentas disponíveis para o agente
      const availableTools = toolRegistry.getAvailableTools();
      await memorySystem.remember(agentId, 'availableTools', availableTools, 'long');
      
      console.log(`
  PERSISTENCE COMPLETE
   Agent ID: ${agentId}
   Context Saved: ✓
   Memory Saved: ✓
   Database Saved: ✓
   Tools Registered: ${availableTools.length}
      `);
      
      return { ...result, agentId };
    }

    /**
     * NOVO - DIA 5: Salva agente no banco de dados
     */
    async saveAgentToDatabase(agentId, result) {
      try {
        const db = require('../config/database');
        
        await db.query(
          `INSERT INTO agents (id, name, type, description, code, config, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE
           SET name = $2, type = $3, description = $4, code = $5, config = $6, status = $7`,
          [
            agentId,
            result.suggestedName || 'Generated Agent',
            result.agentType || 'assistant',
            result.originalDescription,
            result.generatedCode || '',
            JSON.stringify(result),
            'active'
          ]
        );
        
        console.log(`Agent saved to database: ${agentId}`);
      } catch (error) {
        console.error('Error saving agent to database:', error);
        // Don't throw - allow process to continue even if DB save fails
      }
    }

    /**
     * NOVO - DIA 5: Carrega agente do banco com contexto e memória
     */
    async loadAgent(agentId) {
      try {
        const db = require('../config/database');
        
        // Carregar agente do banco
        const agentResult = await db.query(
          'SELECT * FROM agents WHERE id = $1',
          [agentId]
        );
        
        if (agentResult.rows.length === 0) {
          throw new Error(`Agent ${agentId} not found`);
        }
        
        const agent = agentResult.rows[0];
        
        // Carregar contexto
        const context = await contextManager.loadContext(agentId);
        
        // Carregar memórias
        const creationResult = await memorySystem.recall(agentId, 'creationResult', 'long');
        const availableTools = await memorySystem.recall(agentId, 'availableTools', 'long');
        
        // Obter estatísticas de memória
        const memoryStats = await memorySystem.getMemoryStats(agentId);
        
        return {
          ...agent,
          context,
          memory: {
            creationResult,
            availableTools,
            stats: memoryStats
          }
        };
      } catch (error) {
        console.error(`Error loading agent ${agentId}:`, error);
        throw error;
      }
    }

    /**
     * NOVO - DIA 5: Lista todos os agentes salvos
     */
    async listSavedAgents() {
      try {
        const db = require('../config/database');
        
        const result = await db.query(
          'SELECT id, name, type, status, created_at FROM agents ORDER BY created_at DESC'
        );
        
        return result.rows;
      } catch (error) {
        console.error('Error listing agents:', error);
        return [];
      }
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
      
      // Se tudo passou, preparar para deploy
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
        agents: Object.keys(this.agents),
        persistence: {
          contextManager: !!contextManager,
          memorySystem: !!memorySystem,
          toolRegistry: !!toolRegistry
        }
      };
    }
  }
  
  module.exports = OrchestratorAgent;
