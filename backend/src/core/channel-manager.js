const EmailChannel = require('../channels/email-channel');
const TelegramChannel = require('../channels/telegram-channel');

class ChannelManager {
    constructor() {
        this.channels = new Map();
        this.initialized = false;
    }

    async initialize() {
        console.log('🔄 Initializing delivery channels...\n');
        
        // Initialize Email
        const email = new EmailChannel();
        const emailReady = await email.initialize();
        if (emailReady) {
            this.channels.set('email', email);
        }

        // Initialize Telegram
        const telegram = new TelegramChannel();
        const telegramReady = await telegram.initialize();
        if (telegramReady) {
            this.channels.set('telegram', telegram);
        }

        this.initialized = true;
        
        console.log(`\n✅ Channels ready: ${this.channels.size} active`);
        return this.channels.size > 0;
    }

    getChannel(name) {
        return this.channels.get(name);
    }

    async sendMessage(channel, recipient, message) {
        const ch = this.channels.get(channel);
        if (!ch) {
            throw new Error(`Channel ${channel} not available`);
        }

        switch(channel) {
            case 'email':
                return await ch.sendMessage(
                    recipient.email,
                    recipient.subject || 'Message from ABBA',
                    message
                );
            case 'telegram':
                return await ch.sendMessage(recipient.chatId, message);
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }
    }

    connectToOrchestrator(orchestrator) {
        // Connect Telegram to orchestrator
        const telegram = this.channels.get('telegram');
        if (telegram) {
            telegram.registerHandler('agent_creator', async (description) => {
                return await orchestrator.processDescription(description);
            });
        }
    }

    getStats() {
        const stats = {};
        for (const [name, channel] of this.channels) {
            stats[name] = {
                active: channel.isConfigured,
                type: name
            };
        }
        return stats;
    }
}

module.exports = ChannelManager;