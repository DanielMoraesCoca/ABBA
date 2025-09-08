/**
 * ABBA API Server - Entry point
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar nossos módulos
const MCPServer = require('./core/mcp-server');
const OrchestratorAgent = require('./agents/orchestrator');
const InterpreterAgent = require('./agents/interpreter');
const ArchitectAgent = require('./agents/architect');
const CoderAgent = require('./agents/coder');  // NOVO - DIA 3

// Criar aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar MCP e Agentes
console.log('\n========================================');
console.log('     ABBA PLATFORM - DAY 3              ');
console.log('========================================\n');

const mcp = new MCPServer();
const orchestrator = new OrchestratorAgent(mcp);
const interpreter = new InterpreterAgent();
const architect = new ArchitectAgent();
const coder = new CoderAgent();  // NOVO - DIA 3

// Registrar agentes no MCP
mcp.registerAgent('orchestrator', orchestrator);
mcp.registerAgent('interpreter', interpreter);
mcp.registerAgent('architect', architect);
mcp.registerAgent('coder', coder);  // NOVO - DIA 3

// Configurar pipeline - ATUALIZADO DIA 3
orchestrator.setPipeline(['interpreter', 'architect', 'coder']);

// ======================
// ROTAS DA API
// ======================

/**
 * Rota principal - Criar agente a partir de descrição
 */
app.post('/api/create-agent', async (req, res) => {
  try {
    const { description } = req.body;
    
    // Validação
    if (!description || description.trim().length === 0) {
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
    
    // Resposta de sucesso
    res.json({
      success: true,
      agent: agentSpec,
      interpretation: interpretation,
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

/**
 * Rota de health check
 */
app.get('/api/health', (req, res) => {
  const status = mcp.getStatus();
  
  res.json({
    status: 'ok',
    service: 'ABBA Platform',
    version: '0.3.0',  // ATUALIZADO - DIA 3
    mcp: status,
    timestamp: new Date()
  });
});

/**
 * Rota de teste rápido
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'ABBA API is running',
    day: 3,  // ATUALIZADO - DIA 3
    agents: ['orchestrator', 'interpreter', 'architect', 'coder'],  // ATUALIZADO - DIA 3
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
    total: status.agents.length
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
  console.log('         ABBA PLATFORM - DAY 3         ');
  console.log('========================================');
  console.log('');
  console.log('  Status: RUNNING');
  console.log(`  Port: ${PORT}`);
  console.log('');
  console.log('  Components:');
  console.log('  [OK] MCP Server');
  console.log('  [OK] Orchestrator Agent');
  console.log('  [OK] Interpreter Agent');
  console.log('  [OK] Architect Agent');
  console.log('  [OK] Coder Agent');  // NOVO - DIA 3
  console.log('  [OK] REST API');
  console.log('');
  console.log('  Pipeline: interpret -> architect -> code');
  console.log('');
  console.log('  Access:');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/api/health`);
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