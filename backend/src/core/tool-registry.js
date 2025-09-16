const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const MCPConnector = require('./mcp-connector');

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.usageLog = [];
        this.mcpConnector = new MCPConnector(); // NEW: MCP connection
        
        // Register default tools
        this.registerDefaultTools();
        
        // NEW: Register real-world tools
        this.registerRealWorldTools();
    }
    
    registerDefaultTools() {
        // File operations
        this.register({
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' }
                },
                required: ['path']
            },
            execute: async ({ path: filePath }) => {
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    return { success: true, content };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        });
        
        this.register({
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' },
                    content: { type: 'string', description: 'Content to write' }
                },
                required: ['path', 'content']
            },
            execute: async ({ path: filePath, content }) => {
                try {
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, content, 'utf-8');
                    return { success: true, path: filePath };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        });
        
        // System operations
        this.register({
            name: 'execute_command',
            description: 'Execute a shell command',
            inputSchema: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Command to execute' }
                },
                required: ['command']
            },
            execute: async ({ command }) => {
                const { exec } = require('child_process').promises;
                try {
                    const { stdout, stderr } = await exec(command);
                    return { success: true, stdout, stderr };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        });
    }
    
    // NEW METHOD: Register real-world tools
    registerRealWorldTools() {
        // Email tool using Nodemailer
        this.register({
            name: 'send_email',
            description: 'Send an email via SMTP',
            inputSchema: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Recipient email' },
                    subject: { type: 'string', description: 'Email subject' },
                    text: { type: 'string', description: 'Email body text' },
                    html: { type: 'string', description: 'HTML body (optional)' }
                },
                required: ['to', 'subject', 'text']
            },
            execute: async (params) => {
                try {
                    // Using Ethereal for testing (fake SMTP)
                    const testAccount = await nodemailer.createTestAccount();
                    
                    const transporter = nodemailer.createTransporter({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass
                        }
                    });
                    
                    const info = await transporter.sendMail({
                        from: '"ABBA System" <abba@example.com>',
                        to: params.to,
                        subject: params.subject,
                        text: params.text,
                        html: params.html || `<p>${params.text}</p>`
                    });
                    
                    return {
                        success: true,
                        messageId: info.messageId,
                        previewUrl: nodemailer.getTestMessageUrl(info)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        });
        
        // HTTP Request tool
        this.register({
            name: 'http_request',
            description: 'Make HTTP requests to external APIs',
            inputSchema: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to request' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
                    headers: { type: 'object', description: 'Request headers' },
                    body: { type: 'object', description: 'Request body for POST/PUT' }
                },
                required: ['url', 'method']
            },
            execute: async (params) => {
                try {
                    const fetch = (await import('node-fetch')).default;
                    
                    const options = {
                        method: params.method,
                        headers: params.headers || {}
                    };
                    
                    if (params.body && (params.method === 'POST' || params.method === 'PUT')) {
                        options.body = JSON.stringify(params.body);
                        options.headers['Content-Type'] = 'application/json';
                    }
                    
                    const response = await fetch(params.url, options);
                    const data = await response.json();
                    
                    return {
                        success: true,
                        status: response.status,
                        data
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        });
        
        // Database tool using file-storage (your existing system)
        this.register({
            name: 'store_data',
            description: 'Store data using file storage system',
            inputSchema: {
                type: 'object',
                properties: {
                    collection: { type: 'string', description: 'Collection name' },
                    key: { type: 'string', description: 'Data key' },
                    data: { type: 'object', description: 'Data to store' }
                },
                required: ['collection', 'key', 'data']
            },
            execute: async (params) => {
                try {
                    const FileStorage = require('./file-storage');
                    const storage = new FileStorage();
                    
                    await storage.save(`${params.collection}/${params.key}`, params.data);
                    
                    return {
                        success: true,
                        message: 'Data stored successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        });
        
        // Calendar tool (mock for now, can be enhanced later)
        this.register({
            name: 'create_calendar_event',
            description: 'Create a calendar event',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Event title' },
                    date: { type: 'string', description: 'Event date (ISO format)' },
                    duration: { type: 'number', description: 'Duration in minutes' },
                    attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee emails' }
                },
                required: ['title', 'date']
            },
            execute: async (params) => {
                try {
                    const FileStorage = require('./file-storage');
                    const storage = new FileStorage();
                    
                    const event = {
                        id: `event-${Date.now()}`,
                        ...params,
                        created: new Date().toISOString()
                    };
                    
                    await storage.save(`calendar/${event.id}`, event);
                    
                    return {
                        success: true,
                        eventId: event.id,
                        message: 'Calendar event created (mock implementation)'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        });
        
        // WhatsApp preparation (for future days)
        this.register({
            name: 'whatsapp_send',
            description: 'Send WhatsApp message (coming Day 12)',
            inputSchema: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Phone number' },
                    message: { type: 'string', description: 'Message text' }
                },
                required: ['to', 'message']
            },
            execute: async (params) => {
                return {
                    success: true,
                    message: 'WhatsApp integration coming on Day 12',
                    mockData: params
                };
            }
        });
        
        console.log('✅ Real-world tools registered');
    }
    
    // NEW METHOD: Execute tool via MCP if available, fallback to local
    async executeTool(toolName, params) {
        // First, try MCP filesystem server for file operations
        if (toolName.startsWith('file_') || toolName.startsWith('read_') || toolName.startsWith('write_')) {
            const mcpResult = await this.mcpConnector.executeMCPTool('filesystem', toolName, params);
            if (mcpResult && mcpResult.success) {
                return mcpResult;
            }
            // Fallback to local implementation
        }
        
        // Execute using local tool registry
        return this.execute(toolName, params);
    }
    
    register(tool) {
        if (!tool.name || !tool.execute) {
            throw new Error('Tool must have a name and execute function');
        }
        
        this.tools.set(tool.name, tool);
        console.log(`📦 Registered tool: ${tool.name}`);
    }
    
    async execute(toolName, params = {}) {
        const tool = this.tools.get(toolName);
        
        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolName}' not found`
            };
        }
        
        const startTime = Date.now();
        
        try {
            const result = await tool.execute(params);
            
            // Log usage
            this.usageLog.push({
                tool: toolName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                success: result.success
            });
            
            return {
                success: true,
                result
            };
        } catch (error) {
            this.usageLog.push({
                tool: toolName,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    list() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
    }
    
    getUsageStats() {
        const stats = {};
        
        for (const log of this.usageLog) {
            if (!stats[log.tool]) {
                stats[log.tool] = {
                    total: 0,
                    success: 0,
                    failed: 0,
                    avgDuration: 0
                };
            }
            
            stats[log.tool].total++;
            if (log.success) {
                stats[log.tool].success++;
            } else {
                stats[log.tool].failed++;
            }
        }
        
        return stats;
    }
    
    // NEW METHOD: List all tools including MCP tools
    async listAllTools() {
        const localTools = this.list();
        const mcpTools = await this.mcpConnector.listServerTools('filesystem');
        
        return {
            local: localTools,
            mcp: mcpTools,
            total: localTools.length + mcpTools.length
        };
    }
}

module.exports = ToolRegistry;