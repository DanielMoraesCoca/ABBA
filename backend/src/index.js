/**
 * ABBA 2.0 - Intelligent Agent Platform
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Import the new tool system and AI
const ABBATools = require('./core/abba-tools');
const LLMManager = require('./ai/llm-manager');

// Keep existing core modules that still work
const logger = require('./core/logger');
const errorHandler = require('./core/error-handler');
const metrics = require('./core/metrics');

// Keep MCP for agent orchestration (its original purpose)
const MCPServer = require('./core/mcp-server');

// File system for saving agents
const fs = require('fs').promises;

// Create application
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize systems
const llm = new LLMManager();
const tools = new ABBATools(llm);
const mcp = new MCPServer(); // Keep for future multi-agent orchestration

// Initialize everything
(async () => {
    try {
        await tools.initialize();
        console.log('✅ ABBA Tools initialized');
        console.log('✅ LLM Manager ready (Mock Mode: ' + process.env.USE_MOCK_LLM + ')');
        console.log('✅ MCP Server ready for agent orchestration');
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
})();

// Health check with more details
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: process.env.USE_MOCK_LLM === 'true' ? 'mock' : 'production',
        tools: tools.getAvailableTools(),
        metrics: tools.getExecutionMetrics(),
        costs: llm.costTracker,
        timestamp: new Date()
    });
});

// Main agent creation endpoint - completely redesigned
app.post('/api/create-agent', async (req, res) => {
    const { description } = req.body;
    const startTime = Date.now();
    
    try {
        logger.info('Creating agent from description', { description });
        
        // Step 1: Understand what the user wants
        const understanding = await tools.execute('understand_request', { 
            description 
        });
        
        logger.info('Request understood', understanding);
        
        // Step 2: Design the architecture based on understanding
        const architecture = await tools.execute('design_architecture', {
            type: understanding.type,
            capabilities: understanding.capabilities,
            complexity: understanding.complexity
        });
        
        logger.info('Architecture designed', { type: architecture.type });
        
        // Step 3: Generate the actual code
        const code = await tools.execute('generate_code', { 
            architecture 
        });
        
        // Step 4: If complex, enhance with LLM
        let finalCode = code;
        if (understanding.requiresLLM && !process.env.USE_MOCK_LLM === 'true') {
            finalCode = await enhanceWithIntelligence(code, description, understanding);
        }
        
        // Step 5: Deploy the agent
        const deployment = await deployAgent(finalCode, description, understanding);
        
        // Calculate metrics
        const executionTime = Date.now() - startTime;
        
        res.json({
            success: true,
            agent: {
                ...deployment,
                type: understanding.type,
                capabilities: understanding.capabilities,
                complexity: understanding.complexity
            },
            analysis: {
                understanding,
                architecture: {
                    files: architecture.files?.length || 0,
                    dependencies: architecture.dependencies?.length || 0
                }
            },
            metrics: {
                executionTime,
                toolMetrics: tools.getExecutionMetrics(),
                llmCosts: llm.costTracker
            },
            mode: process.env.USE_MOCK_LLM === 'true' ? 'mock' : 'production'
        });
        
    } catch (error) {
        logger.error('Agent creation failed', { 
            error: error.message,
            stack: error.stack 
        });
        
        res.status(500).json({ 
            success: false, 
            error: error.message,
            metrics: tools.getExecutionMetrics()
        });
    }
});

// Enhanced intelligence function - only for complex agents
async function enhanceWithIntelligence(code, description, understanding) {
    try {
        // Use LLM to add specific business logic
        const enhancement = await llm.process(
            `Given this ${understanding.type} agent structure, add specific implementation for: ${description}
            
Current code structure:
${JSON.stringify(code.files ? Object.keys(code.files) : [])}

Add intelligent behavior, decision making, and business logic specific to the request.`,
            { 
                model: understanding.complexity === 'complex' ? 'gpt-4' : 'gpt-3.5-turbo',
                temperature: 0.7
            }
        );
        
        return mergeEnhancement(code, enhancement);
    } catch (error) {
        logger.error('Enhancement failed, using base code', { error: error.message });
        return code; // Fallback to base code if enhancement fails
    }
}

// Merge LLM enhancements into code
function mergeEnhancement(code, enhancement) {
    if (!enhancement) return code;
    
    if (typeof enhancement === 'string' && code.files && code.files['index.js']) {
        // Try to intelligently merge the enhancement
        const mainFile = code.files['index.js'];
        
        // Look for insertion points
        if (mainFile.includes('// Agent logic here')) {
            code.files['index.js'] = mainFile.replace(
                '// Agent logic here',
                enhancement
            );
        } else {
            // Append to the process method
            code.files['index.js'] = mainFile.replace(
                'return result;',
                `${enhancement}\n        return result;`
            );
        }
    } else if (typeof enhancement === 'object' && enhancement.files) {
        // Merge file by file
        code.files = { ...code.files, ...enhancement.files };
    }
    
    return code;
}

// Deploy agent with proper structure
async function deployAgent(code, description, understanding) {
    try {
        const timestamp = Date.now();
        const agentName = `${understanding.type}_agent_${timestamp}`;
        const agentPath = path.join(__dirname, '../generated-agents', agentName);
        
        // Create directory structure
        await fs.mkdir(agentPath, { recursive: true });
        await fs.copyFile(
    path.join(__dirname, 'templates/agent-sdk.js'),
    path.join(agentPath, 'agent-sdk.js')
);
        
        // Save all files
        if (code.files) {
            for (const [filename, content] of Object.entries(code.files)) {
                const filePath = path.join(agentPath, filename);
                
                // Create subdirectories if needed
                const dir = path.dirname(filePath);
                if (dir !== agentPath) {
                    await fs.mkdir(dir, { recursive: true });
                }
                
                await fs.writeFile(filePath, content);
            }
        }
        
        // Generate and save package.json
        const packageJson = code.package || {
            name: agentName,
            version: '1.0.0',
            description: description,
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                test: 'echo "No tests yet"'
            },
            dependencies: {
                'express': '^4.18.0',
                'dotenv': '^16.0.0',
                '@modelcontextprotocol/sdk': 'latest'
            }
        };
        
        await fs.writeFile(
            path.join(agentPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        // Create README
        const readme = `# ${agentName}

## Description
${description}

## Type
${understanding.type}

## Capabilities
${understanding.capabilities.join(', ')}

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Created
${new Date().toISOString()}

---
Generated by ABBA Platform
`;
        
        await fs.writeFile(
            path.join(agentPath, 'README.md'),
            readme
        );
        
        logger.info('Agent deployed successfully', { 
            name: agentName, 
            path: agentPath 
        });
        
        return {
            name: agentName,
            path: agentPath,
            status: 'deployed',
            timestamp
        };
        
    } catch (error) {
        logger.error('Deployment failed', { error: error.message });
        throw error;
    }
}

// List all generated agents
app.get('/api/agents', async (req, res) => {
    try {
        const agentsDir = path.join(__dirname, '../generated-agents');
        const agents = await fs.readdir(agentsDir);
        
        const agentDetails = await Promise.all(
            agents.map(async (name) => {
                const agentPath = path.join(agentsDir, name);
                const packagePath = path.join(agentPath, 'package.json');
                
                try {
                    const packageJson = JSON.parse(
                        await fs.readFile(packagePath, 'utf-8')
                    );
                    return {
                        name,
                        description: packageJson.description,
                        version: packageJson.version,
                        path: agentPath
                    };
                } catch {
                    return { name, path: agentPath };
                }
            })
        );
        
        res.json({
            success: true,
            agents: agentDetails,
            count: agentDetails.length
        });
    } catch (error) {
        res.json({
            success: true,
            agents: [],
            count: 0
        });
    }
});

// Serve web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║        ABBA 2.0 - AI AGENT PLATFORM     ║
╠════════════════════════════════════════╣
║  Status: RUNNING                       ║
║  Port: ${PORT}                           ║
║  Mode: ${process.env.USE_MOCK_LLM === 'true' ? 'MOCK (No API costs)' : 'PRODUCTION'}    ║
║  Tools: LangChain + Custom             ║
║  Architecture: Tool-First, LLM-Fallback ║
╚════════════════════════════════════════╝

Available Endpoints:
- POST /api/create-agent    Create new agent
- GET  /api/agents         List all agents
- GET  /api/health         System health

Test with:
curl -X POST http://localhost:${PORT}/api/create-agent \\
  -H "Content-Type: application/json" \\
  -d '{"description":"Create a calculator that can add, subtract, multiply and divide"}'
    `);
});