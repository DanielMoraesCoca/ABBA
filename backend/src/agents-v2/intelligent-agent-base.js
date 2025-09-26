class IntelligentAgent {
    constructor(config) {
        this.name = config.name;
        this.purpose = config.purpose;
        this.mcp = config.mcp; // MCP connection
        this.llm = config.llm; // LLM fallback
        this.memory = new Map();
        this.tools = [];
    }

    async think(input) {
        // 1. Check memory
        const context = this.recallContext(input);
        
        // 2. Try MCP tools first (cheap/free)
        const toolResult = await this.tryTools(input, context);
        if (toolResult.success) {
            this.remember(input, toolResult.result);
            return toolResult.result;
        }
        
        // 3. Use LLM only if tools insufficient (expensive)
        const llmResult = await this.llm.process(input, {
            systemPrompt: this.purpose,
            context
        });
        
        this.remember(input, llmResult);
        return llmResult;
    }

    async tryTools(input, context) {
        for (const tool of this.tools) {
            if (tool.canHandle(input, context)) {
                try {
                    const result = await tool.execute(input, context);
                    return { success: true, result };
                } catch (error) {
                    console.log(`Tool ${tool.name} failed, trying next`);
                }
            }
        }
        return { success: false };
    }

    recallContext(input) {
        // Retrieve relevant memories
        const relevant = [];
        for (const [key, value] of this.memory) {
            if (this.isRelevant(key, input)) {
                relevant.push(value);
            }
        }
        return relevant;
    }

    remember(input, output) {
        this.memory.set(input, { input, output, timestamp: Date.now() });
        
        // Limit memory size
        if (this.memory.size > 1000) {
            const oldest = Array.from(this.memory.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            this.memory.delete(oldest[0]);
        }
    }

    isRelevant(memory, current) {
        // Simple relevance check - enhance with embeddings later
        return memory.toLowerCase().includes(current.toLowerCase().substring(0, 10));
    }
}

module.exports = IntelligentAgent;