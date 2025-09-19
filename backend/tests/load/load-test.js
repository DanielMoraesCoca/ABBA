/**
 * Load Testing Suite
 * Tests system under heavy load
 */

class LoadTester {
    constructor() {
        this.results = {
            concurrent: 0,
            successful: 0,
            failed: 0,
            avgResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            throughput: 0
        };
    }
    
    async runLoadTests() {
        console.log(' Starting Load Tests\n');
        
        await this.testConcurrentAgentCreation(10);
        await this.testConcurrentAgentCreation(50);
        await this.testConcurrentAgentCreation(100);
        
        await this.testWebSocketConnections(100);
        await this.testAPIEndpointLoad(1000);
        
        return this.generateReport();
    }
    
    async testConcurrentAgentCreation(count) {
        console.log(`Testing ${count} concurrent agent creations...`);
        
        const fetch = (await import('node-fetch')).default;
        const promises = [];
        const times = [];
        
        for (let i = 0; i < count; i++) {
            const promise = (async () => {
                const start = Date.now();
                try {
                    const response = await fetch('http://localhost:3333/api/create-agent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            description: `Test agent ${i}`
                        })
                    });
                    
                    if (response.ok) {
                        this.results.successful++;
                    } else {
                        this.results.failed++;
                    }
                    
                    const duration = Date.now() - start;
                    times.push(duration);
                    
                } catch (error) {
                    this.results.failed++;
                }
            })();
            
            promises.push(promise);
        }
        
        const startTime = Date.now();
        await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        
        this.results.concurrent = Math.max(this.results.concurrent, count);
        this.results.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
        this.results.maxResponseTime = Math.max(...times, this.results.maxResponseTime);
        this.results.minResponseTime = Math.min(...times, this.results.minResponseTime);
        this.results.throughput = (count / totalTime) * 1000; // requests per second
        
        console.log(`   Completed: ${this.results.successful}/${count} successful`);
        console.log(`   Avg response time: ${this.results.avgResponseTime.toFixed(2)}ms`);
        console.log(`   Throughput: ${this.results.throughput.toFixed(2)} req/s\n`);
    }
    
    async testWebSocketConnections(count) {
        console.log(`Testing ${count} WebSocket connections...`);
        
        const WebSocket = require('ws');
        const connections = [];
        let connected = 0;
        
        for (let i = 0; i < count; i++) {
            try {
                const ws = new WebSocket('ws://localhost:3333');
                
                ws.on('open', () => {
                    connected++;
                });
                
                connections.push(ws);
            } catch (error) {
                // Connection failed
            }
        }
        
        // Wait for connections
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`   Established: ${connected}/${count} connections\n`);
        
        // Close all connections
        connections.forEach(ws => ws.close());
    }
    
    async testAPIEndpointLoad(requests) {
        console.log(`Testing ${requests} API requests...`);
        
        const fetch = (await import('node-fetch')).default;
        const endpoints = [
            '/api/health',
            '/api/test',
            '/api/metrics',
            '/api/agents'
        ];
        
        let completed = 0;
        const startTime = Date.now();
        
        const promises = [];
        for (let i = 0; i < requests; i++) {
            const endpoint = endpoints[i % endpoints.length];
            promises.push(
                fetch(`http://localhost:3333${endpoint}`)
                    .then(() => completed++)
                    .catch(() => {})
            );
        }
        
        await Promise.all(promises);
        const duration = (Date.now() - startTime) / 1000; // seconds
        
        console.log(`   Completed: ${completed}/${requests} requests`);
        console.log(`   Rate: ${(completed / duration).toFixed(2)} req/s\n`);
    }
    
    generateReport() {
        console.log('\n Load Test Report:\n');
        console.log('='.repeat(50));
        
        console.log('Results:');
        console.log(`  Max Concurrent: ${this.results.concurrent}`);
        console.log(`  Successful: ${this.results.successful}`);
        console.log(`  Failed: ${this.results.failed}`);
        console.log(`  Success Rate: ${((this.results.successful / (this.results.successful + this.results.failed)) * 100).toFixed(2)}%`);
        console.log(`  Avg Response Time: ${this.results.avgResponseTime.toFixed(2)}ms`);
        console.log(`  Min Response Time: ${this.results.minResponseTime}ms`);
        console.log(`  Max Response Time: ${this.results.maxResponseTime}ms`);
        console.log(`  Throughput: ${this.results.throughput.toFixed(2)} req/s`);
        
        const grade = this.calculateGrade();
        console.log(`\nOverall Grade: ${grade}`);
        
        return this.results;
    }
    
    calculateGrade() {
        const successRate = this.results.successful / (this.results.successful + this.results.failed);
        
        if (successRate > 0.95 && this.results.avgResponseTime < 1000) return 'A - Excellent';
        if (successRate > 0.90 && this.results.avgResponseTime < 2000) return 'B - Good';
        if (successRate > 0.80 && this.results.avgResponseTime < 5000) return 'C - Acceptable';
        if (successRate > 0.70) return 'D - Needs Improvement';
        return 'F - Critical Issues';
    }
}

module.exports = LoadTester;