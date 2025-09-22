const fs = require('fs').promises;
const path = require('path');

async function runConsolidationTests() {
    console.log('🎯 Day 14 - Consolidation Tests\n');
    console.log('='.repeat(50));
    
    const results = {
        passed: [],
        failed: [],
        optimized: []
    };
    
    // Test 1: Verify all agents load
    console.log('\n📝 Testing Agent Loading...');
    const agents = [
        'orchestrator', 'interpreter', 'architect', 'coder',
        'validator', 'testwriter', 'monitor', 'deployer', 'code-reviewer'
    ];
    
    for (const agentName of agents) {
        try {
            const Agent = require(`./src/agents/${agentName}`);
            const agent = new Agent();
            if (agent.name && agent.process) {
                results.passed.push(`${agentName}: Loaded successfully`);
                console.log(`  ✅ ${agentName}`);
            }
        } catch (error) {
            results.failed.push(`${agentName}: ${error.message}`);
            console.log(`  ❌ ${agentName}: ${error.message}`);
        }
    }
    
    // Test 2: File Storage System
    console.log('\n📁 Testing File Storage...');
    const FileStorage = require('./src/core/file-storage');
    const storage = new FileStorage();
    
    try {
        await storage.save('test', 'consolidation', { test: true });
        const data = await storage.load('test', 'consolidation');
        if (data && data.test === true) {
            results.passed.push('File Storage: Working');
            console.log('  ✅ File storage working');
        }
    } catch (error) {
        results.failed.push(`File Storage: ${error.message}`);
        console.log('  ❌ File storage error:', error.message);
    }
    
    // Test 3: Memory System
    console.log('\n🧠 Testing Memory System...');
    const MemorySystem = require('./src/core/memory-system');
    const memory = new MemorySystem();
    await memory.initialize();
    
    try {
        await memory.remember('test-agent', 'test-key', 'test-value');
        const recalled = await memory.recall('test-agent', 'test-key');
        if (recalled === 'test-value') {
            results.passed.push('Memory System: Working');
            console.log('  ✅ Memory system working');
        }
    } catch (error) {
        results.failed.push(`Memory System: ${error.message}`);
        console.log('  ❌ Memory error:', error.message);
    }
    
    // Test 4: API Endpoints
    console.log('\n🌐 Testing API Endpoints...');
    try {
        const fetch = (await import('node-fetch')).default;
        const endpoints = [
            '/api/health',
            '/api/test', 
            '/api/metrics',
            '/api/agents'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`http://localhost:3333${endpoint}`);
                if (response.ok) {
                    console.log(`  ✅ ${endpoint}`);
                    results.passed.push(`Endpoint ${endpoint}: OK`);
                } else {
                    console.log(`  ⚠️ ${endpoint}: Status ${response.status}`);
                }
            } catch (error) {
                console.log(`  ❌ ${endpoint}: Not responding`);
            }
        }
    } catch (error) {
        console.log('  ⚠️ Server may not be running');
    }
    
    // Report
    console.log('\n' + '='.repeat(50));
    console.log('📊 CONSOLIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`\n✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
        console.log('\n⚠️ Issues to fix:');
        results.failed.forEach(issue => console.log(`  - ${issue}`));
    }
    
    return results;
}

// Run if called directly
if (require.main === module) {
    runConsolidationTests().catch(console.error);
}

module.exports = runConsolidationTests;