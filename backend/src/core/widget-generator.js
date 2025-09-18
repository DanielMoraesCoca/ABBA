const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class WidgetGenerator {
    constructor() {
        this.widgets = new Map();
        this.widgetDir = path.join(__dirname, '../../public/widgets');
        this.ensureWidgetDirectory();
    }

    async ensureWidgetDirectory() {
        try {
            await fs.mkdir(this.widgetDir, { recursive: true });
            await fs.mkdir(path.join(this.widgetDir, 'configs'), { recursive: true });
        } catch (error) {
            console.error('Error creating widget directories:', error);
        }
    }

    async generateWidget(agentId, options = {}) {
        const widgetId = uuidv4();
        const widgetKey = this.generateSecureKey();
        
        const config = {
            id: widgetId,
            agentId,
            key: widgetKey,
            created: new Date().toISOString(),
            options: {
                title: options.title || 'AI Assistant',
                position: options.position || 'bottom-right',
                theme: options.theme || 'light',
                primaryColor: options.primaryColor || '#4F46E5',
                width: options.width || '380px',
                height: options.height || '600px',
                greeting: options.greeting || 'Hello! How can I help you today?',
                placeholder: options.placeholder || 'Type your message...',
                autoOpen: options.autoOpen || false,
                allowMinimize: options.allowMinimize !== false,
                showPoweredBy: options.showPoweredBy !== false,
                customCSS: options.customCSS || '',
                allowedDomains: options.allowedDomains || ['*'],
                rateLimit: options.rateLimit || 50,
                features: {
                    fileUpload: options.features?.fileUpload || false,
                    voiceInput: options.features?.voiceInput || false,
                    emoji: options.features?.emoji || true,
                    typing: options.features?.typing || true,
                    history: options.features?.history || false
                }
            }
        };

        // Save widget configuration
        await this.saveWidgetConfig(widgetId, config);
        
        // Generate embed code
        const embedCode = this.generateEmbedCode(widgetId, widgetKey);
        
        // Generate standalone HTML
        const standaloneHTML = await this.generateStandaloneHTML(config);
        
        // Store in memory for quick access
        this.widgets.set(widgetId, config);
        
        return {
            widgetId,
            widgetKey,
            embedCode,
            standaloneURL: `/widgets/standalone/${widgetId}`,
            iframeURL: `/widgets/iframe/${widgetId}`,
            config,
            standaloneHTML
        };
    }

    generateSecureKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateEmbedCode(widgetId, widgetKey) {
        return `<!-- ABBA Widget -->
<script>
(function(w,d,s,o,f,js,fjs){
    w['ABBAWidget']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
}(window,document,'script','abba','[YOUR_DOMAIN]/widget.js'));
abba('init', {
    widgetId: '${widgetId}',
    key: '${widgetKey}'
});
</script>
<!-- End ABBA Widget -->`;
    }

    async generateStandaloneHTML(config) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.options.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: ${config.options.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .widget-header {
            background: ${config.options.primaryColor};
            color: white;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .widget-title {
            font-size: 18px;
            font-weight: 600;
        }
        
        .widget-controls {
            display: flex;
            gap: 8px;
        }
        
        .widget-button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        
        .widget-button:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .widget-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: ${config.options.theme === 'dark' ? '#2a2a2a' : '#f9fafb'};
        }
        
        .message {
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            animation: fadeIn 0.3s;
        }
        
        .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .message.user .message-avatar {
            background: ${config.options.primaryColor};
            color: white;
        }
        
        .message.assistant .message-avatar {
            background: #e5e7eb;
            color: #374151;
        }
        
        .message-content {
            flex: 1;
        }
        
        .message-bubble {
            background: ${config.options.theme === 'dark' ? '#3a3a3a' : 'white'};
            color: ${config.options.theme === 'dark' ? 'white' : '#111827'};
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            max-width: 85%;
            display: inline-block;
        }
        
        .message.user .message-bubble {
            background: ${config.options.primaryColor};
            color: white;
        }
        
        .message-time {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 16px;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: #9ca3af;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .widget-input-container {
            padding: 16px;
            background: ${config.options.theme === 'dark' ? '#1a1a1a' : 'white'};
            border-top: 1px solid ${config.options.theme === 'dark' ? '#3a3a3a' : '#e5e7eb'};
        }
        
        .widget-input-wrapper {
            display: flex;
            gap: 8px;
        }
        
        .widget-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid ${config.options.theme === 'dark' ? '#3a3a3a' : '#e5e7eb'};
            border-radius: 24px;
            background: ${config.options.theme === 'dark' ? '#2a2a2a' : '#f9fafb'};
            color: ${config.options.theme === 'dark' ? 'white' : '#111827'};
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .widget-input:focus {
            border-color: ${config.options.primaryColor};
        }
        
        .widget-send-button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: ${config.options.primaryColor};
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, opacity 0.2s;
        }
        
        .widget-send-button:hover {
            transform: scale(1.05);
        }
        
        .widget-send-button:active {
            transform: scale(0.95);
        }
        
        .widget-send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        ${config.options.showPoweredBy ? `
        .powered-by {
            text-align: center;
            padding: 8px;
            font-size: 11px;
            color: #6b7280;
            background: ${config.options.theme === 'dark' ? '#1a1a1a' : '#f9fafb'};
        }
        
        .powered-by a {
            color: ${config.options.primaryColor};
            text-decoration: none;
            font-weight: 600;
        }
        ` : ''}
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }
        
        ${config.options.customCSS}
    </style>
