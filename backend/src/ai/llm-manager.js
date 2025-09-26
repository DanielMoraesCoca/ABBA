class LLMManager {
    constructor() {
        this.useMock = process.env.USE_MOCK_LLM === 'true';
        this.callCount = 0;
        this.costTracker = { total: 0, calls: [] };
        
        if (this.useMock) {
            console.log('🔧 LLM Manager running in MOCK MODE (no API keys needed)');
        } else {
            const { OpenAI } = require('openai');
            const { Anthropic } = require('@anthropic-ai/sdk');
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
    }

    async process(input, options = {}) {
        this.callCount++;
        
        if (this.useMock) {
            return this.mockProcess(input, options);
        }
        
        // Real LLM calls (when you have keys)
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

    mockProcess(input, options) {
        console.log(`[MOCK LLM] Processing: ${input.substring(0, 50)}...`);
        
        // Simulate different responses based on input
        if (input.includes('calculator')) {
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
        // Real implementation when you have keys
    }
    
    trackCost(model, usage) {
        // Cost tracking (only matters with real API)
        if (!this.useMock) {
            const costs = {
                'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
                'gpt-4': { input: 0.03, output: 0.06 }
            };
            
            const modelCost = costs[model] || costs['gpt-3.5-turbo'];
            const cost = (usage.prompt_tokens * modelCost.input + 
                         usage.completion_tokens * modelCost.output) / 1000;
            
            this.costTracker.total += cost;
            console.log(`LLM Call #${this.callCount}: $${cost.toFixed(4)}`);
        }
    }
}

module.exports = LLMManager;