/**
 * ABBA API Server - Entry point - DAY 11 (Updated from DAY 10)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

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

// DIA 6: Importar logger e error handler
const logger = require('./core/logger');
const errorHandler = require('./core/error-handler');

// DAY 10: Import delivery systems
const APIGateway = require('./core/api-gateway');
const WebSocketServer = require('./core/websocket-server');

// NEW - DAY 11: Import widget system
const WidgetAPI = require('./core/widget-api');
const ChannelManager = require('./core/channel-manager');

const CodeSaver = require('./core/code-saver');
const codeSaver = new CodeSaver();

// Criar aplicação Express
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar MCP e Agentes
console.log('\n========================================');
console.log('     ABBA PLATFORM - DAY 11             ');
console.log('========================================\n');

const mcp = new MCPServer();
const orchestrator = new OrchestratorAgent(mcp);
const interpreter = new InterpreterAgent();
const architect = new ArchitectAgent();
const coder = new CoderAgent();
const channelManager = new ChannelManager();

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

// DAY 10: Initialize API Gateway and WebSocket Server
const apiGateway = new APIGateway();
const wsServer = new WebSocketServer(server);

// NEW - DAY 11: Initialize Widget API
const widgetAPI = new WidgetAPI();

// DAY 10: Mount API Gateway routes
app.use('/api/v1', apiGateway.setupRoutes());

// NEW - DAY 11: Mount Widget API routes
app.use('/widgets', widgetAPI.router);

// NEW - DAY 11: Serve widget loader script
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/widget.js'));
});

// DAY 10: WebSocket event handlers
wsServer.on('client_subscribed', (data) => {
  logger.info('WebSocket client subscribed', data);
});

wsServer.on('client_disconnected', (data) => {
  logger.info('WebSocket client disconnected', data);
});

// Log de inicialização - UPDATED for Day 11
logger.info('ABBA Platform initialized', {
  agents: mcp.getStatus().agents.length,
  pipeline: ['interpreter', 'architect', 'coder', 'validator'],
  deliveryMethods: ['REST API', 'WebSocket', 'Webhooks', 'Widgets'], // UPDATED
  apiVersion: 'v1',
  widgetSystem: true // NEW
});

// ======================
// ROTAS DA API (EXISTING)
// ======================

/**
 * Rota principal - Criar agente a partir de descrição
 * KEPT for backward compatibility - also available at /api/v1/agents
 */
