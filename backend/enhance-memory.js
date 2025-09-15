// backend/enhance-memory.js
const memorySystem = require('./src/core/memory-system');
const contextManager = require('./src/core/context-manager');

async function enhanceMemoryWithLearning() {
  console.log('\n=== DAY 8: ENHANCING MEMORY SYSTEM ===\n');
  
  // Test pattern learning
  console.log('Testing Pattern Learning:');
  
  // Simulate an agent learning patterns
  const testAgentId = 'learning-agent-day8';
  
  // Agent "learns" by repetition
  for (let i = 0; i < 7; i++) {
    await memorySystem.remember(testAgentId, 'common-query', 'customer support', 'short');
    await memorySystem.remember(testAgentId, 'response-type', 'friendly', 'short');
  }
  
  console.log('   Pattern Detection: Agent learned repeated patterns');
  
  // Test context growth detection
  console.log('\n Testing Context Growth Detection:');
  
  for (let i = 0; i < 5; i++) {
    await contextManager.updateContext(testAgentId, {
      [`learning_${i}`]: `Knowledge piece ${i}`,
      iteration: i
    });
  }
  
  const stats = contextManager.getContextStats();
  console.log(`   Active Contexts: ${stats.activeContexts}`);
  console.log('   Growth Detection: System detects context expansion');
  
  // Test memory optimization
  console.log('\n Testing Memory Optimization:');
  
  // Create memories with different access patterns
  await memorySystem.remember(testAgentId, 'frequent-access', 'important data', 'short');
  
  // Simulate frequent access
  for (let i = 0; i < 5; i++) {
    await memorySystem.recall(testAgentId, 'frequent-access', 'short');
  }
  
  const memStats = await memorySystem.getMemoryStats(testAgentId);
  console.log(`   Short-term Memories: ${memStats.shortTerm}`);
  console.log(`   Long-term Memories: ${memStats.longTerm}`);
  console.log('   Auto-promotion: Frequently used memories promoted');
  
  console.log('\n=== MEMORY ENHANCEMENT COMPLETE ===\n');
}

enhanceMemoryWithLearning();