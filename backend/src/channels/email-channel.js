const nodemailer = require('nodemailer');
const FileStorage = require('../core/file-storage');

class EmailChannel {
    constructor() {
        this.storage = new FileStorage();
        this.transporter = null;
        this.isConfigured = false;
    }

    async initialize(config = {}) {
        try {
            // Use environment variables or config
            this.transporter = nodemailer.createTransport({
                service: config.service || process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: config.user || process.env.EMAIL_USER,
                    pass: config.pass || process.env.EMAIL_PASS
                }
            });

            // Verify connection
            await this.transporter.verify();
            this.isConfigured = true;
            console.log('✅ Email channel ready');
            return true;
        } catch (error) {
            console.error('Email channel setup failed:', error.message);
            this.isConfigured = false;
            return false;
        }
    }

    async sendMessage(to, subject, content, agentId = null) {
        if (!this.isConfigured) {
            throw new Error('Email channel not configured');
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                text: content.text || content,
                html: content.html || `<p>${content}</p>`
            });

            // Log the sent message
            await this.logMessage({
                channel: 'email',
                direction: 'outbound',
                to,
                subject,
                messageId: info.messageId,
                agentId,
                timestamp: new Date()
            });

            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }

    async receiveMessages() {
        // For now, this would integrate with IMAP
        // We'll implement webhooks for incoming emails
        console.log('Email receiving requires IMAP setup');
        return [];
    }

    async logMessage(data) {
        const id = `email_${Date.now()}`;
        await this.storage.save('channel_logs', id, data);
    }
}

module.exports = EmailChannel;