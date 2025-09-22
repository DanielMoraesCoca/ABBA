const fs = require('fs').promises;
const path = require('path');

class AgentOptimizer {
    constructor() {
        this.optimizations = {
            cacheAdded: 0,
            errorsFixed: 0,
            performanceImproved: 0
        };
    }
    
    async optimizeAllAgents() {
        console.log('🔧 Optimizing all agents...\n');
        
        const agents = [
            'orchestrator', 'interpreter', 'architect', 
            'coder', 'validator', 'testwriter', 
            'monitor', 'deployer', 'code-reviewer'
        ];
        
        for (const agentName of agents) {
            await this.optimizeAgent(agentName);
        }
        
        return this.optimizations;
    }
    
    async optimizeAgent(agentName) {
        const agentPath = path.join(__dirname, '../agents', `${agentName}.js`);
        
        try {
            let code = await fs.readFile(agentPath, 'utf-8');
            const originalCode = code;
            
            // Optimization 1: Add caching if missing
            if (!code.includes('this.cache')) {
                const cacheCode = `
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes`;
                
                code = code.replace(
                    'constructor() {',
                    `constructor() {${cacheCode}`
                );
                this.optimizations.cacheAdded++;
            }
            
            // Optimization 2: Add error handling wrapper
            if (!code.includes('try {') || code.match(/try \{/g).length < 2) {
                // Add try-catch to process method
                code = code.replace(
                    /async process\(([^)]+)\) \{/,
                    `async process($1) {
        try {`
                );
                
                // Find the end of process method and add catch
                const processEnd = code.lastIndexOf('return', 
                    code.lastIndexOf('async process'));
                if (processEnd > -1) {
                    const nextBrace = code.indexOf('}', processEnd);
                    code = code.slice(0, nextBrace + 1) + 
                        `
        } catch (error) {
            console.error(\`[\${this.name}] Error:\`, error.message);
            return {
                success: false,
                error: error.message
            };
        }` + code.slice(nextBrace + 1);
                }
                this.optimizations.errorsFixed++;
            }
            
            // Optimization 3: Add performance monitoring
            if (!code.includes('Date.now()')) {
                code = code.replace(
                    /async process\(([^)]+)\) \{/,
                    `async process($1) {
        const startTime = Date.now();`
                );
                
                // Add timing log
                code = code.replace(
                    /return \{([^}]+)\}/g,
                    `const result = {$1, processingTime: Date.now() - startTime };
        return result`
                );
                this.optimizations.performanceImproved++;
            }
            
            // Save optimized code only if changed
            if (code !== originalCode) {
                // Backup original
                await fs.writeFile(
                    agentPath + '.backup',
                    originalCode
                );
                
                // Save optimized
                await fs.writeFile(agentPath, code);
                console.log(`  ✅ Optimized ${agentName}`);
            } else {
                console.log(`  ⏭️ ${agentName} already optimized`);
            }
            
        } catch (error) {
            console.log(`  ❌ Could not optimize ${agentName}:`, error.message);
        }
    }
    
    async rollback() {
        console.log('🔙 Rolling back optimizations...');
        
        const agentsDir = path.join(__dirname, '../agents');
        const files = await fs.readdir(agentsDir);
        
        for (const file of files) {
            if (file.endsWith('.backup')) {
                const originalPath = file.replace('.backup', '');
                await fs.rename(
                    path.join(agentsDir, file),
                    path.join(agentsDir, originalPath)
                );
                console.log(`  ✅ Rolled back ${originalPath}`);
            }
        }
    }
}

module.exports = AgentOptimizer;