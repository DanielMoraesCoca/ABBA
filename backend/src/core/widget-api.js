const express = require('express');
const WidgetGenerator = require('./widget-generator');
const WidgetSecurityManager = require('./widget-security');
const path = require('path');
const fs = require('fs').promises;

class WidgetAPI {
    constructor() {
        this.generator = new WidgetGenerator();
        this.security = new WidgetSecurityManager();
        this.router = express.Router();
        this.setupRoutes();
    }
    
    setupRoutes() {
        // Apply security middleware to all widget routes
        this.router.use(this.securityMiddleware.bind(this));
        
        // Create new widget
        this.router.post('/create', this.createWidget.bind(this));
        
        // Get widget configuration
        this.router.get('/:widgetId/config', this.getWidgetConfig.bind(this));
        
        // Update widget configuration
        this.router.put('/:widgetId/config', this.updateWidgetConfig.bind(this));
        
        // Get widget stats
        this.router.get('/:widgetId/stats', this.getWidgetStats.bind(this));
        
        // Generate security token for widget
        this.router.post('/:widgetId/token', this.generateToken.bind(this));
        
        // Serve widget iframe with security
        this.router.get('/iframe/:widgetId', this.serveSecureWidgetIframe.bind(this));
        
        // Serve standalone widget
        this.router.get('/standalone/:widgetId', this.serveStandaloneWidget.bind(this));
        
        // Widget customization UI
        this.router.get('/:widgetId/customize', this.serveCustomizationUI.bind(this));
        
        // Validate widget domain
        this.router.post('/:widgetId/validate', this.validateDomain.bind(this));
        
        return this.router;
    }
    
    // Security middleware
    async securityMiddleware(req, res, next) {
        // Skip security for certain routes
        const publicRoutes = ['/create', '/widget.js'];
        if (publicRoutes.some(route => req.path.includes(route))) {
            return next();
        }
        
        // Apply security headers
        const securityHeaders = this.security.getSecurityHeaders();
        for (const [header, value] of Object.entries(securityHeaders)) {
            res.setHeader(header, value);
        }
        
        // For iframe requests, validate domain and rate limit
        if (req.path.includes('/iframe/')) {
            const origin = req.headers.origin || req.headers.referer;
            if (origin) {
                const domain = this.security.extractDomain(origin);
                
                // Check if domain is blocked
                if (this.security.blockedDomains.has(domain)) {
                    this.security.logSecurityEvent('blocked_domain_access', {
                        domain,
                        path: req.path
                    });
                    return res.status(403).send('Domain is blocked');
                }
                
                // Check rate limiting
                if (!this.security.checkRateLimit(domain)) {
                    this.security.logSecurityEvent('rate_limit_exceeded', {
                        domain,
                        path: req.path
                    });
                    return res.status(429).send('Rate limit exceeded');
                }
            }
        }
        
        next();
    }
    
    // Generate security token for widget
    async generateToken(req, res) {
        try {
            const { widgetId } = req.params;
            const { domain } = req.body;
            
            if (!domain) {
                return res.status(400).json({
                    error: 'Domain is required'
                });
            }
            
            // Validate domain is allowed for this widget
            const config = await this.generator.loadWidgetConfig(widgetId);
            if (!config) {
                return res.status(404).json({
                    error: 'Widget not found'
                });
            }
            
            if (!this.security.validateDomain(domain, config.options.allowedDomains)) {
                this.security.logSecurityEvent('unauthorized_token_request', {
                    widgetId,
                    domain
                });
                return res.status(403).json({
                    error: 'Domain not allowed'
                });
            }
            
            // Generate secure token
            const tokenData = this.security.generateSecureToken(widgetId, domain);
            
            this.security.logSecurityEvent('token_generated', {
                widgetId,
                domain,
                sessionId: tokenData.sessionId
            });
            
            res.json({
                success: true,
                ...tokenData
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to generate token',
                details: error.message
            });
        }
    }
    
