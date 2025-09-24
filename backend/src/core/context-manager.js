// backend/src/core/context-manager.js
const FileStorage = require('./file-storage');
const { v4: uuidv4 } = require('uuid');

class ContextManager {
    constructor() {
        this.contexts = new Map();
        this.storage = new FileStorage();
    }

    async saveContext(agentId, context) {
        try {
            // Save to memory
            this.contexts.set(agentId, context);
            
            // Save to file storage
            await this.storage.saveContext(agentId, context);
            
            console.log(`✅ Context saved for agent ${agentId}`);
            return agentId;
        } catch (error) {
            console.error('Error saving context:', error);
            throw error;
        }
    }

    async loadContext(agentId) {
        try {
            // Check memory first
            if (this.contexts.has(agentId)) {
                return this.contexts.get(agentId);
            }
            
            // Load from file storage
            const context = await this.storage.loadContext(agentId);
            
            if (context) {
                this.contexts.set(agentId, context);
                return context;
            }
            
            return null;
        } catch (error) {
            console.error('Error loading context:', error);
            return null;
        }
    }

    async updateContext(agentId, updates) {
        const currentContext = await this.loadContext(agentId) || {};
        const newContext = { ...currentContext, ...updates, lastUpdated: new Date().toISOString() };
        await this.saveContext(agentId, newContext);
        return newContext;
    }

    async clearContext(agentId) {
        this.contexts.delete(agentId);
        
        try {
            // Clear from file storage by saving empty context
            await this.storage.saveContext(agentId, {});
        } catch (error) {
            console.error('Error clearing context:', error);
        }
    }
}

module.exports = ContextManager;