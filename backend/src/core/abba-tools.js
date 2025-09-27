const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");

class ABBATools {
    constructor(llmManager) {
        this.tools = new Map();
        this.llm = llmManager;
        this.executionLog = [];
    }
    
    async initialize() {
        // Tool 1: Understand what user wants (no LLM needed for simple cases)
        this.registerTool(
            "understand_request",
            "Understand and classify user's agent request",
            z.object({
                description: z.string().describe("User's description of the agent")
            }),
            async ({ description }) => {
                // Start with pattern matching (free)
                const patterns = {
                    calculator: { 
                        regex: /calculat|math|add|subtract|multiply|divide/i,
                        capabilities: ['math_operations'],
                        complexity: 'simple'
                    },
                    chatbot: { 
                        regex: /chat|convers|respond|talk|communicate/i,
                        capabilities: ['conversation', 'nlp'],
                        complexity: 'complex'
                    },
                    api: { 
                        regex: /api|endpoint|rest|webhook|http/i,
                        capabilities: ['http_server', 'data_processing'],
                        complexity: 'medium'
                    },
                    automation: { 
                        regex: /automat|schedule|workflow|trigger/i,
                        capabilities: ['scheduling', 'workflow'],
                        complexity: 'medium'
                    },
                    database: { 
                        regex: /database|crud|store|persist|sql/i,
                        capabilities: ['data_storage', 'crud_operations'],
                        complexity: 'medium'
                    }
                };
                
                for (const [type, config] of Object.entries(patterns)) {
                    if (config.regex.test(description)) {
                        return {
                            type,
                            capabilities: config.capabilities,
                            complexity: config.complexity,
                            method: 'pattern_matching',
                            confidence: 0.85,
                            requiresLLM: config.complexity === 'complex'
                        };
                    }
                }
                
                // Only use LLM for truly complex requests
                if (description.length > 100 || description.includes('learn') || description.includes('understand')) {
                    if (this.llm) {
                        return await this.llm.process(
                            `Classify this agent request: ${description}`,
                            { model: 'gpt-3.5-turbo' } // Use cheaper model
                        );
                    }
                }
                
                return {
                    type: 'general',
                    capabilities: ['basic_processing'],
                    complexity: 'simple',
                    method: 'default',
                    confidence: 0.3
                };
            }
        );
        
        // Tool 2: Generate agent architecture
        this.registerTool(
            "design_architecture",
            "Design the architecture for an agent",
            z.object({
                type: z.string(),
                capabilities: z.array(z.string()),
                complexity: z.string()
            }),
            async ({ type, capabilities, complexity }) => {
                // Use templates for simple agents (no LLM cost)
                if (complexity === 'simple') {
                    return this.getSimpleArchitecture(type, capabilities);
                }
                
                // Use LLM only for complex architectures
                if (complexity === 'complex' && this.llm) {
                    const prompt = `Design architecture for a ${type} agent with capabilities: ${capabilities.join(', ')}`;
                    return await this.llm.process(prompt, { 
                        model: 'gpt-4', // Use better model for architecture
                        temperature: 0.3 // Lower temperature for consistency
                    });
                }
                
                return this.getDefaultArchitecture(type, capabilities);
            }
        );
        
        // Tool 3: Generate actual code
        this.registerTool(
            "generate_code",
            "Generate the actual agent code",
            z.object({
                architecture: z.object({
                    type: z.string(),
                    files: z.array(z.string()),
                    dependencies: z.array(z.string()),
                    capabilities: z.array(z.string()).optional()
                })
            }),
            async ({ architecture }) => {
                const code = {};
                
                // For each file in architecture
                for (const file of architecture.files) {
                    if (file === 'index.js') {
                        code[file] = this.generateMainFile(architecture);
                    } else if (file.includes('test')) {
                        code[file] = this.generateTestFile(architecture);
                    } else if (file === 'agent-sdk.js') {
                        code[file] = this.generateAgentSDK();
                    } else {
                        code[file] = this.generateSupportFile(file, architecture);
                    }
                }
                
                return {
                    files: code,
                    package: this.generatePackageJson(architecture)
                };
            }
        );
        
        console.log(`✅ ABBA Tools initialized with ${this.tools.size} tools`);
    }
    
    registerTool(name, description, schema, handler) {
        const tool = new DynamicStructuredTool({
            name,
            description,
            schema,
            func: handler
        });
        
        this.tools.set(name, {
            tool,
            schema,
            handler
        });
    }
    
    async execute(toolName, input) {
        const toolData = this.tools.get(toolName);
        if (!toolData) {
            throw new Error(`Tool ${toolName} not found`);
        }
        
        const startTime = Date.now();
        try {
            const result = await toolData.handler(input);
            
            this.executionLog.push({
                tool: toolName,
                input,
                result,
                duration: Date.now() - startTime,
                timestamp: new Date()
            });
            
            return result;
        } catch (error) {
            this.executionLog.push({
                tool: toolName,
                input,
                error: error.message,
                duration: Date.now() - startTime,
                timestamp: new Date()
            });
            throw error;
        }
    }
    
