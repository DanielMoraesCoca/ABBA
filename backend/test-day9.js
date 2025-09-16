async function testDay9() {
    console.log('🎯 Day 9 - MCP Hybrid Tool System\n');
    
    // Check and install dependencies if needed
    try {
        require('nodemailer');
        require('node-fetch');
        require('@modelcontextprotocol/sdk');
    } catch {
        console.log('📦 Installing required packages...\n');
        require('child_process').execSync(
            'npm install nodemailer node-fetch @modelcontextprotocol/sdk @modelcontextprotocol/server-filesystem',
            { stdio: 'inherit' }
        );
    }
    
    // Create workspace directory for MCP filesystem
    const fs = require('fs');
    if (!fs.existsSync('./workspace')) {
        fs.mkdirSync('./workspace', { recursive: true });
    }
    
    // Run the demo
    const ToolDemoAgent = require('./src/agents/tool-demo');
    const agent = new ToolDemoAgent();
    
    const result = await agent.demonstrateTools();
    
    console.log('\n🎉 Day 9 Results:');
    console.log(`  Total tools available: ${result.totalTools}`);
    console.log(`  Tools tested: ${result.toolsTested}`);
    console.log(`  Successful: ${result.successful}/${result.toolsTested}`);
    console.log(`  Success rate: ${Math.round(result.successful/result.toolsTested * 100)}%`);
    
    // Cleanup MCP connections
    if (agent.toolRegistry.mcpConnector) {
        await agent.toolRegistry.mcpConnector.disconnectAll();
    }
    
    console.log('\n✨ Day 9 Complete!');
}

testDay9().catch(console.error);