const fs = require('fs').promises;
const path = require('path');

class MemorySystem {
    constructor() {
        this.shortTermMemory = new Map();
        this.patterns = new Map();
        this.memoryDir = path.join(__dirname, '../../memory');
        this.maxShortTermSize = 100;
        this.compressionEnabled = true;
    }
    
    async initialize() {
        await fs.mkdir(this.memoryDir, { recursive: true });
        await this.loadFromDisk();
        
        // Set up auto-save interval
        setInterval(() => this.saveToDisk(), 60000); // Save every minute
        
        console.log('✅ Memory System initialized (File Storage Mode)');
    }
    
    async remember(agentName, key, value) {
        const memoryKey = `${agentName}:${key}`;
        
        // Ensure value is JSON-serializable
        let processedValue = value;
        
        // If it's a string, wrap it in an object
        if (typeof value === 'string') {
            processedValue = { data: value };
        }
        
        // Compress if large
        if (this.compressionEnabled && JSON.stringify(processedValue).length > 1000) {
            processedValue = this.compress(processedValue);
        }
        
        this.shortTermMemory.set(memoryKey, {
            value: processedValue,
            timestamp: Date.now(),
            accessCount: 1,
            compressed: this.compressionEnabled && JSON.stringify(processedValue).length > 1000
        });
        
        // Manage memory size
        if (this.shortTermMemory.size > this.maxShortTermSize) {
            await this.evictOldest();
        }
        
        return true;
    }
    
    async recall(agentName, key) {
        const memoryKey = `${agentName}:${key}`;
        
        // Check short-term memory
        if (this.shortTermMemory.has(memoryKey)) {
            const memory = this.shortTermMemory.get(memoryKey);
            memory.accessCount++;
            memory.lastAccess = Date.now();
            
            let value = memory.compressed ? 
                this.decompress(memory.value) : 
                memory.value;
            
            // If we wrapped it, unwrap it
            if (value && typeof value === 'object' && value.data !== undefined) {
                return value.data;
            }
            
            return value;
        }
        
        // Load from disk if not in memory
        const filePath = path.join(this.memoryDir, `${agentName}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const memories = JSON.parse(data);
            
            if (memories[key]) {
                // Load into short-term memory
                this.shortTermMemory.set(memoryKey, memories[key]);
                
                let value = memories[key].value;
                
                // If we wrapped it, unwrap it
                if (value && typeof value === 'object' && value.data !== undefined) {
                    return value.data;
                }
                
                return value;
            }
        } catch (error) {
            // Memory not found
        }
        
        return null;
    }
    
    compress(value) {
        // Simple compression: remove whitespace from JSON
        return JSON.stringify(value);
    }
    
    decompress(value) {
        return typeof value === 'string' ? JSON.parse(value) : value;
    }
    
    async evictOldest() {
        const sorted = Array.from(this.shortTermMemory.entries())
            .sort((a, b) => (a[1].lastAccess || a[1].timestamp) - (b[1].lastAccess || b[1].timestamp));
        
        if (sorted.length > 0) {
            // Save oldest to disk before removing
            const [keyToEvict, memory] = sorted[0];
            const [agentName, key] = keyToEvict.split(':');
            
            const filePath = path.join(this.memoryDir, `${agentName}.json`);
            let memories = {};
            
            try {
                const data = await fs.readFile(filePath, 'utf-8');
                memories = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }
            
            memories[key] = memory;
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
            
            // Remove from short-term memory
            this.shortTermMemory.delete(keyToEvict);
        }
    }
    
    async saveToDisk() {
        const agentMemories = {};
        
        // Group memories by agent
        for (const [key, memory] of this.shortTermMemory.entries()) {
            const [agentName, memKey] = key.split(':');
            if (!agentMemories[agentName]) {
                agentMemories[agentName] = {};
            }
            agentMemories[agentName][memKey] = memory;
        }
        
        // Save each agent's memories
        for (const [agentName, memories] of Object.entries(agentMemories)) {
            const filePath = path.join(this.memoryDir, `${agentName}.json`);
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
        }
    }
    
    async loadFromDisk() {
        try {
            const files = await fs.readdir(this.memoryDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const agentName = file.replace('.json', '');
                    const filePath = path.join(this.memoryDir, file);
                    const data = await fs.readFile(filePath, 'utf-8');
                    const memories = JSON.parse(data);
                    
                    // Load recent memories
                    for (const [key, memory] of Object.entries(memories)) {
                        const memoryAge = Date.now() - memory.timestamp;
                        if (memoryAge < 3600000) { // Last hour
                            this.shortTermMemory.set(`${agentName}:${key}`, memory);
                        }
                    }
                }
            }
            
            console.log(`  Loaded ${this.shortTermMemory.size} recent memories`);
        } catch (error) {
            console.log('  No existing memories found');
        }
    }
    
    learnPattern(pattern, response) {
        if (!this.patterns.has(pattern)) {
            this.patterns.set(pattern, []);
        }
        
        const responses = this.patterns.get(pattern);
        responses.push({
            response,
            count: 1,
            success: true,
            timestamp: Date.now()
        });
        
        if (responses.length > 10) {
            responses.shift();
        }
    }
    
    getPatternResponse(pattern) {
        if (this.patterns.has(pattern)) {
            const responses = this.patterns.get(pattern);
            return responses.sort((a, b) => b.count - a.count)[0].response;
        }
        return null;
    }
    
    async getStats() {
        const files = await fs.readdir(this.memoryDir).catch(() => []);
        
        return {
            shortTermMemorySize: this.shortTermMemory.size,
            patternsLearned: this.patterns.size,
            totalMemoryFiles: files.filter(f => f.endsWith('.json')).length,
            compressionEnabled: this.compressionEnabled
        };
    }
}

module.exports = MemorySystem;