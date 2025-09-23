const { Telegraf } = require('telegraf');
const FileStorage = require('../core/file-storage');

class TelegramChannel {
    constructor() {
        this.bot = null;
        this.storage = new FileStorage();
        this.isConfigured = false;
        this.handlers = new Map();
    }

    async initialize(token = null) {
        try {
            const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
            
            if (!botToken) {
                console.log('⚠️ Telegram token not provided');
                return false;
            }

            this.bot = new Telegraf(botToken);
            
            // Set up commands
            this.setupCommands();
            
            // Set up message handler
            this.bot.on('text', (ctx) => this.handleIncomingMessage(ctx));
            
            // Launch bot
            this.bot.launch();
            
            // Enable graceful stop
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
            
            this.isConfigured = true;
            console.log('✅ Telegram bot started (using Telegraf)');
            return true;
        } catch (error) {
            console.error('Telegram setup failed:', error.message);
            return false;
        }
    }

    setupCommands() {
        this.bot.command('start', (ctx) => {
            ctx.reply(
                'Welcome to ABBA! I can help you create AI agents.\n' +
                'Try: "Create an agent that responds to customer emails"'
            );
        });

        this.bot.command('help', (ctx) => {
            ctx.reply(
                'Available commands:\n' +
                '/start - Start bot\n' +
                '/create - Create new agent\n' +
                '/list - List your agents\n' +
                '/help - Show this message'
            );
        });

        this.bot.command('create', async (ctx) => {
            const description = ctx.message.text.replace('/create ', '');
            if (description && description.length > 0) {
                await this.processAgentRequest(ctx, description);
            } else {
                ctx.reply('Please provide a description. Example:\n/create an agent that helps with customer support');
            }
        });

        this.bot.command('list', async (ctx) => {
            // This will list user's agents
            ctx.reply('Your agents:\n1. Support_Agent_001\n2. Sales_Agent_002\n(Feature coming soon)');
        });
    }

    async handleIncomingMessage(ctx) {
        const chatId = ctx.chat.id;
        const text = ctx.message.text;
        const userId = ctx.from.id;
        const username = ctx.from.username || ctx.from.first_name;

        // Log incoming message
        await this.logMessage({
            channel: 'telegram',
            direction: 'inbound',
            chatId,
            userId,
            username,
            text,
            timestamp: new Date()
        });

        // Check if it's not a command
        if (!text.startsWith('/')) {
            // Process as agent creation request
            if (text.toLowerCase().includes('create') || 
                text.toLowerCase().includes('agent')) {
                await this.processAgentRequest(ctx, text);
            } else {
                // Route to appropriate agent if exists
                await this.routeToAgent(ctx, text);
            }
        }
    }

    async processAgentRequest(ctx, description) {
        await ctx.reply('🔄 Processing your request...');
        
        // Connect to orchestrator
        const handler = this.handlers.get('agent_creator');
        if (handler) {
            try {
                const result = await handler(description);
                
                if (result.success) {
                    await ctx.reply(
                        `✅ Agent created successfully!\n\n` +
                        `📝 Name: ${result.agent.name}\n` +
                        `🤖 Type: ${result.agent.type}\n` +
                        `⚡ Status: Active\n\n` +
                        `Your agent is ready to use!`
                    );
                } else {
                    await ctx.reply(`❌ Failed: ${result.error || 'Unknown error'}`);
                }
            } catch (error) {
                await ctx.reply(`❌ Error: ${error.message}`);
            }
        } else {
            await ctx.reply('⚠️ Agent creation service is being configured. Please try again in a moment.');
        }
    }

    async routeToAgent(ctx, message) {
        // Route messages to appropriate agents
        const handler = this.handlers.get('message_router');
        if (handler) {
            try {
                const response = await handler(message, { 
                    chatId: ctx.chat.id,
                    userId: ctx.from.id
                });
                await ctx.reply(response);
            } catch (error) {
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        } else {
            await ctx.reply(
                "I don't understand that command. Try /help for available options."
            );
        }
    }

    async sendMessage(chatId, text, options = {}) {
        if (!this.isConfigured || !this.bot) {
            console.error('Telegram not configured');
            return false;
        }

        try {
            await this.bot.telegram.sendMessage(chatId, text, options);
            
            await this.logMessage({
                channel: 'telegram',
                direction: 'outbound',
                chatId,
                text,
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error('Failed to send Telegram message:', error);
            return false;
        }
    }

    registerHandler(name, handler) {
        this.handlers.set(name, handler);
    }

    async logMessage(data) {
        const id = `telegram_${Date.now()}`;
        await this.storage.save('channel_logs', id, data);
    }

    async stop() {
        if (this.bot) {
            await this.bot.stop();
            console.log('Telegram bot stopped');
        }
    }
}

module.exports = TelegramChannel;