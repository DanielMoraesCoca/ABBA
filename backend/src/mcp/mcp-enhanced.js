const MCPServer = require('../core/mcp-server');
const LLMManager = require('../ai/llm-manager');

class MCPEnhanced extends MCPServer {
    constructor() {
        super();
        this.toolCache = new Map();
        this.llmFallback = null;
    }

    async initialize() {
        // Register cost-saving tools
        this.registerIntelligentTools();
        this.llmFallback = new LLMManager();
        await this.llmFallback.initialize();
    }

    registerIntelligentTools() {
        // Pattern recognition tool (no LLM needed)
        this.registerTool({
            name: 'identify_agent_type',
            description: 'Identify agent type from description',
            execute: async (input) => {
                const patterns = {
                    calculator: /calculat|math|add|subtract|multiply|divide/i,
                    chatbot: /chat|convers|talk|respond/i,
                    api: /api|endpoint|rest|http/i,
                    database: /database|crud|store|retrieve/i,
                    automation: /automat|schedule|trigger|workflow/i
                };
                
                for (const [type, pattern] of Object.entries(patterns)) {
                    if (pattern.test(input)) {
                        return { type, confidence: 0.9, method: 'pattern' };
                    }
                }
                
                // Only use LLM if patterns fail
                return this.llmFallback ? 
                    await this.llmFallback.identifyType(input) : 
                    { type: 'general', confidence: 0.3, method: 'default' };
            }
        });

        // Code structure generator (template-based, no LLM)
        this.registerTool({
            name: 'generate_base_structure',
            description: 'Generate base code structure',
            execute: async (spec) => {
                // Return cached structure for common types
                const structures = {
                    calculator: this.getCalculatorStructure(),
                    api: this.getAPIStructure(),
                    chatbot: this.getChatbotStructure()
                };
                
                return structures[spec.type] || this.getDefaultStructure();
            }
        });
    }

    async process(input, preferTool = true) {
        // Try tool first
        if (preferTool) {
            const tool = this.findBestTool(input);
            if (tool) {
                // Check cache
                const cacheKey = `${tool.name}:${JSON.stringify(input)}`;
                if (this.toolCache.has(cacheKey)) {
                    return this.toolCache.get(cacheKey);
                }
                
                const result = await tool.execute(input);
                this.toolCache.set(cacheKey, result);
                return result;
            }
        }
        
        // Fallback to LLM only if necessary
        return this.llmFallback.process(input);
    }

    getCalculatorStructure() {
        return {
            files: {
                'index.js': `
class CalculatorAgent {
    constructor() {
        this.mcp = new MCPClient();
    }
    
    add(a, b) { return a + b; }
    subtract(a, b) { return a - b; }
    multiply(a, b) { return a * b; }
    divide(a, b) { 
        if (b === 0) throw new Error('Division by zero');
        return a / b; 
    }
}`,
                'package.json': {
                    name: 'calculator-agent',
                    dependencies: {
                        '@modelcontextprotocol/sdk': 'latest'
                    }
                }
            }
        };
    }

    getAPIStructure() {
        // Similar structure for API agents
    }

    getChatbotStructure() {
        // Structure with LLM integration
    }

    getDefaultStructure() {
        // Fallback structure
    }
}

module.exports = MCPEnhanced;