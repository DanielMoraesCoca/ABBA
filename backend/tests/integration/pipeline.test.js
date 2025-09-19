/**
 * Integration Test - Agent Pipeline
 * Tests the complete flow from description to code generation
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const OrchestratorAgent = require('../../src/agents/orchestrator');
const MCPServer = require('../../src/core/mcp-server');

describe('Agent Pipeline Integration', () => {
    let mcp;
    let orchestrator;
    
    beforeAll(() => {
        mcp = new MCPServer();
        orchestrator = new OrchestratorAgent(mcp);
    });
    
    afterAll(() => {
        // Cleanup
    });
    
    it('should process description through complete pipeline', async () => {
        const description = 'Create a simple calculator agent';
        
        const result = await orchestrator.processDescription(description);
        
        expect(result).toBeDefined();
        expect(result.interpretation).toBeDefined();
        expect(result.architecture).toBeDefined();
        expect(result.generatedCode).toBeDefined();
        expect(result.validation).toBeDefined();
    }, 30000); // 30 second timeout
    
    it('should handle complex descriptions', async () => {
        const description = 'Create an agent that monitors system health, sends alerts via email, and generates daily reports';
        
        const result = await orchestrator.processDescription(description);
        
        expect(result.success).toBe(true);
        expect(result.generatedCode).toContain('class');
    }, 30000);
    
    it('should validate generated code', async () => {
        const description = 'Create a data processing agent';
        
        const result = await orchestrator.processDescription(description);
        
        expect(result.validation).toBeDefined();
        expect(result.validation.syntaxValid).toBe(true);
        expect(result.validation.hasErrors).toBe(false);
    }, 30000);
});