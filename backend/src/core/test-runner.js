const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class TestRunner {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            coverage: 0,
            suites: {}
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Complete Test Suite\n');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        
        // Run different test suites
        await this.runUnitTests();
        await this.runIntegrationTests();
        await this.runPerformanceTests();
        await this.runLoadTests();
        
        this.results.duration = Date.now() - startTime;
        
        return this.generateReport();
    }

    async runUnitTests() {
        console.log('\n📝 Running Unit Tests...\n');
        
        try {
            const { stdout, stderr } = await execAsync('npm test -- --testNamePattern="unit"');
            
            // Parse Jest output
            const lines = stdout.split('\n');
            const summary = this.parseJestOutput(lines);
            
            this.results.suites.unit = {
                passed: summary.passed,
                failed: summary.failed,
                total: summary.total
            };
            
            this.results.passed += summary.passed;
            this.results.failed += summary.failed;
            this.results.total += summary.total;
            
            console.log(`✅ Unit Tests: ${summary.passed}/${summary.total} passed`);
        } catch (error) {
            console.log('❌ Unit tests failed:', error.message);
            this.results.suites.unit = { error: error.message };
        }
    }

    async runIntegrationTests() {
        console.log('\n🔗 Running Integration Tests...\n');
        
        try {
            const { stdout } = await execAsync('npm test -- --testNamePattern="integration"');
            
            const lines = stdout.split('\n');
            const summary = this.parseJestOutput(lines);
            
            this.results.suites.integration = {
                passed: summary.passed,
                failed: summary.failed,
                total: summary.total
            };
            
            this.results.passed += summary.passed;
            this.results.failed += summary.failed;
            this.results.total += summary.total;
            
            console.log(`✅ Integration Tests: ${summary.passed}/${summary.total} passed`);
        } catch (error) {
            console.log('❌ Integration tests failed:', error.message);
            this.results.suites.integration = { error: error.message };
        }
    }

    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...\n');
        
        try {
            const PerformanceBenchmark = require('../../tests/performance/benchmark');
            const benchmark = new PerformanceBenchmark();
            const results = await benchmark.runAllBenchmarks();
            
            this.results.suites.performance = results;
            
            console.log(`✅ Performance Tests: ${results.passed}/${results.total} benchmarks passed`);
        } catch (error) {
            console.log('❌ Performance tests failed:', error.message);
            this.results.suites.performance = { error: error.message };
        }
    }

    async runLoadTests() {
        console.log('\n🏋️ Running Load Tests...\n');
        
        try {
            const LoadTester = require('../../tests/load/load-test');
            const loadTester = new LoadTester();
            const results = await loadTester.runLoadTests();
            
            this.results.suites.load = results;
            
            console.log('✅ Load Tests completed');
        } catch (error) {
            console.log('❌ Load tests failed:', error.message);
            this.results.suites.load = { error: error.message };
        }
    }

    parseJestOutput(lines) {
        // Simple Jest output parser
        const summary = {
            total: 0,
            passed: 0,
            failed: 0
        };

        for (const line of lines) {
            if (line.includes('Tests:')) {
                const match = line.match(/(\d+) passed/);
                if (match) summary.passed = parseInt(match[1]);
                
                const failMatch = line.match(/(\d+) failed/);
                if (failMatch) summary.failed = parseInt(failMatch[1]);
                
                const totalMatch = line.match(/(\d+) total/);
                if (totalMatch) summary.total = parseInt(totalMatch[1]);
            }
        }

        return summary;
    }

    async generateCoverageReport() {
        try {
            const { stdout } = await execAsync('npm test -- --coverage');
            
            // Parse coverage output
            const lines = stdout.split('\n');
            let coverage = 0;
            
            for (const line of lines) {
                if (line.includes('All files')) {
                    const match = line.match(/(\d+\.?\d*)/);
                    if (match) coverage = parseFloat(match[1]);
                }
            }
            
            this.results.coverage = coverage;
            
            return coverage;
        } catch (error) {
            console.log('Could not generate coverage report:', error.message);
            return 0;
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUITE COMPLETE REPORT');
        console.log('='.repeat(50));
        
        console.log('\n📈 Overall Results:');
        console.log(`  Total Tests: ${this.results.total}`);
        console.log(`  Passed: ${this.results.passed} (${((this.results.passed/this.results.total)*100).toFixed(2)}%)`);
        console.log(`  Failed: ${this.results.failed}`);
        console.log(`  Duration: ${(this.results.duration/1000).toFixed(2)} seconds`);
        
        if (this.results.coverage > 0) {
            console.log(`  Code Coverage: ${this.results.coverage}%`);
        }
        
        console.log('\n📦 Test Suites:');
        for (const [suite, data] of Object.entries(this.results.suites)) {
            if (data.error) {
                console.log(`  ❌ ${suite}: Error - ${data.error}`);
            } else if (data.passed !== undefined) {
                console.log(`  ✅ ${suite}: ${data.passed}/${data.total || data.passed} passed`);
            } else {
                console.log(`  ✅ ${suite}: Completed`);
            }
        }
        
        const successRate = (this.results.passed / this.results.total) * 100;
        let grade = 'F';
        if (successRate >= 95) grade = 'A';
        else if (successRate >= 85) grade = 'B';
        else if (successRate >= 75) grade = 'C';
        else if (successRate >= 65) grade = 'D';
        
        console.log(`\n🎯 Final Grade: ${grade} (${successRate.toFixed(2)}%)`);
        
        if (successRate === 100) {
            console.log('\n🎉 PERFECT SCORE! All tests passed!');
        } else if (successRate >= 80) {
            console.log('\n✨ Great job! System is stable.');
        } else {
            console.log('\n⚠️ Warning: System needs attention.');
        }
        
        return this.results;
    }
}

module.exports = TestRunner;