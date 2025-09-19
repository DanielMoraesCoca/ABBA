/**
 * Performance Benchmark Tests
 * Measures system performance metrics
 */

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.thresholds = {
            agentCreation: 5000, // 5 seconds
            toolExecution: 500,  // 500ms
            apiResponse: 200,    // 200ms
            widgetLoad: 1000     // 1 second
        };
    }
    
    async runAllBenchmarks() {
        console.log(' Running Performance Benchmarks\n');
        
        await this.benchmarkAgentCreation();
        await this.benchmarkToolExecution();
        await this.benchmarkAPIResponse();
        await this.benchmarkMemoryUsage();
        
        return this.generateReport();
    }
    
    async benchmarkAgentCreation() {
        const OrchestratorAgent = require('../../src/agents/orchestrator');
        const orchestrator = new OrchestratorAgent();
        
        const descriptions = [
            'Simple calculator agent',
            'Complex data processing agent with multiple features',
            'Real-time monitoring agent with alerts'
        ];
        
        const times = [];
        
        for (const desc of descriptions) {
            const start = Date.now();
            await orchestrator.processDescription(desc);
            const duration = Date.now() - start;
            times.push(duration);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        
        this.results.push({
            name: 'Agent Creation',
            average: avg,
            max: Math.max(...times),
            min: Math.min(...times),
            passed: avg < this.thresholds.agentCreation
        });
    }
    
    async benchmarkToolExecution() {
        const ToolRegistry = require('../../src/core/tool-registry');
        const registry = new ToolRegistry();
        
        const iterations = 100;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await registry.execute('http_request', {
                url: 'https://api.github.com',
                method: 'GET'
            });
            times.push(Date.now() - start);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        
        this.results.push({
            name: 'Tool Execution',
            average: avg,
            max: Math.max(...times),
            min: Math.min(...times),
            passed: avg < this.thresholds.toolExecution
        });
    }
    
    async benchmarkAPIResponse() {
        const fetch = (await import('node-fetch')).default;
        const times = [];
        
        for (let i = 0; i < 50; i++) {
            const start = Date.now();
            await fetch('http://localhost:3333/api/health');
            times.push(Date.now() - start);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        
        this.results.push({
            name: 'API Response Time',
            average: avg,
            max: Math.max(...times),
            min: Math.min(...times),
            passed: avg < this.thresholds.apiResponse
        });
    }
    
    async benchmarkMemoryUsage() {
        const initial = process.memoryUsage();
        
        // Simulate load
        const agents = [];
        for (let i = 0; i < 10; i++) {
            const OrchestratorAgent = require('../../src/agents/orchestrator');
            agents.push(new OrchestratorAgent());
        }
        
        const final = process.memoryUsage();
        const heapUsed = (final.heapUsed - initial.heapUsed) / 1024 / 1024; // MB
        
        this.results.push({
            name: 'Memory Usage (10 agents)',
            value: heapUsed.toFixed(2) + ' MB',
            passed: heapUsed < 100 // Less than 100MB for 10 agents
        });
    }
    
    generateReport() {
        console.log('\n Performance Report:\n');
        console.log('='.repeat(50));
        
        for (const result of this.results) {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.average) {
                console.log(`   Average: ${result.average.toFixed(2)}ms`);
                console.log(`   Min: ${result.min}ms | Max: ${result.max}ms`);
            } else {
                console.log(`   Value: ${result.value}`);
            }
        }
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        console.log('\n' + '='.repeat(50));
        console.log(`Overall: ${passed}/${total} benchmarks passed`);
        
        return {
            passed,
            total,
            results: this.results
        };
    }
}

module.exports = PerformanceBenchmark;