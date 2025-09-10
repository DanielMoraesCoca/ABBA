/**
 * ABBA API Server - Entry point - DAY 4
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

// NOVO - DIA 4: Importar novos agentes e métricas
const ValidatorAgent = require('./agents/validator');
const TestWriterAgent = require('./agents/testwriter');
const MonitorAgent = require('./agents/monitor');
const DeployerAgent = require('./agents/deployer');
const metrics = require('./core/metrics');

// Criar aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar MCP e Agentes
console.log('\n========================================');
console.log('     ABBA PLATFORM - DAY 4              ');
console.log('========================================\n');

const mcp = new MCPServer();
const orchestrator = new OrchestratorAgent(mcp);
const interpreter = new InterpreterAgent();
const architect = new ArchitectAgent();
const coder = new CoderAgent();

// NOVO - DIA 4: Inicializar novos agentes
const validator = new ValidatorAgent();
const testWriter = new TestWriterAgent();
const monitor = new MonitorAgent();
const deployer = new DeployerAgent();

// Registrar agentes no MCP
mcp.registerAgent('orchestrator', orchestrator);
mcp.registerAgent('interpreter', interpreter);
mcp.registerAgent('architect', architect);
mcp.registerAgent('coder', coder);

// NOVO - DIA 4: Registrar novos agentes
mcp.registerAgent('validator', validator);
mcp.registerAgent('testwriter', testWriter);
mcp.registerAgent('monitor', monitor);
mcp.registerAgent('deployer', deployer);

// ATUALIZADO - DIA 4: Pipeline expandido
orchestrator.setPipeline(['interpreter', 'architect', 'coder', 'validator']);

// NOVO - DIA 4: Passar agentes para o orchestrator
orchestrator.setAgents({
  validator,
  testWriter,
  monitor,
  deployer
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
    
    // NOVO - DIA 4: Tracking de métricas
    const startTime = Date.now();
    const tracking = await monitor.trackExecution('API', 'create-agent', { description });
    
    // Validação
    if (!description || description.trim().length === 0) {
      await tracking.complete(null, 'Description is required');
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
    
    // NOVO - DIA 4: Registrar métricas
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
    
    // Resposta de sucesso
    res.json({
      success: true,
      agent: agentSpec,
      interpretation: interpretation,
      code: interpretation.generatedCode, // NOVO - incluir código gerado
      tests: interpretation.generatedTests, // NOVO - incluir testes
      validation: interpretation.validationReport, // NOVO - incluir validação
      metrics: {
        executionTime,
        linesGenerated
      },
      message: 'Agent specification created successfully'
    });
    
  } catch (error) {
    console.error('[ERROR] Creating agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NOVO - DIA 4: Rota de métricas
app.get('/api/metrics', (req, res) => {
  res.json(metrics.getMetrics());
});

// NOVO - DIA 4: Rota do dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// NOVO - DIA 4: Rota de relatório diário
app.get('/api/report', async (req, res) => {
  const report = await monitor.generateDailyReport();
  res.json(report);
});

// NOVO - DIA 4: Rota de saúde do sistema
app.get('/api/system-health', (req, res) => {
  const health = monitor.getSystemHealth();
  res.json(health);
});

/**
 * Rota de health check - ATUALIZADA
 */
app.get('/api/health', (req, res) => {
  const status = mcp.getStatus();
  const systemHealth = monitor.getSystemHealth();
  
  res.json({
    status: 'ok',
    service: 'ABBA Platform',
    version: '0.4.0',  // ATUALIZADO - DIA 4
    mcp: status,
    system: systemHealth,
    timestamp: new Date()
  });
});

/**
 * Rota de teste rápido - ATUALIZADA
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'ABBA API is running',
    day: 4,  // ATUALIZADO - DIA 4
    agents: [
      'orchestrator', 'interpreter', 'architect', 'coder',
      'validator', 'testwriter', 'monitor', 'deployer'  // NOVO - DIA 4
    ],
    metrics: metrics.getMetrics(), // NOVO - DIA 4
    ready: true
  });
});

/**
 * Listar agentes disponíveis - ATUALIZADA
 */
app.get('/api/agents', (req, res) => {
  const status = mcp.getStatus();
  
  res.json({
    agents: status.agents,
    total: status.agents.length,
    newAgents: ['validator', 'testwriter', 'monitor', 'deployer'] // NOVO - DIA 4
  });
});

/**
 * Servir interface web
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log('========================================');
  console.log('         ABBA PLATFORM - DAY 4         ');
  console.log('     AGENTS BUILDING AGENTS            ');
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
  console.log('  NEW Day 4 Agents:');
  console.log('  [✓] Validator Agent');
  console.log('  [✓] Test Writer Agent');
  console.log('  [✓] Monitor Agent');
  console.log('  [✓] Deployer Agent');
  console.log('');
  console.log('  Pipeline: interpret → architect → code → validate');
  console.log('');
  console.log('  Features:');
  console.log('  [✓] Metrics Collection');
  console.log('  [✓] Dashboard');
  console.log('  [✓] System Monitoring');
  console.log('  [✓] Deployment Ready');
  console.log('');
  console.log('  Access:');
  console.log(`  Web Interface: http://localhost:${PORT}`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`  Metrics: http://localhost:${PORT}/api/metrics`);
  console.log('');
  console.log('========================================');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});