    async createWidget(req, res) {
        try {
            const { agentId, options } = req.body;
            
            if (!agentId) {
                return res.status(400).json({
                    error: 'Agent ID is required'
                });
            }
            
            // Validate options for security issues
            if (options) {
                const validation = this.security.validateContent(options);
                if (!validation.safe) {
                    this.security.logSecurityEvent('malicious_widget_attempt', {
                        agentId,
                        issues: validation.issues
                    });
                    return res.status(400).json({
                        error: 'Invalid options - potential security risk detected',
                        issues: validation.issues
                    });
                }
            }
            
            const widget = await this.generator.generateWidget(agentId, options);
            
            // Log security event
            this.security.logSecurityEvent('widget_created', {
                widgetId: widget.widgetId,
                agentId,
                origin: req.headers.origin
            });
            
            res.status(201).json({
                success: true,
                widget
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to create widget',
                details: error.message
            });
        }
    }
    
    async getWidgetConfig(req, res) {
        try {
            const { widgetId } = req.params;
            const config = await this.generator.loadWidgetConfig(widgetId);
            
            if (!config) {
                return res.status(404).json({
                    error: 'Widget not found'
                });
            }
            
            res.json({
                success: true,
                config
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get widget config',
                details: error.message
            });
        }
    }
    
    async updateWidgetConfig(req, res) {
        try {
            const { widgetId } = req.params;
            const updates = req.body;
            
            // Validate updates for security issues
            const validation = this.security.validateContent(updates);
            if (!validation.safe) {
                this.security.logSecurityEvent('malicious_update_attempt', {
                    widgetId,
                    issues: validation.issues
                });
                return res.status(400).json({
                    error: 'Invalid update - security risk detected',
                    issues: validation.issues
                });
            }
            
            const config = await this.generator.updateWidgetOptions(widgetId, updates);
            
            if (!config) {
                return res.status(404).json({
                    error: 'Widget not found'
                });
            }
            
            this.security.logSecurityEvent('widget_updated', {
                widgetId,
                updates: Object.keys(updates)
            });
            
            res.json({
                success: true,
                config
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to update widget config',
                details: error.message
            });
        }
    }
    