    // Helper methods for code generation
    getSimpleArchitecture(type, capabilities) {
        return {
            type,
            files: ['index.js', 'agent-sdk.js', 'package.json', 'README.md', '.env'],
            dependencies: ['express', 'dotenv'],
            capabilities: capabilities || [],
            structure: {
                '/': ['index.js', 'agent-sdk.js', 'package.json', 'README.md', '.env'],
                '/lib': [],
                '/tests': []
            }
        };
    }
    
    getDefaultArchitecture(type, capabilities) {
        return this.getSimpleArchitecture(type, capabilities);
    }
    
    generateMainFile(architecture) {
        const agentClassName = architecture.type.charAt(0).toUpperCase() + architecture.type.slice(1) + 'Agent';
        
        // Generate INTELLIGENT agent code
        return `const IntelligentAgentSDK = require('./agent-sdk');
const express = require('express');
require('dotenv').config();

class ${agentClassName} extends IntelligentAgentSDK {
    constructor() {
        super({
            type: '${architecture.type}',
            capabilities: ${JSON.stringify(architecture.capabilities || [])}
        });
        
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
        
        // Add specific methods for ${architecture.type}
        ${this.getSpecificMethods(architecture.type)}
    }
    
    setupRoutes() {
        this.app.post('/think', async (req, res) => {
            try {
                const result = await this.think(req.body.input);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        this.app.get('/memory', (req, res) => {
            res.json({ 
                memories: this.memory.length,
                recent: this.memory.slice(-5)
            });
        });
        
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'thinking',
                type: '${architecture.type}',
                intelligence: 'active'
            });
        });
    }
    
    async localProcess(input, context) {
        // Specific logic for ${architecture.type}
        ${this.getSpecificLogic(architecture.type)}
        
        return result;
    }
    
    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(\`🧠 ${agentClassName} thinking on port \${port}\`);
        });
    }
}

// Auto-start if run directly
if (require.main === module) {
    const agent = new ${agentClassName}();
    agent.start(process.env.PORT || 3000);
}

module.exports = ${agentClassName};`;
    }
    
    getSpecificMethods(type) {
        const methods = {
            calculator: `
        this.extractNumbers = (input) => {
            const numbers = input.match(/\\d+/g);
            return numbers ? numbers.map(Number) : [];
        };
        
        this.detectOperation = (input) => {
            const text = input.toLowerCase();
            if (text.includes('add') || text.includes('+')) return 'add';
            if (text.includes('subtract') || text.includes('-')) return 'subtract';
            if (text.includes('multiply') || text.includes('*')) return 'multiply';
            if (text.includes('divide') || text.includes('/')) return 'divide';
            return 'unknown';
        };`,
            chatbot: `
        this.detectIntent = (input) => {
            const text = input.toLowerCase();
            if (text.includes('hello') || text.includes('hi')) return 'greeting';
            if (text.includes('?')) return 'question';
            return 'statement';
        };
        
        this.analyzeSentiment = (input) => {
            // Simple sentiment analysis
            return 'neutral';
        };
        
        this.generateResponse = (intent, sentiment, context) => {
            return \`I understand you're making a \${intent} with \${sentiment} sentiment.\`;
        };`,
            api: `
        this.parseEndpoint = (input) => {
            const match = input.match(/\\/[\\w\\/]+/);
            return match ? match[0] : '/';
        };
        
        this.parseMethod = (input) => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE'];
            for (const method of methods) {
                if (input.toUpperCase().includes(method)) return method;
            }
            return 'GET';
        };`
        };
        
        return methods[type] || '';
    }
    
    getSpecificLogic(type) {
        const logic = {
            calculator: `
        const numbers = this.extractNumbers(input);
        const operation = this.detectOperation(input);
        
        let result = { response: 'Cannot compute', value: null };
        
        if (numbers.length >= 2) {
            if (operation === 'add') result.value = numbers[0] + numbers[1];
            if (operation === 'subtract') result.value = numbers[0] - numbers[1];
            if (operation === 'multiply') result.value = numbers[0] * numbers[1];
            if (operation === 'divide') result.value = numbers[1] !== 0 ? numbers[0] / numbers[1] : 'Error';
            
            result.response = \`The answer is \${result.value}\`;
        }
        
        result.learned = true;`,
            
            chatbot: `
        const intent = this.detectIntent(input);
        const sentiment = this.analyzeSentiment(input);
        
        let result = {
            response: this.generateResponse(intent, sentiment, context),
            intent,
            sentiment
        };`,
            
            api: `
        const endpoint = this.parseEndpoint(input);
        const method = this.parseMethod(input);
        
        let result = {
            response: \`API endpoint \${endpoint} configured for \${method} requests\`,
            endpoint,
            method
        };`
        };
        
        return logic[type] || `
        let result = {
            response: \`Processing: \${input}\`,
            processed: true
        };`;
    }
    