</head>
<body>
    <div class="widget-header">
        <div class="widget-title">${config.options.title}</div>
        <div class="widget-controls">
            ${config.options.allowMinimize ? '<button class="widget-button" onclick="minimizeWidget()">−</button>' : ''}
            <button class="widget-button" onclick="closeWidget()">×</button>
        </div>
    </div>
    
    <div class="widget-messages" id="messages">
        <div class="message assistant">
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-bubble">${config.options.greeting}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    </div>
    
    <div class="typing-indicator" id="typing" style="display: none;">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    </div>
    
    <div class="widget-input-container">
        <div class="widget-input-wrapper">
            <input 
                type="text" 
                class="widget-input" 
                id="messageInput" 
                placeholder="${config.options.placeholder}"
                onkeypress="handleKeyPress(event)"
            />
            <button class="widget-send-button" onclick="sendMessage()" id="sendButton">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
            </button>
        </div>
    </div>
    
    ${config.options.showPoweredBy ? `
    <div class="powered-by">
        Powered by <a href="#" target="_blank">ABBA</a>
    </div>
    ` : ''}
    
    <script>
        const widgetConfig = ${JSON.stringify(config)};
        let messageHistory = [];
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user');
            input.value = '';
            
            // Show typing indicator
            if (widgetConfig.options.features.typing) {
                showTyping();
            }
            
            // Send to backend
            processMessage(message);
        }
        
        function addMessage(text, sender) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + sender;
            
            const avatar = sender === 'user' ? 'U' : 'AI';
            const time = new Date().toLocaleTimeString();
            
            messageDiv.innerHTML = \`
                <div class="message-avatar">\${avatar}</div>
                <div class="message-content">
                    <div class="message-bubble">\${text}</div>
                    <div class="message-time">\${time}</div>
                </div>
            \`;
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            messageHistory.push({ text, sender, time });
        }
        
        function showTyping() {
            document.getElementById('typing').style.display = 'flex';
        }
        
        function hideTyping() {
            document.getElementById('typing').style.display = 'none';
        }
        
        async function processMessage(message) {
            // Simulate API call
            setTimeout(() => {
                hideTyping();
                addMessage('Thanks for your message! This is a demo response.', 'assistant');
            }, 1500);
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        function minimizeWidget() {
            if (window.parent !== window) {
                window.parent.postMessage({ action: 'minimize' }, '*');
            }
        }
        
        function closeWidget() {
            if (window.parent !== window) {
                window.parent.postMessage({ action: 'close' }, '*');
            }
        }
        
        // Send ready message to parent
        if (window.parent !== window) {
            window.parent.postMessage({ action: 'ready', config: widgetConfig }, '*');
        }
    </script>
</body>
</html>`;
        
        return html;
    }

    async saveWidgetConfig(widgetId, config) {
        const configPath = path.join(this.widgetDir, 'configs', `${widgetId}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    async loadWidgetConfig(widgetId) {
        try {
            const configPath = path.join(this.widgetDir, 'configs', `${widgetId}.json`);
            const data = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    validateDomain(widgetId, origin) {
        const config = this.widgets.get(widgetId);
        if (!config) return false;
        
        const allowedDomains = config.options.allowedDomains;
        
        // Allow all domains if * is specified
        if (allowedDomains.includes('*')) return true;
        
        // Check if origin matches any allowed domain
        return allowedDomains.some(domain => {
            if (domain.startsWith('*.')) {
                // Wildcard subdomain
                const baseDomain = domain.slice(2);
                return origin.endsWith(baseDomain);
            }
            return origin === domain || origin === `https://${domain}` || origin === `http://${domain}`;
        });
    }

    async getWidgetStats(widgetId) {
        const config = this.widgets.get(widgetId) || await this.loadWidgetConfig(widgetId);
        if (!config) return null;
        
        // TODO: Implement actual stats tracking
        return {
            widgetId,
            agentId: config.agentId,
            created: config.created,
            totalMessages: 0,
            activeUsers: 0,
            avgResponseTime: 0,
            satisfaction: 0
        };
    }

    async updateWidgetOptions(widgetId, updates) {
        const config = this.widgets.get(widgetId) || await this.loadWidgetConfig(widgetId);
        if (!config) return null;
        
        // Merge updates with existing options
        config.options = {
            ...config.options,
            ...updates,
            features: {
                ...config.options.features,
                ...(updates.features || {})
            }
        };
        
        config.updated = new Date().toISOString();
        
        // Save updated config
        await this.saveWidgetConfig(widgetId, config);
        this.widgets.set(widgetId, config);
        
        return config;
    }

    generateCustomizationUI(widgetId) {
        // Generate a UI for customizing the widget
        return `
        <div class="customization-panel">
            <h3>Customize Your Widget</h3>
            
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="title" value="AI Assistant">
            </div>
            
            <div class="form-group">
                <label>Position</label>
                <select id="position">
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Theme</label>
                <select id="theme">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Primary Color</label>
                <input type="color" id="primaryColor" value="#4F46E5">
            </div>
            
            <div class="form-group">
                <label>Greeting Message</label>
                <textarea id="greeting">Hello! How can I help you today?</textarea>
            </div>
            
            <div class="form-group">
                <label>Features</label>
                <label><input type="checkbox" id="fileUpload"> File Upload</label>
                <label><input type="checkbox" id="voiceInput"> Voice Input</label>
                <label><input type="checkbox" id="emoji" checked> Emoji Support</label>
                <label><input type="checkbox" id="typing" checked> Typing Indicator</label>
            </div>
            
            <button onclick="saveCustomization('${widgetId}')">Save Changes</button>
            <button onclick="previewWidget('${widgetId}')">Preview</button>
        </div>
        `;
    }
}

module.exports = WidgetGenerator;