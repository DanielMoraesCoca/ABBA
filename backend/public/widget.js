(function() {
    'use strict';
    
    // Configuration
    const WIDGET_VERSION = '1.0.0';
    const DEFAULT_CONFIG = {
        position: 'bottom-right',
        width: '380px',
        height: '600px'
    };
    
    // Widget state
    let widgetConfig = {};
    let widgetFrame = null;
    let widgetButton = null;
    let isOpen = false;
    let isInitialized = false;
    
    // Initialize widget
    window.abba = window.abba || function() {
        const args = Array.prototype.slice.call(arguments);
        const command = args[0];
        const params = args[1];
        
        if (command === 'init') {
            initWidget(params);
        }
    };
    
    // Process queued commands
    if (window.abba.q) {
        window.abba.q.forEach(function(args) {
            window.abba.apply(null, args);
        });
    }
    
    function initWidget(config) {
        if (isInitialized) return;
        
        widgetConfig = Object.assign({}, DEFAULT_CONFIG, config);
        isInitialized = true;
        
        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createWidget);
        } else {
            createWidget();
        }
    }
    
    function createWidget() {
        // Create widget button
        widgetButton = document.createElement('div');
        widgetButton.id = 'abba-widget-button';
        widgetButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
        `;
        
        // Style widget button
        Object.assign(widgetButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: widgetConfig.primaryColor || '#4F46E5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            zIndex: '999998',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s'
        });
        
        // Button hover effect
        widgetButton.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
        });
        
        widgetButton.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        
        // Button click handler
        widgetButton.addEventListener('click', toggleWidget);
        
        // Add button to page
        document.body.appendChild(widgetButton);
        
        // Create widget iframe container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'abba-widget-container';
        
        Object.assign(widgetContainer.style, {
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: widgetConfig.width,
            height: widgetConfig.height,
            maxWidth: '90vw',
            maxHeight: '80vh',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: '999999',
            display: 'none',
            overflow: 'hidden',
            background: 'white',
            transition: 'opacity 0.3s, transform 0.3s'
        });
        
        // Create iframe
        widgetFrame = document.createElement('iframe');
        widgetFrame.id = 'abba-widget-frame';
        widgetFrame.src = `/widgets/iframe/${widgetConfig.widgetId}?key=${widgetConfig.key}`;
        
        Object.assign(widgetFrame.style, {
            width: '100%',
            height: '100%',
            border: 'none'
        });
        
        // Security attributes
        widgetFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
        widgetFrame.setAttribute('allow', 'microphone; camera');
        
        widgetContainer.appendChild(widgetFrame);
        document.body.appendChild(widgetContainer);
        
        // Listen for messages from iframe
        window.addEventListener('message', handleFrameMessage);
        
        // Position based on config
        setWidgetPosition(widgetConfig.position);
        
        // Auto-open if configured
        if (widgetConfig.autoOpen) {
            setTimeout(openWidget, 1000);
        }
    }
    
    function setWidgetPosition(position) {
        const container = document.getElementById('abba-widget-container');
        const button = document.getElementById('abba-widget-button');
        
        if (!container || !button) return;
        
        // Reset all positions
        container.style.top = 'auto';
        container.style.bottom = 'auto';
        container.style.left = 'auto';
        container.style.right = 'auto';
        button.style.top = 'auto';
        button.style.bottom = 'auto';
        button.style.left = 'auto';
        button.style.right = 'auto';
        
        switch (position) {
            case 'bottom-right':
                container.style.bottom = '90px';
                container.style.right = '20px';
                button.style.bottom = '20px';
                button.style.right = '20px';
                break;
            case 'bottom-left':
                container.style.bottom = '90px';
                container.style.left = '20px';
                button.style.bottom = '20px';
                button.style.left = '20px';
                break;
            case 'top-right':
                container.style.top = '90px';
                container.style.right = '20px';
                button.style.top = '20px';
                button.style.right = '20px';
                break;
            case 'top-left':
                container.style.top = '90px';
                container.style.left = '20px';
                button.style.top = '20px';
                button.style.left = '20px';
                break;
        }
    }
    
    function toggleWidget() {
        if (isOpen) {
            closeWidget();
        } else {
            openWidget();
        }
    }
    
    function openWidget() {
        const container = document.getElementById('abba-widget-container');
        if (!container) return;
        
        container.style.display = 'block';
        setTimeout(function() {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 10);
        
        isOpen = true;
        
        // Send open event
        if (widgetFrame && widgetFrame.contentWindow) {
            widgetFrame.contentWindow.postMessage({ action: 'open' }, '*');
        }
    }
    
    function closeWidget() {
        const container = document.getElementById('abba-widget-container');
        if (!container) return;
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        setTimeout(function() {
            container.style.display = 'none';
        }, 300);
        
        isOpen = false;
        
        // Send close event
        if (widgetFrame && widgetFrame.contentWindow) {
            widgetFrame.contentWindow.postMessage({ action: 'close' }, '*');
        }
    }
    
    function handleFrameMessage(event) {
        // Security: Verify origin
        // TODO: Add origin verification
        
        const data = event.data;
        
        if (!data || !data.action) return;
        
        switch (data.action) {
            case 'ready':
                console.log('ABBA Widget ready');
                break;
            case 'close':
                closeWidget();
                break;
            case 'minimize':
                closeWidget();
                break;
            case 'resize':
                if (data.width) {
                    document.getElementById('abba-widget-container').style.width = data.width;
                }
                if (data.height) {
                    document.getElementById('abba-widget-container').style.height = data.height;
                }
                break;
        }
    }
    
    // Public API
    window.abba.open = openWidget;
    window.abba.close = closeWidget;
    window.abba.toggle = toggleWidget;
    window.abba.setPosition = setWidgetPosition;
    window.abba.send = function(message) {
        if (widgetFrame && widgetFrame.contentWindow) {
            widgetFrame.contentWindow.postMessage({
                action: 'message',
                message: message
            }, '*');
        }
    };
    window.abba.version = WIDGET_VERSION;
    
})();