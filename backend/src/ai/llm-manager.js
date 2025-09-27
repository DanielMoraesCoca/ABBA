const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

class LLMManager {
    constructor() {
        this.useMock = process.env.USE_MOCK_LLM === 'true';
        this.callCount = 0;
        this.costTracker = { total: 0, calls: [] };
        
        if (this.useMock) {
            console.log('🔧 LLM Manager running in MOCK MODE (no API keys needed)');
        } else {
            console.log('🤖 LLM Manager running in PRODUCTION MODE with real AI');
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
    }

    async process(input, options = {}) {
        this.callCount++;
        
        if (this.useMock) {
            return this.mockProcess(input, options);
        }
        
        // Real LLM calls
        const provider = options.provider || 'openai';
        const model = options.model || 'gpt-3.5-turbo';
        
        try {
            if (provider === 'openai') {
                return await this.callOpenAI(input, model, options);
            } else {
                return await this.callAnthropic(input, options);
            }
        } catch (error) {
            console.error('LLM call failed:', error);
            throw error;
        }
    }

    async callOpenAI(input, model, options) {
        console.log(`📡 Calling OpenAI ${model}...`);
        
        const response = await this.openai.chat.completions.create({
            model,
            messages: [
                { 
                    role: 'system', 
                    content: options.systemPrompt || 'You are an AI assistant that helps create intelligent agent architectures and code.'
                },
                { role: 'user', content: input }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000
        });
        
        // Track cost
        this.trackCost(model, response.usage);
        
        return response.choices[0].message.content;
    }

    async callAnthropic(input, options) {
        console.log(`📡 Calling Anthropic Claude...`);
        
        const response = await this.anthropic.messages.create({
            model: options.model || 'claude-3-sonnet-20240229',
            max_tokens: options.maxTokens || 2000,
            messages: [
                { role: 'user', content: input }
            ],
            temperature: options.temperature || 0.7
        });
        
        // Track cost for Anthropic
        this.trackAnthropicCost(options.model || 'claude-3-sonnet', response.usage);
        
        return response.content[0].text;
    }

    mockProcess(input, options) {
        console.log(`[MOCK LLM] Processing: ${input.substring(0, 50)}...`);
        
        // Return appropriate mock response based on context
        if (input.includes('architecture')) {
            return {
                type: 'chatbot',
                files: ['index.js', 'agent-sdk.js', 'package.json', 'README.md'],
                dependencies: ['express', 'dotenv'],
                capabilities: ['conversation', 'nlp', 'learning'],
                structure: {
                    '/': ['index.js', 'agent-sdk.js', 'package.json'],
                    '/lib': ['nlp.js', 'memory.js'],
                    '/tests': ['test.js']
                }
            };
        } else if (input.includes('calculator')) {
            return {
                type: 'calculator',
                code: 'class Calculator { add(a,b) { return a+b; } }',
                description: 'MOCK: Calculator agent generated'
            };
        } else if (input.includes('chatbot')) {
            return {
                type: 'chatbot',
                code: 'class Chatbot { respond(msg) { return "Hello!"; } }',
                description: 'MOCK: Chatbot agent generated'
            };
        } else {
            return {
                type: 'general',
                code: 'class Agent { process(input) { return input; } }',
                description: 'MOCK: General agent generated'
            };
        }
    }

    async identifyType(input) {
        if (this.useMock) {
            if (input.includes('calculator')) return { type: 'calculator', confidence: 1.0 };
            if (input.includes('chat')) return { type: 'chatbot', confidence: 0.9 };
            return { type: 'general', confidence: 0.5 };
        }
        
        // Real LLM identification
        const response = await this.process(
            `Analyze this agent description and identify its type. Description: "${input}"
            
            Respond with JSON only:
            {
                "type": "one of: calculator, chatbot, api, automation, database, general",
                "confidence": 0.0 to 1.0,
                "capabilities": ["array", "of", "capabilities"],
                "complexity": "simple, medium, or complex"
            }`,
            { 
                temperature: 0.3,
                model: 'gpt-3.5-turbo'
            }
        );
        
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse LLM response:', response);
            return { 
                type: 'general', 
                confidence: 0.5,
                capabilities: ['basic'],
                complexity: 'simple'
            };
        }
    }
    
    trackCost(model, usage) {
        if (!usage) return;
        
        const costs = {
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
            'gpt-4o': { input: 0.005, output: 0.015 }
        };
        
        const modelCost = costs[model] || costs['gpt-3.5-turbo'];
        const cost = (usage.prompt_tokens * modelCost.input + 
                     usage.completion_tokens * modelCost.output) / 1000;
        
        this.costTracker.total += cost;
        this.costTracker.calls.push({
            model,
            tokens: usage.total_tokens,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            cost,
            timestamp: new Date()
        });
        
        console.log(`💰 LLM Call #${this.callCount}:`);
        console.log(`   Model: ${model}`);
        console.log(`   Tokens: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
        console.log(`   Cost: $${cost.toFixed(4)}`);
        console.log(`   Total spent: $${this.costTracker.total.toFixed(4)}`);
    }

    trackAnthropicCost(model, usage) {
        if (!usage) return;
        
        const costs = {
            'claude-3-opus': { input: 0.015, output: 0.075 },
            'claude-3-sonnet': { input: 0.003, output: 0.015 },
            'claude-3-haiku': { input: 0.00025, output: 0.00125 }
        };
        
        const modelCost = costs[model] || costs['claude-3-sonnet'];
        const cost = (usage.input_tokens * modelCost.input + 
                     usage.output_tokens * modelCost.output) / 1000;
        
        this.costTracker.total += cost;
        this.costTracker.calls.push({
            model,
            tokens: usage.input_tokens + usage.output_tokens,
            cost,
            timestamp: new Date()
        });
        
        console.log(`💰 Anthropic Call #${this.callCount}: $${cost.toFixed(4)} (Total: $${this.costTracker.total.toFixed(4)})`);
    }

    getCostReport() {
        return {
            totalCalls: this.callCount,
            totalCost: this.costTracker.total,
            averageCostPerCall: this.callCount > 0 ? this.costTracker.total / this.callCount : 0,
            calls: this.costTracker.calls
        };
    }
}

module.exports = LLMManager;