app.post('/api/create-agent', async (req, res) => {
  try {
    const { description } = req.body;
    
    // Tracking de métricas
    const startTime = Date.now();
    const tracking = await monitor.trackExecution('API', 'create-agent', { description });
    
    // DIA 6: Log da requisição
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
    if (agentSpec.code) {
    const savedPath = await codeSaver.saveAgent(agentSpec);
    agentSpec.deploymentPath = savedPath;
    logger.info('Agent code saved', { path: savedPath });
}
    
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
    
    // DIA 6: Log de sucesso
    logger.info('Agent created successfully', {
      name: agentSpec.name,
      linesGenerated,
      executionTime
    });
    
    // DAY 10: Notify WebSocket subscribers
    wsServer.broadcastToAll({
      type: 'agent_created',
      agent: agentSpec,
      timestamp: new Date().toISOString()
    });
    
    // DAY 10: Trigger webhooks
    await apiGateway.triggerWebhooks('agent.created', {
      agent: agentSpec,
      executionTime,
      linesGenerated
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
    // DIA 6: Error handling melhorado
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

// DIA 6: Rota para ver erros recentes (desenvolvimento)
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
 * Rota de health check - ATUALIZADA DIA 11
 */
app.get('/api/health', (req, res) => {
  const status = mcp.getStatus();
  const systemHealth = monitor.getSystemHealth();
  
  res.json({
    status: 'ok',
    service: 'ABBA Platform',
    version: '0.11.0',  // UPDATED - DAY 11
    day: 11,  // UPDATED - DAY 11
    mcp: status,
    system: systemHealth,
    features: {
      logging: true,
      errorHandling: true,
      professionalUI: true,
      apiGateway: true,
      websocket: true,
      webhooks: true,
      widgets: true  // NEW - DAY 11
    },
    delivery: {
      restApi: `http://localhost:${PORT}/api/v1`,
      websocket: `ws://localhost:${PORT}`,
      webhooks: apiGateway.webhookSubscriptions.size,
      widgets: 'active'  // NEW - DAY 11
    },
    websocketStats: wsServer.getStats(),
    timestamp: new Date()
  });
});

/**
 * Rota de teste rápido - ATUALIZADA DIA 11
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'ABBA API is running',
    day: 11,  // UPDATED - DAY 11
    agents: [
      'orchestrator', 'interpreter', 'architect', 'coder',
      'validator', 'testwriter', 'monitor', 'deployer'
    ],
    metrics: metrics.getMetrics(),
    features: {
      professionalInterface: true,
      structuredLogging: true,
      errorHandling: true,
      pipelineVisualization: true,
      apiGateway: true,
      websocket: true,
      webhooks: true,
      widgets: true  // NEW - DAY 11
    },
    deliveryMethods: {
      rest: '/api/v1',
      websocket: wsServer.getStats(),
      webhooks: apiGateway.webhookSubscriptions.size,
      widgets: 'active'  // NEW - DAY 11
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

// DIA 6: Error handling middleware (deve ser o último)
app.use(errorHandler.middleware());

// Iniciar servidor - UPDATED for Day 11
const PORT = process.env.PORT || 3333;

// Use server.listen instead of app.listen for WebSocket support
server.listen(PORT, () => {
  // Log estruturado de startup - UPDATED for Day 11
  logger.info('ABBA Platform Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '0.11.0',
    day: 11,
    agents: 8,
    features: ['logging', 'error-handling', 'professional-ui', 'api-gateway', 'websocket', 'webhooks', 'widgets']
  });
  
  console.log('========================================');
  console.log('         ABBA PLATFORM - DAY 11        ');
  console.log('        WIDGET SYSTEM                  ');
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
  console.log('  Day 6 Features:');
  console.log('  [✓] Professional Web Interface');
  console.log('  [✓] Pipeline Visualization');
  console.log('  [✓] Structured Logging');
  console.log('  [✓] Error Handling System');
  console.log('  [✓] Agent Dashboard');
  console.log('');
  console.log('  Day 10 - Delivery Methods:');
  console.log('  [✓] API Gateway (REST v1)');
  console.log('  [✓] WebSocket Server');
  console.log('  [✓] Webhook System');
  console.log('  [✓] Real-time Updates');
  console.log('  [✓] Batch Operations');
  console.log('');
  console.log('  NEW Day 11 - Widget System:');
  console.log('  [✓] Widget Generator');
  console.log('  [✓] Embed Code Generation');
  console.log('  [✓] Customization Interface');
  console.log('  [✓] Security Sandbox');
  console.log('  [✓] Domain Validation');
  console.log('');
  console.log('  Pipeline: interpret → architect → code → validate');
  console.log('');
  console.log('  Access Points:');
  console.log(`  Web Interface: http://localhost:${PORT}`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`  API v1 Gateway: http://localhost:${PORT}/api/v1`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Widget Loader: http://localhost:${PORT}/widget.js`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`  Metrics: http://localhost:${PORT}/api/metrics`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Error Log: http://localhost:${PORT}/api/errors`);
  }
  console.log('');
  console.log('  API v1 Endpoints:');
  console.log(`  POST   /api/v1/agents          - Create agent`);
  console.log(`  GET    /api/v1/agents          - List agents`);
  console.log(`  GET    /api/v1/agents/:id      - Get agent`);
  console.log(`  POST   /api/v1/agents/:id/execute - Execute agent`);
  console.log(`  POST   /api/v1/webhooks/subscribe - Subscribe webhook`);
  console.log(`  POST   /api/v1/tools/execute   - Execute tool`);
  console.log(`  POST   /api/v1/batch           - Batch operations`);
  console.log('');
  console.log('  Widget Endpoints:');
  console.log(`  POST   /widgets/create         - Create widget`);
  console.log(`  GET    /widgets/:id/config     - Get widget config`);
  console.log(`  PUT    /widgets/:id/config     - Update widget`);
  console.log(`  GET    /widgets/:id/customize  - Customization UI`);
  console.log(`  GET    /widgets/iframe/:id     - Widget iframe`);
  console.log(`  GET    /widget.js              - Widget loader`);
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

// DAY 10: Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Inicialização assíncrona - DIA 11
(async () => {
    // MCP doesn't need initialization - it's ready after construction
    console.log('MCP Server ready');
    
    // Initialize memory system if it exists
    if (orchestrator.memorySystem && typeof orchestrator.memorySystem.initialize === 'function') {
        await orchestrator.memorySystem.initialize();
        console.log('Memory System initialized');
    }
    
    // Initialize Channel Manager if it exists
    if (channelManager && typeof channelManager.initialize === 'function') {
        try {
            await channelManager.initialize();
            channelManager.connectToOrchestrator(orchestrator);
            console.log('Channel Manager initialized');
        } catch (error) {
            console.warn('Channel Manager initialization failed:', error.message);
        }
    }
    
    console.log('✅ System initialization complete');
})();

// Novas rotas da API - DIA 11
app.post('/api/send-message', async (req, res) => {
  try {
      const { channel, recipient, message } = req.body;
      const result = await channelManager.sendMessage(channel, recipient, message);
      res.json({ success: true, result });
  } catch (error) {
      res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/channels', (req, res) => {
  res.json(channelManager.getStats());
});

module.exports = { app, server, wsServer };