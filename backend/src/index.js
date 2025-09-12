/**
 * ABBA API Server - Entry point - DAY 6
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar nossos módulos EXISTENTES
const MCPServer = require('./core/mcp-server');
const OrchestratorAgent = require('./agents/orchestrator');
const InterpreterAgent = require('./agents/interpreter');
const ArchitectAgent = require('./agents/architect');
const CoderAgent = require('./agents/coder');

// DIA 4: Importar agentes e métricas
const ValidatorAgent = require('./agents/validator');
const TestWriterAgent = require('./agents/testwriter');
const MonitorAgent = require('./agents/monitor');
const DeployerAgent = require('./agents/deployer');
const metrics = require('./core/metrics');

// NOVO - DIA 6: Importar logger e error handler
const logger = require('./core/logger');
const errorHandler = require('./core/error-handler');

// Criar aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar MCP e Agentes
console.log('\n========================================');
console.log('     ABBA PLATFORM - DAY 6              ');
console.log('========================================\n');

const mcp = new MCPServer();
const orchestrator = new OrchestratorAgent(mcp);
const interpreter = new InterpreterAgent();
const architect = new ArchitectAgent();
const coder = new CoderAgent();

// DIA 4: Inicializar novos agentes
const validator = new ValidatorAgent();
const testWriter = new TestWriterAgent();
const monitor = new MonitorAgent();
const deployer = new DeployerAgent();

// Registrar agentes no MCP
mcp.registerAgent('orchestrator', orchestrator);
mcp.registerAgent('interpreter', interpreter);
mcp.registerAgent('architect', architect);
mcp.registerAgent('coder', coder);

// DIA 4: Registrar novos agentes
mcp.registerAgent('validator', validator);
mcp.registerAgent('testwriter', testWriter);
mcp.registerAgent('monitor', monitor);
mcp.registerAgent('deployer', deployer);

// Pipeline expandido
orchestrator.setPipeline(['interpreter', 'architect', 'coder', 'validator']);

// Passar agentes para o orchestrator
orchestrator.setAgents({
  validator,
  testWriter,
  monitor,
  deployer
});

// NOVO - DIA 6: Log de inicialização
logger.info('ABBA Platform initialized', {
  agents: mcp.getStatus().agents.length,
  pipeline: ['interpreter', 'architect', 'coder', 'validator']
});

// ======================
// ROTAS DA API
// ======================

/**
 * Rota principal - Criar agente a partir de descrição
 */
app.post('/api/create-agent', async (req, res) => {
  try {
    const { description } = req.body;
    
    // Tracking de métricas
    const startTime = Date.now();
    const tracking = await monitor.trackExecution('API', 'create-agent', { description });
    
    // NOVO - DIA 6: Log da requisição
    logger.info('New agent creation request', { 
      description: description?.substring(0, 100) 
    });
    
    // Validação
    if (!description || description.trim().length === 0) {
      await tracking.complete(null, 'Description is required');
      logger.warn('Agent creation failed: no description provided');
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }
    
    console.log('\n[NEW AGENT REQUEST]');
    console.log('Description:', description);
    
    // Processar através do pipeline
    const interpretation = await orchestrator.processDescription(description);
    
    // Criar especificação final
    const agentSpec = await orchestrator.createAgentSpecification(interpretation);
    
    // Registrar métricas
    const executionTime = Date.now() - startTime;
    const linesGenerated = interpretation.generatedCode ? 
      interpretation.generatedCode.split('\n').length : 0;
    
    if (linesGenerated > 0) {
      metrics.recordAgentCreation(
        agentSpec.name,
        linesGenerated,
        executionTime,
        true, // success
        true  // created by ABBA
      );
    }
    
    await tracking.complete(agentSpec);
    
    // NOVO - DIA 6: Log de sucesso
    logger.info('Agent created successfully', {
      name: agentSpec.name,
      linesGenerated,
      executionTime
    });
    
    // Resposta de sucesso
    res.json({
      success: true,
      agent: agentSpec,
      interpretation: interpretation,
      code: interpretation.generatedCode,
      tests: interpretation.generatedTests,
      validation: interpretation.validationReport,
      metrics: {
        executionTime,
        linesGenerated
      },
      message: 'Agent specification created successfully'
    });
    
  } catch (error) {
    // NOVO - DIA 6: Error handling melhorado
    logger.error('Agent creation failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    const errorResponse = errorHandler.handle(error, {
      endpoint: '/api/create-agent',
      description: req.body.description
    });
    
    res.status(500).json(errorResponse);
  }
});

