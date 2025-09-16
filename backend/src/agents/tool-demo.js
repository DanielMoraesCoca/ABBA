const OrchestratorAgent = require('./orchestrator');
const ToolRegistry = require('../core/tool-registry');

class ToolDemoAgent extends OrchestratorAgent {
    constructor() {
        super();
        this.name = 'tool-demo';
        this.role = 'Tool System Demonstrator';
        this.toolRegistry = new ToolRegistry();
    }
    
    async demonstrateTools() {
        console.log('\n🚀 ABBA Tool System Demo - Day 9\n' + '='.repeat(50));
        
        // List all available tools
        const allTools = await this.toolRegistry.listAllTools();
        console.log('\n📦 Available Tools:');
        console.log(`  Local tools: ${allTools.local.length}`);
        console.log(`  MCP tools: ${allTools.mcp.length}`);
        console.log(`  Total: ${allTools.total} tools\n`);
        
        const results = [];
        
        // Demo 1: Email
        console.log('📧 Demo 1: Sending Email...');
        const emailResult = await this.toolRegistry.execute('send_email', {
            to: 'investor@example.com',
            subject: 'ABBA Agent - Automated Email',
            text: 'This email was sent by an AI agent created through natural language description!',
            html: '<h2>ABBA Works!</h2><p>This email was sent by an AI agent created through natural language description!</p>'
        });
        
        if (emailResult.success) {
            console.log(`  ✅ Email sent! Preview: ${emailResult.result.previewUrl}`);
            results.push({ tool: 'email', status: 'success' });
        } else {
            console.log(`  ❌ Email failed: ${emailResult.error}`);
            results.push({ tool: 'email', status: 'failed' });
        }
        
        // Demo 2: HTTP Request
        console.log('\n🌐 Demo 2: GitHub API Request...');
        const httpResult = await this.toolRegistry.execute('http_request', {
            url: 'https://api.github.com/repos/DanielMoraesCoca/ABBA',
            method: 'GET'
        });
        
        if (httpResult.success) {
            const stars = httpResult.result.data?.stargazers_count || 0;
            console.log(`  ✅ ABBA Repository has ${stars} stars`);
            results.push({ tool: 'http', status: 'success', data: { stars } });
        } else {
            console.log(`  ❌ HTTP request failed: ${httpResult.error}`);
            results.push({ tool: 'http', status: 'failed' });
        }
        
        // Demo 3: Data Storage
        console.log('\n💾 Demo 3: Storing Data...');
        const storeResult = await this.toolRegistry.execute('store_data', {
            collection: 'demos',
            key: `demo-${Date.now()}`,
            data: {
                timestamp: new Date().toISOString(),
                agent: this.name,
                results: results
            }
        });
        
        if (storeResult.success) {
            console.log('  ✅ Data stored successfully');
            results.push({ tool: 'storage', status: 'success' });
        } else {
            console.log(`  ❌ Storage failed: ${storeResult.error}`);
            results.push({ tool: 'storage', status: 'failed' });
        }
        
        // Demo 4: Calendar Event
        console.log('\n📅 Demo 4: Creating Calendar Event...');
        const calendarResult = await this.toolRegistry.execute('create_calendar_event', {
            title: 'ABBA Demo Meeting',
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            duration: 60,
            attendees: ['team@abba.ai', 'investor@example.com']
        });
        
        if (calendarResult.success) {
            console.log(`  ✅ Event created: ${calendarResult.result.eventId}`);
            results.push({ tool: 'calendar', status: 'success' });
        } else {
            console.log(`  ❌ Calendar failed: ${calendarResult.error}`);
            results.push({ tool: 'calendar', status: 'failed' });
        }
        
        // Demo 5: File Operations (try MCP first, fallback to local)
        console.log('\n📁 Demo 5: File Operations...');
        const fileResult = await this.toolRegistry.executeTool('write_file', {
            path: './workspace/demo-output.txt',
            content: `ABBA Tool System Demo
Generated at: ${new Date().toISOString()}
Agent: ${this.name}
Tools tested: ${results.length}
Successful: ${results.filter(r => r.status === 'success').length}`
        });
        
        if (fileResult.success) {
            console.log('  ✅ File written successfully');
            results.push({ tool: 'file', status: 'success' });
        } else {
            console.log(`  ❌ File operation failed: ${fileResult.error}`);
            results.push({ tool: 'file', status: 'failed' });
        }
        
        // Show usage statistics
        console.log('\n📊 Tool Usage Statistics:');
        const stats = this.toolRegistry.getUsageStats();
        for (const [tool, data] of Object.entries(stats)) {
            console.log(`  ${tool}: ${data.success}/${data.total} successful`);
        }
        
        // Summary
        const successful = results.filter(r => r.status === 'success').length;
        console.log('\n' + '='.repeat(50));
        console.log(`✅ Demo Complete: ${successful}/${results.length} tools worked successfully`);
        
        return {
            success: true,
            totalTools: allTools.total,
            toolsTested: results.length,
            successful: successful,
            results: results
        };
    }
}

module.exports = ToolDemoAgent;