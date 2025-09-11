// backend/src/core/context-manager.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ContextManager {
  constructor() {
    this.contexts = new Map();
  }

  async saveContext(agentId, context) {
    try {
      // Save to memory
      this.contexts.set(agentId, context);
      
      // Save to database
      const result = await db.query(
        `INSERT INTO agent_contexts (agent_id, context, version) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        [agentId, JSON.stringify(context), 1]
      );
      
      console.log(`✅ Context saved for agent ${agentId}`);
      return result.rows[0].id;
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
      
      // Load from database
      const result = await db.query(
        `SELECT context FROM agent_contexts 
         WHERE agent_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [agentId]
      );
      
      if (result.rows.length > 0) {
        const context = result.rows[0].context;
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
    const newContext = { ...currentContext, ...updates };
    await this.saveContext(agentId, newContext);
    return newContext;
  }

  async clearContext(agentId) {
    this.contexts.delete(agentId);
    await db.query(
      'DELETE FROM agent_contexts WHERE agent_id = $1',
      [agentId]
    );
  }
}

module.exports = new ContextManager(); 