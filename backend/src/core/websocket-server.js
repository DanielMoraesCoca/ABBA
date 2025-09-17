const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class WebSocketServer extends EventEmitter {
    constructor(server) {
        super();
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();
        this.rooms = new Map();
        
        this.setupWebSocketServer();
    }

    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            const clientIp = req.socket.remoteAddress;
            
            // Store client information
            const client = {
                id: clientId,
                ws,
                ip: clientIp,
                connected: new Date().toISOString(),
                authenticated: false,
                agentSubscriptions: new Set(),
                rooms: new Set()
            };
            
            this.clients.set(clientId, client);
            
            console.log(`🔌 WebSocket client connected: ${clientId} from ${clientIp}`);
            
            // Send welcome message
            this.sendToClient(clientId, {
                type: 'connected',
                clientId,
                message: 'Connected to ABBA WebSocket server',
                timestamp: new Date().toISOString()
            });
            
            // Setup message handler
            ws.on('message', (message) => {
                this.handleMessage(clientId, message);
            });
            
            // Setup close handler
            ws.on('close', () => {
                this.handleDisconnect(clientId);
            });
            
            // Setup error handler
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
            
            // Ping to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.ping();
                } else {
                    clearInterval(pingInterval);
                }
            }, 30000);
        });
    }

    handleMessage(clientId, message) {
        try {
            const data = JSON.parse(message);
            const client = this.clients.get(clientId);
            
            if (!client) return;
            
            console.log(`📨 Message from ${clientId}:`, data.type);
            
            switch (data.type) {
                case 'auth':
                    this.handleAuth(clientId, data);
                    break;
                
                case 'subscribe':
                    this.handleSubscribe(clientId, data);
                    break;
                
                case 'unsubscribe':
                    this.handleUnsubscribe(clientId, data);
                    break;
                
                case 'execute':
                    this.handleExecute(clientId, data);
                    break;
                
                case 'join':
                    this.handleJoinRoom(clientId, data);
                    break;
                
                case 'leave':
                    this.handleLeaveRoom(clientId, data);
                    break;
                
                case 'broadcast':
                    this.handleBroadcast(clientId, data);
                    break;
                
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
                    break;
                
                default:
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: `Unknown message type: ${data.type}`
                    });
            }
        } catch (error) {
            console.error(`Error handling message from ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    handleAuth(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // TODO: Implement actual authentication
        // For now, accept any token
        if (data.token) {
            client.authenticated = true;
            client.token = data.token;
            
            this.sendToClient(clientId, {
                type: 'auth_success',
                message: 'Authentication successful'
            });
        } else {
            this.sendToClient(clientId, {
                type: 'auth_failed',
                message: 'Token required'
            });
        }
    }

    handleSubscribe(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { agentId, events } = data;
        
        if (agentId) {
            client.agentSubscriptions.add(agentId);
            
            this.sendToClient(clientId, {
                type: 'subscribed',
                agentId,
                events,
                message: `Subscribed to agent ${agentId}`
            });
            
            // Emit event for logging
            this.emit('client_subscribed', {
                clientId,
                agentId,
                events
            });
        }
    }

    handleUnsubscribe(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { agentId } = data;
        
        if (agentId && client.agentSubscriptions.has(agentId)) {
            client.agentSubscriptions.delete(agentId);
            
            this.sendToClient(clientId, {
                type: 'unsubscribed',
                agentId,
                message: `Unsubscribed from agent ${agentId}`
            });
        }
    }

    async handleExecute(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Check authentication
        if (!client.authenticated) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Authentication required'
            });
            return;
        }
        
        const { agentId, task, params } = data;
        
        try {
            // Send execution started event
            this.sendToClient(clientId, {
                type: 'execution_started',
                agentId,
                task,
                timestamp: new Date().toISOString()
            });
            
            // TODO: Execute actual agent task
            // For now, simulate execution
            setTimeout(() => {
                this.sendToClient(clientId, {
                    type: 'execution_completed',
                    agentId,
                    task,
                    result: {
                        success: true,
                        output: `Task ${task} completed`
                    },
                    timestamp: new Date().toISOString()
                });
            }, 1000);
            
        } catch (error) {
            this.sendToClient(clientId, {
                type: 'execution_failed',
                agentId,
                task,
                error: error.message
            });
        }
    }

    handleJoinRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { room } = data;
        
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        
        this.rooms.get(room).add(clientId);
        client.rooms.add(room);
        
        // Notify others in room
        this.broadcastToRoom(room, {
            type: 'user_joined',
            room,
            clientId,
            timestamp: new Date().toISOString()
        }, clientId);
        
        this.sendToClient(clientId, {
            type: 'joined_room',
            room,
            members: Array.from(this.rooms.get(room))
        });
    }

    handleLeaveRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { room } = data;
        
        if (this.rooms.has(room)) {
            this.rooms.get(room).delete(clientId);
            client.rooms.delete(room);
            
            // Notify others in room
            this.broadcastToRoom(room, {
                type: 'user_left',
                room,
                clientId,
                timestamp: new Date().toISOString()
            });
            
            this.sendToClient(clientId, {
                type: 'left_room',
                room
            });
        }
    }

    handleBroadcast(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) return;
        
        const { room, message } = data;
        
        if (room && client.rooms.has(room)) {
            this.broadcastToRoom(room, {
                type: 'broadcast',
                from: clientId,
                message,
                timestamp: new Date().toISOString()
            }, clientId);
        }
    }

    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        
        // Leave all rooms
        client.rooms.forEach(room => {
            if (this.rooms.has(room)) {
                this.rooms.get(room).delete(clientId);
                
                // Notify room members
                this.broadcastToRoom(room, {
                    type: 'user_disconnected',
                    clientId,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Clean up
        this.clients.delete(clientId);
        
        // Emit event
        this.emit('client_disconnected', { clientId });
    }

    sendToClient(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    }

    broadcastToRoom(room, data, excludeClientId = null) {
        if (!this.rooms.has(room)) return;
        
        this.rooms.get(room).forEach(clientId => {
            if (clientId !== excludeClientId) {
                this.sendToClient(clientId, data);
            }
        });
    }

    broadcastToAll(data, excludeClientId = null) {
        this.clients.forEach((client, clientId) => {
            if (clientId !== excludeClientId) {
                this.sendToClient(clientId, data);
            }
        });
    }

    // Send event to all subscribers of an agent
    notifyAgentSubscribers(agentId, event, data) {
        this.clients.forEach((client, clientId) => {
            if (client.agentSubscriptions.has(agentId)) {
                this.sendToClient(clientId, {
                    type: 'agent_event',
                    agentId,
                    event,
                    data,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Get connection stats
    getStats() {
        return {
            totalClients: this.clients.size,
            authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
            rooms: this.rooms.size,
            subscriptions: Array.from(this.clients.values()).reduce((sum, c) => sum + c.agentSubscriptions.size, 0)
        };
    }
}

module.exports = WebSocketServer;