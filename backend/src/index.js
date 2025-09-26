/**
 * ABBA 2.0 - MCP-First AI Platform
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Import enhanced MCP and AI
const MCPEnhanced = require('./mcp/mcp-enhanced');
const LLMManager = require('./ai/llm-manager');


// Keep existing core modules that still work
const logger = require('./core/logger');
const errorHandler = require('./core/error-handler');
const metrics = require('./core/metrics');

// File system for saving agents
const fs = require('fs').promises;

// Create application
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize enhanced systems
const mcp = new MCPEnhanced();
const llm = new LLMManager();

// Initialize
(async () => {
    await mcp.initialize();
    console.log('✅ MCP Enhanced initialized with intelligent tools');
    console.log('✅ LLM Manager ready (Mock Mode: ' + process.env.USE_MOCK_LLM + ')');
})();

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: process.env.USE_MOCK_LLM === 'true' ? 'mock' : 'production',
        mcp: 'active',
        llm: 'ready',
        costs: llm.costTracker
    });
});

// Main agent creation endpoint
app.post('/api/create-agent', async (req, res) => {
    const { description } = req.body;
    
    try {
        logger.info('Creating agent from description', { description });
        
        // 1. Use MCP to identify type (no LLM cost)
        const agentType = await mcp.process(description, true);
        
        // 2. Generate structure (mostly templates, minimal LLM)
        const structure = await mcp.process({
            action: 'generate_base_structure',
            type: agentType.type || 'general'
        });
        
        // 3. Add intelligence only where needed (selective LLM)
        const intelligentCode = await enhanceWithIntelligence(structure, description);
        
        // 4. Save and deploy
        const agent = await deployAgent(intelligentCode, description);
        
        res.json({
            success: true,
            agent,
            costs: llm.costTracker,
            mode: process.env.USE_MOCK_LLM === 'true' ? 'mock' : 'production'
        });
    } catch (error) {
        logger.error('Agent creation failed', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

async function enhanceWithIntelligence(structure, description) {
    // Only use LLM for complex logic
    const needsLLM = analyzeComplexity(description);
    
    if (needsLLM) {
        const enhancement = await llm.process(
            `Add specific logic for: ${description}`,
            { model: 'gpt-3.5-turbo' }
        );
        return mergeEnhancement(structure, enhancement);
    }
    
    return structure;
}

function analyzeComplexity(description) {
    const complexKeywords = ['learn', 'understand', 'decide', 'analyze', 'predict', 'intelligent'];
    return complexKeywords.some(k => description.toLowerCase().includes(k));
}

function mergeEnhancement(structure, enhancement) {
    // If enhancement is a string, try to parse it as code
    if (typeof enhancement === 'string') {
        if (structure.files && structure.files['index.js']) {
            // Insert enhancement into main file
            structure.files['index.js'] = structure.files['index.js'].replace(
                '// Main processing logic here',
                enhancement
            );
        }
    } else if (typeof enhancement === 'object') {
        // Merge object enhancements
        return { ...structure, ...enhancement };
    }
    
    return structure;
}

async function deployAgent(code, description) {
    try {
        const agentName = `agent_${Date.now()}`;
        const agentPath = path.join(__dirname, '../generated-agents', agentName);
        
        // Create directory
        await fs.mkdir(agentPath, { recursive: true });
        
        // Save files
        if (code.files) {
            for (const [filename, content] of Object.entries(code.files)) {
                const filePath = path.join(agentPath, filename);
                await fs.writeFile(filePath, content);
            }
        }
        
        // Save package.json
        const packageJson = {
            name: agentName,
            version: '1.0.0',
            description: description,
            main: 'index.js',
            dependencies: {
                'express': 'latest',
                'dotenv': 'latest',
                '@modelcontextprotocol/sdk': 'latest'
            }
        };
        
        await fs.writeFile(
            path.join(agentPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        logger.info('Agent deployed', { name: agentName, path: agentPath });
        
        return {
            name: agentName,
            path: agentPath,
            status: 'deployed'
        };
    } catch (error) {
        logger.error('Deployment failed', { error: error.message });
        throw error;
    }
}

// Serve web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     ABBA 2.0 - MCP + AI PLATFORM      ║
╠════════════════════════════════════════╣
║  Status: RUNNING                       ║
║  Port: ${PORT}                           ║
║  Mode: ${process.env.USE_MOCK_LLM === 'true' ? 'MOCK (No API costs)' : 'PRODUCTION'}    ║
║  MCP: Enabled                          ║
║  Cost Optimization: ENABLED            ║
╚════════════════════════════════════════╝

Test with:
curl -X POST http://localhost:${PORT}/api/create-agent \\
  -H "Content-Type: application/json" \\
  -d '{"description":"Create a calculator"}'
    `);
});