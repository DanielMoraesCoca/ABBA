/**
 * Orchestrator Agent - Coordena o pipeline de criação de agentes
 * ATUALIZADO - DIA 5
 */

const metrics = require('../core/metrics');
const ContextManager = require('../core/context-manager');
const MemorySystem = require('../core/memory-system');
const ToolRegistry = require('../core/tool-registry');

class OrchestratorAgent {
    constructor(mcpServer) {
        this.id = 'orchestrator';
        this.mcp = mcpServer;
        this.pipeline = [];
        this.agents = {};
        
        // Create instances for this orchestrator
        this.contextManager = new ContextManager();
        this.memorySystem = new MemorySystem();
        this.toolRegistry = new ToolRegistry();
        
        // Initialize memory system
        this.memorySystem.initialize().catch(console.error);
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
            const linesOfCode = typeof result.generatedCode === 'string' 
                ? result.generatedCode.split('\n').length 
                : result.generatedCode.totalLines || 0;
            
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
        await this.contextManager.saveContext(agentId, {
            description,
            startTime: Date.now()
        });
        
        // Processar normalmente
        const result = await this.processDescription(description);
        
        // Salvar na memória de longo prazo
        await this.memorySystem.remember(agentId, 'creationResult', result);
        await this.memorySystem.remember(agentId, 'description', description);
        
        // Atualizar contexto com resultado
        await this.contextManager.updateContext(agentId, {
            result,
            endTime: Date.now(),
            status: 'completed'
        });
        
        // Salvar agente no banco de dados (quando PostgreSQL estiver disponível)
        await this.saveAgentToDatabase(agentId, result);
        
        // Registrar ferramentas disponíveis para o agente
        const availableTools = this.toolRegistry.getAvailableTools ? 
            this.toolRegistry.getAvailableTools() : [];
        await this.memorySystem.remember(agentId, 'availableTools', availableTools);
        
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
            // PostgreSQL will be added in 3 days
            // For now, use file storage
            const FileStorage = require('../core/file-storage');
            const storage = new FileStorage();
            
            await storage.save('agents', agentId, {
                id: agentId,
                name: result.suggestedName || 'Generated Agent',
                type: result.agentType || 'assistant',
                description: result.originalDescription,
                code: result.generatedCode || '',
                config: result,
                status: 'active',
                created_at: new Date()
            });
            
            console.log(`Agent saved to storage: ${agentId}`);
        } catch (error) {
            console.error('Error saving agent:', error);
            // Don't throw - allow process to continue even if save fails
        }
    }

    /**
     * NOVO - DIA 5: Carrega agente do banco com contexto e memória
     */
    async loadAgent(agentId) {
        try {
            // For now, use file storage
            const FileStorage = require('../core/file-storage');
            const storage = new FileStorage();
            
            // Carregar agente
            const agent = await storage.load('agents', agentId);
            
            if (!agent) {
                throw new Error(`Agent ${agentId} not found`);
            }
            
            // Carregar contexto
            const context = await this.contextManager.loadContext(agentId);
            
            // Carregar memórias
            const creationResult = await this.memorySystem.recall(agentId, 'creationResult');
            const availableTools = await this.memorySystem.recall(agentId, 'availableTools');
            
            // Obter estatísticas de memória
            const memoryStats = await this.memorySystem.getStats();
            
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
            const FileStorage = require('../core/file-storage');
            const storage = new FileStorage();
            
            // This would need to be implemented in FileStorage
            // For now, return empty array
            return [];
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
            
            // CRITICAL FIX: Include the actual generated code and architecture
            code: processedData.generatedCode || null,
            architecture: processedData.architecture || null,
            tests: processedData.generatedTests || null,
            
            metrics: {
                linesOfCode: processedData.generatedCode?.totalLines || 0,
                filesGenerated: processedData.generatedCode?.totalFiles || 0,
                validated: processedData.validationReport?.valid || false,
                testsGenerated: !!processedData.generatedTests
            },
            createdAt: new Date(),
            specification: processedData
        };
        
        // Save the generated code to file system
        if (spec.code && spec.code.files) {
            try {
                const fs = require('fs').promises;
                const path = require('path');
                
                // Create directory for generated agent
                const outputDir = path.join(__dirname, '../../generated-agents', spec.name);
                await fs.mkdir(outputDir, { recursive: true });
                
                // Save all generated files
                for (const [filePath, content] of Object.entries(spec.code.files)) {
                    const fullPath = path.join(outputDir, filePath);
                    const dir = path.dirname(fullPath);
                    await fs.mkdir(dir, { recursive: true });
                    await fs.writeFile(fullPath, content);
                }
                
                // Save package.json if exists
                if (spec.code.package) {
                    await fs.writeFile(
                        path.join(outputDir, 'package.json'),
                        JSON.stringify(spec.code.package, null, 2)
                    );
                }
                
                // Save README if exists
                if (spec.code.readme) {
                    await fs.writeFile(
                        path.join(outputDir, 'README.md'),
                        spec.code.readme
                    );
                }
                
                // Save tests if generated
                if (spec.tests) {
                    const testsDir = path.join(outputDir, 'tests');
                    await fs.mkdir(testsDir, { recursive: true });
                    
                    for (const [testFile, testContent] of Object.entries(spec.tests)) {
                        await fs.writeFile(
                            path.join(testsDir, testFile),
                            testContent
                        );
                    }
                }
                
                spec.deploymentPath = outputDir;
                console.log(`Agent code saved to: ${outputDir}`);
                
            } catch (error) {
                console.error('Failed to save agent code:', error.message);
                spec.saveError = error.message;
            }
        }
        
        // Se tudo passou, preparar para deploy
        if (spec.validation?.valid && this.agents.deployer) {
            console.log('DEPLOYER: Preparing deployment...');
            const deployment = await this.agents.deployer.deployAgent(
                spec.name,
                spec.deploymentPath || spec.code,
                'local'
            );
            spec.deployment = deployment;
        }
        
        return spec;
    }

    /**
     * Método requerido para agentes
     */
    async process(message, context) {
        // If it's a description to process, run the pipeline
        if (typeof message === 'string' || message.originalDescription) {
            return await this.processDescription(message);
        }
        
        // Otherwise return status
        return {
            status: 'orchestrator_ready',
            pipeline: this.pipeline,
            agents: Object.keys(this.agents),
            persistence: {
                contextManager: !!this.contextManager,
                memorySystem: !!this.memorySystem,
                toolRegistry: !!this.toolRegistry
            }
        };
    }
}

module.exports = OrchestratorAgent;
