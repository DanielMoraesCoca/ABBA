// backend/src/core/memory-system.js
const db = require('../config/database');

class MemorySystem {
  constructor() {
    this.shortTermMemory = new Map();
    this.memoryLimit = 100; // items per agent
  }

  async remember(agentId, key, value, type = 'short') {
    try {
      // Short term memory (in-memory)
      if (type === 'short') {
        if (!this.shortTermMemory.has(agentId)) {
          this.shortTermMemory.set(agentId, new Map());
        }
        
        const agentMemory = this.shortTermMemory.get(agentId);
        agentMemory.set(key, {
          value,
          timestamp: Date.now()
        });
        
        // Limit memory size
        if (agentMemory.size > this.memoryLimit) {
          const firstKey = agentMemory.keys().next().value;
          agentMemory.delete(firstKey);
        }
      }
      
      // Long term memory (database)
      if (type === 'long') {
        await db.query(
          `INSERT INTO agent_memories (agent_id, memory_type, content)
           VALUES ($1, $2, $3)`,
          [agentId, type, JSON.stringify({ key, value })]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error saving memory:', error);
      return false;
    }
  }

  async recall(agentId, key, type = 'short') {
    try {
      // Check short term memory
      if (type === 'short' && this.shortTermMemory.has(agentId)) {
        const agentMemory = this.shortTermMemory.get(agentId);
        if (agentMemory.has(key)) {
          return agentMemory.get(key).value;
        }
      }
      
      // Check long term memory
      if (type === 'long') {
        const result = await db.query(
          `SELECT content FROM agent_memories 
           WHERE agent_id = $1 AND content->>'key' = $2
           ORDER BY created_at DESC LIMIT 1`,
          [agentId, key]
        );
        
        if (result.rows.length > 0) {
          return result.rows[0].content.value;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error recalling memory:', error);
      return null;
    }
  }

  async forget(agentId, key = null) {
    try {
      if (key) {
        // Forget specific memory
        if (this.shortTermMemory.has(agentId)) {
          this.shortTermMemory.get(agentId).delete(key);
        }
        
        await db.query(
          `DELETE FROM agent_memories 
           WHERE agent_id = $1 AND content->>'key' = $2`,
          [agentId, key]
        );
      } else {
        // Forget all memories for agent
        this.shortTermMemory.delete(agentId);
        
        await db.query(
          'DELETE FROM agent_memories WHERE agent_id = $1',
          [agentId]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error forgetting memory:', error);
      return false;
    }
  }

  async getMemoryStats(agentId) {
    const shortTermSize = this.shortTermMemory.has(agentId) 
      ? this.shortTermMemory.get(agentId).size 
      : 0;
    
    const longTermResult = await db.query(
      'SELECT COUNT(*) as count FROM agent_memories WHERE agent_id = $1',
      [agentId]
    );
    
    return {
      shortTerm: shortTermSize,
      longTerm: parseInt(longTermResult.rows[0].count),
      total: shortTermSize + parseInt(longTermResult.rows[0].count)
    };
  }
}

module.exports = new MemorySystem();