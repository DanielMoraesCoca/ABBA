const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fileStorage = require('./file-storage');  // This is an instance, not a class
const fs = require('fs').promises;
const path = require('path');

class APIGateway {
    constructor() {
        this.storage = fileStorage;  // Use the existing instance
        this.activeConnections = new Map();
        this.webhookSubscriptions = new Map();
        this.rateLimits = new Map();
        
        // API versioning
        this.version = 'v1';
        this.baseUrl = `/api/${this.version}`;
        
        // Ensure additional directories exist
        this.ensureDirectories();
    }
    
    async ensureDirectories() {
        const dataDir = path.join(__dirname, '../../data');
        try {
            await fs.mkdir(path.join(dataDir, 'agents'), { recursive: true });
            await fs.mkdir(path.join(dataDir, 'webhooks'), { recursive: true });
            await fs.mkdir(path.join(dataDir, 'executions'), { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }
    
    // Helper methods to work with your file-storage pattern
    async save(filePath, data) {
        const dataDir = path.join(__dirname, '../../data');
        const fullPath = path.join(dataDir, filePath + '.json');
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    }
    
    async load(filePath) {
        try {
            const dataDir = path.join(__dirname, '../../data');
            const fullPath = path.join(dataDir, filePath + '.json');
            const data = await fs.readFile(fullPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
    
    async list(directory) {
        try {
            const dataDir = path.join(__dirname, '../../data');
            const dirPath = path.join(dataDir, directory);
            const files = await fs.readdir(dirPath);
            const items = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await this.load(path.join(directory, file.replace('.json', '')));
                    if (data) items.push(data);
                }
            }
            
            return items;
        } catch (error) {
            return [];
        }
    }
    
    async delete(filePath) {
        try {
            const dataDir = path.join(__dirname, '../../data');
            const fullPath = path.join(dataDir, filePath + '.json');
            await fs.unlink(fullPath);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }

    // Initialize all routes
    setupRoutes() {
        const router = express.Router();

        // Health check
        router.get('/health', this.healthCheck.bind(this));

        // Agent management
        router.post('/agents', this.createAgent.bind(this));
        router.get('/agents', this.listAgents.bind(this));
        router.get('/agents/:id', this.getAgent.bind(this));
        router.post('/agents/:id/execute', this.executeAgent.bind(this));
        router.delete('/agents/:id', this.deleteAgent.bind(this));

        // Webhook management
        router.post('/webhooks/subscribe', this.subscribeWebhook.bind(this));
        router.delete('/webhooks/:id', this.unsubscribeWebhook.bind(this));
        router.post('/webhooks/test/:id', this.testWebhook.bind(this));

        // Tool execution
        router.post('/tools/execute', this.executeTool.bind(this));
        router.get('/tools', this.listTools.bind(this));

        // Batch operations
        router.post('/batch', this.batchExecute.bind(this));

        return router;
    }

    // Health check endpoint
    async healthCheck(req, res) {
        const health = {
            status: 'healthy',
            version: this.version,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            activeConnections: this.activeConnections.size,
            webhookSubscriptions: this.webhookSubscriptions.size
        };
        res.json(health);
    }

    // Create new agent via API
    async createAgent(req, res) {
        try {
            const { name, description, type, config } = req.body;
            
            if (!name || !description) {
                return res.status(400).json({
                    error: 'Name and description are required'
                });
            }

            // Import and use your existing orchestrator
            const OrchestratorAgent = require('../agents/orchestrator');
            const orchestrator = new OrchestratorAgent();
            
            // Create agent using your existing pipeline
            const result = await orchestrator.processRequest(description);
            
            // Save agent configuration
            const agentId = uuidv4();
            const agentData = {
                id: agentId,
                name,
                description,
                type: type || 'custom',
                config: config || {},
                created: new Date().toISOString(),
                ...result
            };
            
            await this.save(`agents/${agentId}`, agentData);
            
            res.status(201).json({
                success: true,
                agentId,
                message: 'Agent created successfully',
                data: agentData
            });
        } catch (error) {
            console.error('Error creating agent:', error);
            res.status(500).json({
                error: 'Failed to create agent',
                details: error.message
            });
        }
    }

    // List all agents
    async listAgents(req, res) {
        try {
            const agents = await this.list('agents');
            res.json({
                success: true,
                count: agents.length,
                agents
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to list agents',
                details: error.message
            });
        }
    }

    // Get specific agent
    async getAgent(req, res) {
        try {
            const { id } = req.params;
            const agent = await this.load(`agents/${id}`);
            
            if (!agent) {
                return res.status(404).json({
                    error: 'Agent not found'
                });
            }
            
            res.json({
                success: true,
                agent
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get agent',
                details: error.message
            });
        }
    }

    // Execute agent task
    async executeAgent(req, res) {
        try {
            const { id } = req.params;
            const { task, params } = req.body;
            
            const agent = await this.load(`agents/${id}`);
            if (!agent) {
                return res.status(404).json({
                    error: 'Agent not found'
                });
            }
            
            // Log execution start
            const executionId = uuidv4();
            const executionLog = {
                id: executionId,
                agentId: id,
                task,
                params,
                status: 'running',
                started: new Date().toISOString()
            };
            
            await this.save(`executions/${executionId}`, executionLog);
            
            // TODO: Execute actual agent task based on type
            // For now, return mock success
            const result = {
                success: true,
                executionId,
                message: `Agent ${agent.name} executed task: ${task}`,
                result: {
                    // Mock result data
                    processed: true,
                    output: `Task ${task} completed`
                }
            };
            
            // Update execution log
            executionLog.status = 'completed';
            executionLog.completed = new Date().toISOString();
            executionLog.result = result;
            await this.save(`executions/${executionId}`, executionLog);
            
            // Trigger webhooks if any
            await this.triggerWebhooks('agent.executed', {
                agentId: id,
                executionId,
                task,
                result
            });
            
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to execute agent',
                details: error.message
            });
        }
    }

    // Delete agent
    async deleteAgent(req, res) {
        try {
            const { id } = req.params;
            await this.delete(`agents/${id}`);
            
            res.json({
                success: true,
                message: 'Agent deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to delete agent',
                details: error.message
            });
        }
    }

    // Subscribe to webhook
    async subscribeWebhook(req, res) {
        try {
            const { url, events, secret } = req.body;
            
            if (!url || !events) {
                return res.status(400).json({
                    error: 'URL and events are required'
                });
            }
            
            const subscriptionId = uuidv4();
            const subscription = {
                id: subscriptionId,
                url,
                events: Array.isArray(events) ? events : [events],
                secret,
                created: new Date().toISOString(),
                active: true
            };
            
            await this.save(`webhooks/${subscriptionId}`, subscription);
            this.webhookSubscriptions.set(subscriptionId, subscription);
            
            res.status(201).json({
                success: true,
                subscriptionId,
                message: 'Webhook subscription created',
                subscription
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to subscribe webhook',
                details: error.message
            });
        }
    }

    // Unsubscribe webhook
    async unsubscribeWebhook(req, res) {
        try {
            const { id } = req.params;
            
            await this.delete(`webhooks/${id}`);
            this.webhookSubscriptions.delete(id);
            
            res.json({
                success: true,
                message: 'Webhook unsubscribed successfully'
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to unsubscribe webhook',
                details: error.message
            });
        }
    }

    // Test webhook
    async testWebhook(req, res) {
        try {
            const { id } = req.params;
            const subscription = this.webhookSubscriptions.get(id);
            
            if (!subscription) {
                return res.status(404).json({
                    error: 'Webhook subscription not found'
                });
            }
            
            const testPayload = {
                test: true,
                subscriptionId: id,
                timestamp: new Date().toISOString(),
                message: 'Test webhook from ABBA'
            };
            
            const result = await this.sendWebhook(subscription.url, testPayload, subscription.secret);
            
            res.json({
                success: result.success,
                message: result.success ? 'Test webhook sent successfully' : 'Test webhook failed',
                details: result
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to test webhook',
                details: error.message
            });
        }
    }

    // Execute tool via API
    async executeTool(req, res) {
        try {
            const { tool, params } = req.body;
            
            const ToolRegistry = require('./tool-registry');
            const registry = new ToolRegistry();
            
            const result = await registry.execute(tool, params);
            
            res.json({
                success: true,
                tool,
                result
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to execute tool',
                details: error.message
            });
        }
    }

    // List available tools
    async listTools(req, res) {
        try {
            const ToolRegistry = require('./tool-registry');
            const registry = new ToolRegistry();
            
            const tools = registry.list();
            
            res.json({
                success: true,
                count: tools.length,
                tools
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to list tools',
                details: error.message
            });
        }
    }

    // Batch execute multiple operations
    async batchExecute(req, res) {
        try {
            const { operations } = req.body;
            
            if (!Array.isArray(operations)) {
                return res.status(400).json({
                    error: 'Operations must be an array'
                });
            }
            
            const results = [];
            
            for (const op of operations) {
                try {
                    let result;
                    
                    switch (op.type) {
                        case 'agent':
                            // Execute agent task
                            result = {
                                type: 'agent',
                                success: true,
                                data: `Agent operation: ${op.action}`
                            };
                            break;
                        case 'tool':
                            // Execute tool
                            const ToolRegistry = require('./tool-registry');
                            const registry = new ToolRegistry();
                            result = await registry.execute(op.tool, op.params);
                            break;
                        default:
                            result = {
                                success: false,
                                error: `Unknown operation type: ${op.type}`
                            };
                    }
                    
                    results.push({
                        ...op,
                        result
                    });
                } catch (error) {
                    results.push({
                        ...op,
                        result: {
                            success: false,
                            error: error.message
                        }
                    });
                }
            }
            
            res.json({
                success: true,
                count: results.length,
                results
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to execute batch operations',
                details: error.message
            });
        }
    }

    // Trigger webhooks for an event
    async triggerWebhooks(event, data) {
        const subscriptions = Array.from(this.webhookSubscriptions.values())
            .filter(sub => sub.active && sub.events.includes(event));
        
        for (const sub of subscriptions) {
            try {
                await this.sendWebhook(sub.url, {
                    event,
                    data,
                    timestamp: new Date().toISOString()
                }, sub.secret);
            } catch (error) {
                console.error(`Failed to send webhook to ${sub.url}:`, error);
            }
        }
    }

    // Send webhook
    async sendWebhook(url, payload, secret) {
        try {
            const fetch = (await import('node-fetch')).default;
            const crypto = require('crypto');
            
            const body = JSON.stringify(payload);
            
            const headers = {
                'Content-Type': 'application/json',
                'X-ABBA-Event': payload.event || 'custom',
                'X-ABBA-Timestamp': new Date().toISOString()
            };
            
            // Add signature if secret provided
            if (secret) {
                const signature = crypto
                    .createHmac('sha256', secret)
                    .update(body)
                    .digest('hex');
                headers['X-ABBA-Signature'] = `sha256=${signature}`;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body
            });
            
            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Rate limiting check
    checkRateLimit(clientId, limit = 100) {
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window
        
        if (!this.rateLimits.has(clientId)) {
            this.rateLimits.set(clientId, []);
        }
        
        const requests = this.rateLimits.get(clientId);
        const recentRequests = requests.filter(time => now - time < windowMs);
        
        if (recentRequests.length >= limit) {
            return false;
        }
        
        recentRequests.push(now);
        this.rateLimits.set(clientId, recentRequests);
        
        return true;
    }
}

module.exports = APIGateway;