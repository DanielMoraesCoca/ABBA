// backend/src/core/tool-registry.js
const db = require('../config/database');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.loadBuiltInTools();
  }

  loadBuiltInTools() {
    // Email tool
    this.registerTool({
      name: 'email',
      category: 'communication',
      description: 'Send and receive emails',
      handler: async (params) => {
        // Email implementation
        console.log('Sending email:', params);
        return { success: true, messageId: Date.now() };
      },
      config: {
        requiresAuth: true,
        rateLimit: 100
      }
    });

    // Database tool
    this.registerTool({
      name: 'database',
      category: 'data',
      description: 'Query and manipulate database',
      handler: async (params) => {
        // Safe database operations
        if (params.operation === 'read') {
          return { success: true, data: [] };
        }
        return { success: false, error: 'Operation not allowed' };
      },
      config: {
        requiresAuth: true,
        permissions: ['read']
      }
    });

    // HTTP tool
    this.registerTool({
      name: 'http',
      category: 'network',
      description: 'Make HTTP requests',
      handler: async (params) => {
        const axios = require('axios');
        try {
          const response = await axios(params);
          return { success: true, data: response.data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      config: {
        requiresAuth: false,
        rateLimit: 50
      }
    });

    // File system tool
    this.registerTool({
      name: 'filesystem',
      category: 'system',
      description: 'Read and write files',
      handler: async (params) => {
        const fs = require('fs').promises;
        if (params.operation === 'read') {
          const content = await fs.readFile(params.path, 'utf8');
          return { success: true, content };
        }
        return { success: false, error: 'Write operations disabled' };
      },
      config: {
        requiresAuth: true,
        permissions: ['read']
      }
    });
  }

  async registerTool(tool) {
    try {
      // Register in memory
      this.tools.set(tool.name, tool);
      
      // Save to database
      await db.query(
        `INSERT INTO agent_tools (name, category, description, config, permissions)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE
         SET category = $2, description = $3, config = $4, permissions = $5`,
        [
          tool.name,
          tool.category,
          tool.description,
          JSON.stringify(tool.config || {}),
          JSON.stringify(tool.permissions || [])
        ]
      );
      
      console.log(`✅ Tool registered: ${tool.name}`);
      return true;
    } catch (error) {
      console.error('Error registering tool:', error);
      return false;
    }
  }

  async useTool(toolName, params, agentId) {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // Check permissions
    if (tool.config?.requiresAuth && !agentId) {
      throw new Error(`Tool ${toolName} requires authentication`);
    }
    
    // Execute tool
    try {
      const result = await tool.handler(params);
      
      // Log execution
      await db.query(
        `INSERT INTO executions (agent_id, input, output, status)
         VALUES ($1, $2, $3, $4)`,
        [
          agentId || null,
          JSON.stringify({ tool: toolName, params }),
          JSON.stringify(result),
          result.success ? 'success' : 'failed'
        ]
      );
      
      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  getAvailableTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      category: tool.category,
      description: tool.description,
      config: tool.config
    }));
  }

  getTool(name) {
    return this.tools.get(name);
  }
}

module.exports = new ToolRegistry();