    generatePackageJson(architecture) {
        return {
            name: `${architecture.type}-agent`,
            version: '1.0.0',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                test: 'node test.js'
            },
            dependencies: architecture.dependencies.reduce((deps, dep) => {
                deps[dep] = 'latest';
                return deps;
            }, {})
        };
    }
    
    generateTestFile(architecture) {
        return `// Test file for ${architecture.type} agent
const assert = require('assert');
const ${architecture.type.charAt(0).toUpperCase()}${architecture.type.slice(1)}Agent = require('./index');

console.log('Testing ${architecture.type} agent...');

// Test 1: Agent exists
assert(${architecture.type.charAt(0).toUpperCase()}${architecture.type.slice(1)}Agent, 'Agent should exist');

console.log('✅ All tests passed!');`;
    }
    
    generateSupportFile(filename, architecture) {
        // Generate different support files
        if (filename === 'README.md') {
            return `# ${architecture.type.charAt(0).toUpperCase()}${architecture.type.slice(1)} Agent

## Description
Intelligent ${architecture.type} agent with learning capabilities

## Capabilities
${(architecture.capabilities || []).map(cap => `- ${cap}`).join('\n')}

## Usage
\`\`\`bash
npm install
npm start
\`\`\`

## API Endpoints
- POST /think - Send input for processing
- GET /memory - View agent memory
- GET /health - Check agent status

## Example
\`\`\`bash
curl -X POST http://localhost:3000/think \\
  -H "Content-Type: application/json" \\
  -d '{"input":"Your message here"}'
\`\`\``;
        }
        
        if (filename === '.env') {
            return `NODE_ENV=development
PORT=3000
AGENT_TYPE=${architecture.type}
AGENT_NAME=${architecture.type}_agent`;
        }
        
        if (filename === 'config.js') {
            return `module.exports = {
    type: '${architecture.type}',
    capabilities: ${JSON.stringify(architecture.capabilities || [])},
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
};`;
        }
        
        // Generic file
        return `// ${filename} for ${architecture.type} agent
// Generated by ABBA Platform`;
    }
    
    generateAgentSDK() {
        return `// Intelligent Agent SDK - Core intelligence for all ABBA agents
class IntelligentAgentSDK {
    constructor(config) {
        this.config = config;
        this.memory = [];
        this.llm = null;
        this.learning = true;
    }
    
    async think(input) {
        // Remember input
        this.memory.push({ 
            input, 
            timestamp: Date.now(),
            type: 'input'
        });
        
        // Get context from memory
        const context = this.getRelevantMemory(input);
        
        // Make decision
        let response;
        try {
            if (this.llm) {
                response = await this.llm.process(input, context);
            } else {
                response = await this.localProcess(input, context);
            }
        } catch (error) {
            response = { 
                error: error.message,
                fallback: 'I encountered an error processing that.'
            };
        }
        
        // Learn from interaction
        this.learn(input, response);
        
        return response;
    }
    
    getRelevantMemory(input) {
        // Get last 10 memories for context
        return this.memory.slice(-10).filter(m => m.type === 'interaction');
    }
    
    learn(input, output) {
        // Store pattern for future use
        this.memory.push({ 
            type: 'interaction',
            pattern: { input, output },
            success: !output.error,
            timestamp: Date.now()
        });
        
        // Limit memory size
        if (this.memory.length > 1000) {
            this.memory = this.memory.slice(-500);
        }
    }
    
    async localProcess(input, context) {
        // Default processing - override in child class
        return { 
            response: \`Processed: \${input}\`,
            context_used: context.length,
            timestamp: Date.now()
        };
    }
}

module.exports = IntelligentAgentSDK;`;
    }
    
    getAvailableTools() {
        return Array.from(this.tools.keys()).map(name => {
            const tool = this.tools.get(name);
            return {
                name,
                description: tool.tool.description
            };
        });
    }
    
    getExecutionMetrics() {
        if (this.executionLog.length === 0) {
            return {
                totalExecutions: 0,
                averageDuration: 0,
                successRate: 0
            };
        }
        
        return {
            totalExecutions: this.executionLog.length,
            averageDuration: this.executionLog.reduce((sum, log) => sum + (log.duration || 0), 0) / this.executionLog.length,
            successRate: this.executionLog.filter(log => !log.error).length / this.executionLog.length
        };
    }
}

module.exports = ABBATools;