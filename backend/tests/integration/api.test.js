/**
 * Integration Test - API Endpoints
 * Tests all API endpoints and their interactions
 */

const request = require('supertest');
const { app } = require('../../src/index');

describe('API Integration Tests', () => {
    describe('POST /api/create-agent', () => {
        it('should create agent from description', async () => {
            const response = await request(app)
                .post('/api/create-agent')
                .send({ description: 'Test agent' })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.agent).toBeDefined();
        });
    });
    
    describe('GET /api/health', () => {
        it('should return system health', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            
            expect(response.body.status).toBe('ok');
        });
    });
    
    describe('WebSocket Integration', () => {
        it('should establish WebSocket connection', (done) => {
            const WebSocket = require('ws');
            const ws = new WebSocket('ws://localhost:3333');
            
            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });
        });
    });
});