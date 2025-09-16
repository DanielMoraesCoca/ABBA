const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

class MCPConnector {
    constructor() {
        this.clients = new Map();
        this.availableServers = {
            filesystem: {
                command: 'node',
                args: [
                    path.join(__dirname, '../../node_modules/@modelcontextprotocol/server-filesystem/dist/index.js'),
                    path.join(process.cwd(), 'workspace')
                ],
                description: 'File system operations via MCP'
            }
        };
    }

    async connectToServer(serverName) {
        if (this.clients.has(serverName)) {
            return this.clients.get(serverName);
        }

        const serverConfig = this.availableServers[serverName];
        if (!serverConfig) {
            throw new Error(`Unknown MCP server: ${serverName}`);
        }

        try {
            console.log(`🔌 Connecting to ${serverName} MCP server...`);
            
            const client = new Client({
                name: `abba-${serverName}-client`,
                version: '1.0.0'
            }, {
                capabilities: {}
            });

            const transport = new StdioClientTransport({
                command: serverConfig.command,
                args: serverConfig.args,
                env: process.env
            });

            await client.connect(transport);
            this.clients.set(serverName, client);
            
            console.log(`✅ Connected to ${serverName} MCP server`);
            return client;
        } catch (error) {
            console.error(`⚠️ Failed to connect to ${serverName}:`, error.message);
            return null;
        }
    }

    async executeMCPTool(serverName, toolName, args) {
        try {
            const client = await this.connectToServer(serverName);
            if (!client) return null;

            const response = await client.request({
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            }, {});

            return {
                success: true,
                result: response.content
            };
        } catch (error) {
            console.error(`Error executing ${toolName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async listServerTools(serverName) {
        try {
            const client = await this.connectToServer(serverName);
            if (!client) return [];

            const response = await client.request({
                method: 'tools/list'
            }, {});

            return response.tools || [];
        } catch (error) {
            console.error(`Error listing tools for ${serverName}:`, error.message);
            return [];
        }
    }

    async disconnectAll() {
        for (const [name, client] of this.clients) {
            await client.close();
            console.log(`🔌 Disconnected from ${name}`);
        }
    }
}

module.exports = MCPConnector;