// backend/src/core/file-storage.js
const fs = require('fs').promises;
const path = require('path');

class FileStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.agentsFile = path.join(this.dataDir, 'agents.json');
        this.contextsFile = path.join(this.dataDir, 'contexts.json');
        this.memoriesFile = path.join(this.dataDir, 'memories.json');
        this.initializeStorage();
    }

    async initializeStorage() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Initialize files if they don't exist
            const files = [this.agentsFile, this.contextsFile, this.memoriesFile];
            for (const file of files) {
                try {
                    await fs.access(file);
                } catch {
                    await fs.writeFile(file, '[]');
                }
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    // Add the save method that the test expects
    async save(category, id, data) {
        const categoryFile = path.join(this.dataDir, `${category}.json`);
        
        try {
            let items = [];
            try {
                const fileContent = await fs.readFile(categoryFile, 'utf8');
                items = JSON.parse(fileContent);
            } catch {
                // File doesn't exist yet
            }
            
            const existingIndex = items.findIndex(item => item.id === id);
            const dataWithId = { ...data, id };
            
            if (existingIndex >= 0) {
                items[existingIndex] = dataWithId;
            } else {
                items.push(dataWithId);
            }
            
            await fs.writeFile(categoryFile, JSON.stringify(items, null, 2));
            return dataWithId;
        } catch (error) {
            console.error('Error saving:', error);
            throw error;
        }
    }

    // Add the load method that the test expects
    async load(category, id) {
        const categoryFile = path.join(this.dataDir, `${category}.json`);
        
        try {
            const fileContent = await fs.readFile(categoryFile, 'utf8');
            const items = JSON.parse(fileContent);
            return items.find(item => item.id === id);
        } catch {
            return null;
        }
    }

    // Keep existing methods for backward compatibility
    async saveAgent(agent) {
        try {
            const agents = await this.loadAgents();
            const existingIndex = agents.findIndex(a => a.id === agent.id);
            
            if (existingIndex >= 0) {
                agents[existingIndex] = agent;
            } else {
                agents.push(agent);
            }
            
            await fs.writeFile(this.agentsFile, JSON.stringify(agents, null, 2));
            return agent;
        } catch (error) {
            console.error('Error saving agent:', error);
            throw error;
        }
    }

    async loadAgents() {
        try {
            const data = await fs.readFile(this.agentsFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async loadAgent(agentId) {
        const agents = await this.loadAgents();
        return agents.find(a => a.id === agentId);
    }

    async saveContext(agentId, context) {
        try {
            const contexts = await this.loadContexts();
            contexts[agentId] = context;
            await fs.writeFile(this.contextsFile, JSON.stringify(contexts, null, 2));
            return context;
        } catch (error) {
            console.error('Error saving context:', error);
            throw error;
        }
    }

    async loadContexts() {
        try {
            const data = await fs.readFile(this.contextsFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    async loadContext(agentId) {
        const contexts = await this.loadContexts();
        return contexts[agentId];
    }
}

module.exports = FileStorage;