// Rota de métricas
app.get('/api/metrics', (req, res) => {
  res.json(metrics.getMetrics());
});

// Rota do dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Rota de relatório diário
app.get('/api/report', async (req, res) => {
  try {
    const report = await monitor.generateDailyReport();
    res.json(report);
  } catch (error) {
    const errorResponse = errorHandler.handle(error);
    res.status(500).json(errorResponse);
  }
});

// Rota de saúde do sistema
app.get('/api/system-health', (req, res) => {
  const health = monitor.getSystemHealth();
  res.json(health);
});

// NOVO - DIA 6: Rota para ver erros recentes (desenvolvimento)
app.get('/api/errors', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'This endpoint is only available in development' 
    });
  }
  
  res.json({
    errors: errorHandler.getRecentErrors(20)
  });
});

/**
 * Rota de health check - ATUALIZADA DIA 6
 */
app.get('/api/health', (req, res) => {
  const status = mcp.getStatus();
  const systemHealth = monitor.getSystemHealth();
  
  res.json({
    status: 'ok',
    service: 'ABBA Platform',
    version: '0.6.0',  // ATUALIZADO - DIA 6
    mcp: status,
    system: systemHealth,
    features: {
      logging: true,
      errorHandling: true,
      professionalUI: true
    },
    timestamp: new Date()
  });
});

/**
 * Rota de teste rápido - ATUALIZADA DIA 6
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'ABBA API is running',
    day: 6,  // ATUALIZADO - DIA 6
    agents: [
      'orchestrator', 'interpreter', 'architect', 'coder',
      'validator', 'testwriter', 'monitor', 'deployer'
    ],
    metrics: metrics.getMetrics(),
    features: {
      professionalInterface: true,
      structuredLogging: true,
      errorHandling: true,
      pipelineVisualization: true
    },
    ready: true
  });
});

/**
 * Listar agentes disponíveis
 */
app.get('/api/agents', (req, res) => {
  const status = mcp.getStatus();
  
  res.json({
    agents: status.agents,
    total: status.agents.length,
    categories: {
      core: ['orchestrator', 'interpreter', 'architect', 'coder'],
      validation: ['validator', 'testwriter'],
      operations: ['monitor', 'deployer']
    }
  });
});

/**
 * Servir interface web
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// NOVO - DIA 6: Error handling middleware (deve ser o último)
app.use(errorHandler.middleware());

// Iniciar servidor
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  // NOVO - DIA 6: Log estruturado de startup
  logger.info('ABBA Platform Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '0.6.0',
    day: 6,
    agents: 8,
    features: ['logging', 'error-handling', 'professional-ui']
  });
  
  console.log('========================================');
  console.log('         ABBA PLATFORM - DAY 6         ');
  console.log('        INTERFACE & POLISH             ');
  console.log('========================================');
  console.log('');
  console.log('  Status: RUNNING');
  console.log(`  Port: ${PORT}`);
  console.log('');
  console.log('  Core Agents:');
  console.log('  [✓] MCP Server');
  console.log('  [✓] Orchestrator Agent');
  console.log('  [✓] Interpreter Agent');
  console.log('  [✓] Architect Agent');
  console.log('  [✓] Coder Agent');
  console.log('');
  console.log('  Validation & Testing:');
  console.log('  [✓] Validator Agent');
  console.log('  [✓] Test Writer Agent');
  console.log('');
  console.log('  Operations:');
  console.log('  [✓] Monitor Agent');
  console.log('  [✓] Deployer Agent');
  console.log('');
  console.log('  NEW Day 6 Features:');
  console.log('  [✓] Professional Web Interface');
  console.log('  [✓] Pipeline Visualization');
  console.log('  [✓] Structured Logging');
  console.log('  [✓] Error Handling System');
  console.log('  [✓] Agent Dashboard');
  console.log('');
  console.log('  Pipeline: interpret → architect → code → validate');
  console.log('');
  console.log('  Access:');
  console.log(`  Web Interface: http://localhost:${PORT}`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`  Metrics: http://localhost:${PORT}/api/metrics`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Error Log: http://localhost:${PORT}/api/errors`);
  }
  console.log('');
  console.log('========================================');
});

// Tratamento de erros não capturados - MELHORADO DIA 6
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.toString(), 
    promise: promise?.toString() 
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  
  // Dar tempo para o log ser escrito antes de sair
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports = app;