    async getWidgetStats(req, res) {
        try {
            const { widgetId } = req.params;
            const stats = await this.generator.getWidgetStats(widgetId);
            
            if (!stats) {
                return res.status(404).json({
                    error: 'Widget not found'
                });
            }
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get widget stats',
                details: error.message
            });
        }
    }
    
    async serveSecureWidgetIframe(req, res) {
        try {
            const { widgetId } = req.params;
            const { key, session, token } = req.query;
            
            // Load widget configuration
            const config = await this.generator.loadWidgetConfig(widgetId);
            
            if (!config) {
                return res.status(404).send('Widget not found');
            }
            
            // Validate widget key
            if (config.key !== key) {
                this.security.logSecurityEvent('invalid_widget_key', {
                    widgetId,
                    origin: req.headers.origin
                });
                return res.status(403).send('Invalid widget key');
            }
            
            // Validate session if provided
            if (session && token) {
                const validation = this.security.validateRequest(req);
                if (!validation.valid) {
                    this.security.logSecurityEvent('invalid_session', {
                        widgetId,
                        errors: validation.errors
                    });
                    return res.status(403).send('Session validation failed');
                }
            }
            
            // Check domain restriction
            const origin = req.headers.origin || req.headers.referer;
            if (origin && !this.security.validateDomain(
                this.security.extractDomain(origin),
                config.options.allowedDomains
            )) {
                this.security.logSecurityEvent('domain_not_allowed', {
                    widgetId,
                    origin
                });
                return res.status(403).send('Domain not allowed');
            }
            
            // Generate secure iframe HTML with sandbox
            const secureHtml = this.security.generateSecureIframe(widgetId, {
                ...config.options,
                parentOrigin: origin
            });
            
            // Apply security headers
            const securityHeaders = this.security.getSecurityHeaders();
            for (const [header, value] of Object.entries(securityHeaders)) {
                res.setHeader(header, value);
            }
            
            res.setHeader('Content-Type', 'text/html');
            res.send(secureHtml);
            
            this.security.logSecurityEvent('widget_served', {
                widgetId,
                origin,
                secure: true
            });
            
        } catch (error) {
            this.security.logSecurityEvent('widget_load_error', {
                widgetId: req.params.widgetId,
                error: error.message
            });
            res.status(500).send('Failed to load widget');
        }
    }
    
    async serveStandaloneWidget(req, res) {
        try {
            const { widgetId } = req.params;
            
            const config = await this.generator.loadWidgetConfig(widgetId);
            
            if (!config) {
                return res.status(404).send('Widget not found');
            }
            
            const html = await this.generator.generateStandaloneHTML(config);
            res.setHeader('Content-Type', 'text/html');
            
            // Apply basic security headers for standalone view
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            
            res.send(html);
            
        } catch (error) {
            res.status(500).send('Failed to load widget');
        }
    }
    
    async serveCustomizationUI(req, res) {
        try {
            const { widgetId } = req.params;
            
            const config = await this.generator.loadWidgetConfig(widgetId);
            
            if (!config) {
                return res.status(404).send('Widget not found');
            }
            
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Customize Widget</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    .form-group {
                        margin-bottom: 20px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 600;
                    }
                    input, select, textarea {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    button {
                        background: #4F46E5;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    button:hover {
                        background: #4338CA;
                    }
                    .preview {
                        margin-top: 40px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 20px;
                        background: #f9fafb;
                    }
                    .security-info {
                        background: #FEF3C7;
                        border: 1px solid #F59E0B;
                        border-radius: 4px;
                        padding: 12px;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="security-info">
                    <strong>Security Information:</strong><br>
                    Widget ID: ${widgetId}<br>
                    Allowed Domains: ${config.options.allowedDomains.join(', ')}<br>
                    Rate Limit: ${config.options.rateLimit} requests/minute
                </div>
                
                ${this.generator.generateCustomizationUI(widgetId)}
                
                <div class="preview">
                    <h3>Embed Code</h3>
                    <pre><code>${this.security.escapeHtml(config.embedCode)}</code></pre>
                </div>
                
                <script>
                    function saveCustomization(widgetId) {
                        // Collect form data and send to server
                        const data = {
                            title: document.getElementById('title').value,
                            position: document.getElementById('position').value,
                            theme: document.getElementById('theme').value,
                            primaryColor: document.getElementById('primaryColor').value,
                            greeting: document.getElementById('greeting').value,
                            features: {
                                fileUpload: document.getElementById('fileUpload').checked,
                                voiceInput: document.getElementById('voiceInput').checked,
                                emoji: document.getElementById('emoji').checked,
                                typing: document.getElementById('typing').checked
                            }
                        };
                        
                        fetch('/widgets/' + widgetId + '/config', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        })
                        .then(res => res.json())
                        .then(result => {
                            if (result.success) {
                                alert('Widget updated successfully!');
                            } else {
                                alert('Error: ' + (result.error || 'Update failed'));
                            }
                        })
                        .catch(err => {
                            alert('Network error: ' + err.message);
                        });
                    }
                    
                    function previewWidget(widgetId) {
                        window.open('/widgets/standalone/' + widgetId, '_blank');
                    }
                </script>
            </body>
            </html>
            `;
            
            res.send(html);
            
        } catch (error) {
            res.status(500).send('Failed to load customization UI');
        }
    }
    
    async validateDomain(req, res) {
        try {
            const { widgetId } = req.params;
            const { domain } = req.body;
            
            const config = await this.generator.loadWidgetConfig(widgetId);
            if (!config) {
                return res.status(404).json({
                    error: 'Widget not found'
                });
            }
            
            const isValid = this.security.validateDomain(
                domain,
                config.options.allowedDomains
            );
            
            this.security.logSecurityEvent('domain_validation', {
                widgetId,
                domain,
                valid: isValid
            });
            
            res.json({
                success: true,
                valid: isValid
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to validate domain',
                details: error.message
            });
        }
    }
}

module.exports = WidgetAPI;