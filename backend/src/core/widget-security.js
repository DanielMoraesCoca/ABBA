const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class WidgetSecurityManager {
    constructor() {
        this.sessions = new Map();
        this.rateLimits = new Map();
        this.blockedDomains = new Set();
        this.trustedDomains = new Set();
        
        // Security configuration
        this.config = {
            maxRequestsPerMinute: 60,
            maxSessionsPerDomain: 10,
            tokenExpiry: 3600000, // 1 hour
            csrfTokenLength: 32,
            allowedOrigins: [],
            contentSecurityPolicy: {
                'default-src': ["'self'"],
                'script-src': ["'self'", "'unsafe-inline'"],
                'style-src': ["'self'", "'unsafe-inline'"],
                'img-src': ["'self'", 'data:', 'https:'],
                'connect-src': ["'self'"],
                'frame-ancestors': ["'self'"],
                'base-uri': ["'self'"],
                'form-action': ["'self'"]
            }
        };
        
        // Initialize blocked domains (known malicious)
        this.initializeBlockedDomains();
    }
    
    initializeBlockedDomains() {
        // Add known malicious domains
        this.blockedDomains.add('malicious-site.com');
        this.blockedDomains.add('phishing-domain.net');
        // In production, this would load from a threat intelligence feed
    }
    
    // Generate secure widget token
    generateSecureToken(widgetId, domain) {
        const sessionId = uuidv4();
        const token = crypto.randomBytes(64).toString('hex');
        const csrfToken = crypto.randomBytes(this.config.csrfTokenLength).toString('hex');
        
        const session = {
            id: sessionId,
            widgetId,
            domain,
            token,
            csrfToken,
            created: Date.now(),
            lastActivity: Date.now(),
            requestCount: 0,
            fingerprint: null,
            trusted: false
        };
        
        this.sessions.set(sessionId, session);
        
        // Clean expired sessions
        this.cleanExpiredSessions();
        
        return {
            sessionId,
            token,
            csrfToken,
            expires: new Date(Date.now() + this.config.tokenExpiry)
        };
    }
    
    // Validate widget request
    validateRequest(req) {
        const validation = {
            valid: false,
            errors: [],
            warnings: []
        };
        
        // 1. Check origin
        const origin = req.headers.origin || req.headers.referer;
        if (!origin) {
            validation.errors.push('No origin header');
            return validation;
        }
        
        // 2. Check if domain is blocked
        const domain = this.extractDomain(origin);
        if (this.blockedDomains.has(domain)) {
            validation.errors.push('Domain is blocked');
            return validation;
        }
        
        // 3. Check rate limiting
        if (!this.checkRateLimit(domain)) {
            validation.errors.push('Rate limit exceeded');
            return validation;
        }
        
        // 4. Validate session token
        const sessionId = req.headers['x-widget-session'] || req.query.session;
        const token = req.headers['x-widget-token'] || req.query.token;
        
        if (!sessionId || !token) {
            validation.errors.push('Missing authentication');
            return validation;
        }
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            validation.errors.push('Invalid session');
            return validation;
        }
        
        if (session.token !== token) {
            validation.errors.push('Invalid token');
            return validation;
        }
        
        // 5. Check session expiry
        if (Date.now() - session.created > this.config.tokenExpiry) {
            validation.errors.push('Session expired');
            this.sessions.delete(sessionId);
            return validation;
        }
        
        // 6. CSRF validation for state-changing operations
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken;
            if (!csrfToken || csrfToken !== session.csrfToken) {
                validation.errors.push('CSRF token validation failed');
                return validation;
            }
        }
        
        // 7. Content validation
        if (req.body) {
            const contentValidation = this.validateContent(req.body);
            if (!contentValidation.safe) {
                validation.errors.push(...contentValidation.issues);
            }
        }
        
        // 8. Update session activity
        session.lastActivity = Date.now();
        session.requestCount++;
        
        validation.valid = true;
        validation.session = session;
        
        return validation;
    }
    
    // Content validation to prevent XSS and injection
    validateContent(content) {
        const validation = {
            safe: true,
            issues: []
        };
        
        const dangerous = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /eval\(/gi,
            /setTimeout\(/gi,
            /setInterval\(/gi,
            /Function\(/gi
        ];
        
        const checkValue = (value, path = '') => {
            if (typeof value === 'string') {
                // Check for dangerous patterns
                for (const pattern of dangerous) {
                    if (pattern.test(value)) {
                        validation.safe = false;
                        validation.issues.push(`Dangerous content detected at ${path}`);
                        break;
                    }
                }
                
                // Check length
                if (value.length > 10000) {
                    validation.safe = false;
                    validation.issues.push(`Content too long at ${path}`);
                }
            } else if (typeof value === 'object' && value !== null) {
                // Recursively check objects
                for (const [key, val] of Object.entries(value)) {
                    checkValue(val, path ? `${path}.${key}` : key);
                }
            } else if (Array.isArray(value)) {
                // Check arrays
                value.forEach((val, index) => {
                    checkValue(val, `${path}[${index}]`);
                });
            }
        };
        
        checkValue(content);
        
        return validation;
    }
    
    // Generate Content Security Policy header
    generateCSPHeader() {
        const policies = [];
        
        for (const [directive, values] of Object.entries(this.config.contentSecurityPolicy)) {
            policies.push(`${directive} ${values.join(' ')}`);
        }
        
        return policies.join('; ');
    }
    
    // Sandbox iframe attributes
    getSandboxAttributes() {
        return [
            'allow-scripts',
            'allow-forms',
            'allow-popups',
            'allow-popups-to-escape-sandbox',
            'allow-same-origin',
            'allow-modals'
        ].join(' ');
    }
    
    // Generate secure iframe HTML
    generateSecureIframe(widgetId, config) {
        const nonce = crypto.randomBytes(16).toString('hex');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${this.generateCSPHeader()}">
            <title>${this.escapeHtml(config.title || 'Widget')}</title>
            <style nonce="${nonce}">
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                }
                #widget-container {
                    width: 100%;
                    height: 100vh;
                    position: relative;
                }
                .security-notice {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 4px 8px;
                    background: rgba(0,0,0,0.05);
                    font-size: 10px;
                    color: #666;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div id="widget-container"></div>
            <script nonce="${nonce}">
                // Security context
                (function() {
                    'use strict';
                    
                    // Freeze sensitive objects
                    Object.freeze(Object.prototype);
                    Object.freeze(Array.prototype);
                    Object.freeze(Function.prototype);
                    
                    // Override dangerous functions
                    window.eval = function() {
                        console.warn('eval is disabled in widget context');
                        return null;
                    };
                    
                    // Secure postMessage communication
                    const parentOrigin = '${this.escapeHtml(config.parentOrigin || '*')}';
                    
                    window.secureMessage = function(data) {
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage({
                                widgetId: '${widgetId}',
                                ...data,
                                timestamp: Date.now()
                            }, parentOrigin);
                        }
                    };
                    
                    // Listen for parent messages
                    window.addEventListener('message', function(event) {
                        // Validate origin
                        if (parentOrigin !== '*' && event.origin !== parentOrigin) {
                            console.warn('Invalid origin:', event.origin);
                            return;
                        }
                        
                        // Handle message
                        if (event.data && event.data.action) {
                            handleParentMessage(event.data);
                        }
                    });
                    
                    function handleParentMessage(data) {
                        // Implement secure message handling
                        console.log('Received parent message:', data.action);
                    }
                    
                    // Initialize widget
                    console.log('Widget security context initialized');
                })();
            </script>
        </body>
        </html>
        `;
    }
    
    // Rate limiting
    checkRateLimit(identifier) {
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        
        if (!this.rateLimits.has(identifier)) {
            this.rateLimits.set(identifier, []);
        }
        
        const requests = this.rateLimits.get(identifier);
        const recentRequests = requests.filter(time => now - time < windowMs);
        
        if (recentRequests.length >= this.config.maxRequestsPerMinute) {
            return false;
        }
        
        recentRequests.push(now);
        this.rateLimits.set(identifier, recentRequests);
        
        return true;
    }
    
    // Domain validation
    validateDomain(domain, allowedDomains) {
        // Check if domain is blocked
        if (this.blockedDomains.has(domain)) {
            return false;
        }
        
        // Check allowed domains
        if (allowedDomains.includes('*')) {
            return true;
        }
        
        // Check exact match
        if (allowedDomains.includes(domain)) {
            return true;
        }
        
        // Check wildcard subdomains
        for (const allowed of allowedDomains) {
            if (allowed.startsWith('*.')) {
                const baseDomain = allowed.slice(2);
                if (domain === baseDomain || domain.endsWith('.' + baseDomain)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }
    
    // HTML escaping
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    // Clean expired sessions
    cleanExpiredSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.created > this.config.tokenExpiry) {
                this.sessions.delete(id);
            }
        }
    }
    
    // Get security headers for widget responses
    getSecurityHeaders() {
        return {
            'X-Frame-Options': 'ALLOWALL', // Allow embedding
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Content-Security-Policy': this.generateCSPHeader()
        };
    }
    
    // Monitor suspicious activity
    detectSuspiciousActivity(session) {
        const suspicious = [];
        
        // Check request frequency
        if (session.requestCount > 100) {
            suspicious.push('High request count');
        }
        
        // Check session age
        const sessionAge = Date.now() - session.created;
        if (sessionAge < 1000 && session.requestCount > 10) {
            suspicious.push('Rapid requests after creation');
        }
        
        // Check for automation patterns
        const intervals = [];
        // ... (would track request intervals)
        
        return suspicious;
    }
    
    // Log security events
    logSecurityEvent(event, details) {
        console.log(`[SECURITY] ${event}:`, {
            timestamp: new Date().toISOString(),
            ...details
        });
        
        // In production, this would send to security monitoring service
    }
}

module.exports = WidgetSecurityManager;