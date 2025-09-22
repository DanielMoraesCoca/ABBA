const AgentOptimizer = require('./src/agents/agent-optimizer');
const runConsolidationTests = require('./test-consolidation');

async function runDay14() {
    console.log('🎯 Day 14 - Consolidation (Without Database)\n');
    console.log('='.repeat(50));
    
    // Step 1: Run initial tests
    console.log('\nPHASE 1: Initial Testing\n');
    const beforeTests = await runConsolidationTests();
    
    // Step 2: Optimize agents
    console.log('\n' + '='.repeat(50));
    console.log('\nPHASE 2: Agent Optimization\n');
    const optimizer = new AgentOptimizer();
    const optimizations = await optimizer.optimizeAllAgents();
    
    console.log('\n📊 Optimization Results:');
    console.log(`  Cache added to: ${optimizations.cacheAdded} agents`);
    console.log(`  Error handling fixed: ${optimizations.errorsFixed} agents`);
    console.log(`  Performance monitoring added: ${optimizations.performanceImproved} agents`);
    
    // Step 3: Run tests again
    console.log('\n' + '='.repeat(50));
    console.log('\nPHASE 3: Post-Optimization Testing\n');
    const afterTests = await runConsolidationTests();
    
    // Step 4: Compare results
    console.log('\n' + '='.repeat(50));
    console.log('📈 IMPROVEMENT METRICS');
    console.log('='.repeat(50));
    
    console.log(`\nBefore Optimization:`);
    console.log(`  Passed: ${beforeTests.passed.length}`);
    console.log(`  Failed: ${beforeTests.failed.length}`);
    
    console.log(`\nAfter Optimization:`);
    console.log(`  Passed: ${afterTests.passed.length}`);
    console.log(`  Failed: ${afterTests.failed.length}`);
    
    const improvement = afterTests.passed.length - beforeTests.passed.length;
    if (improvement > 0) {
        console.log(`\n✨ Fixed ${improvement} issues through optimization!`);
    }
    
    console.log('\n✅ Day 14 Consolidation Complete!');
}

runDay14().catch(console.error);