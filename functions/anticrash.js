import { EventEmitter } from 'events';
import constants from '../config/constant.js';
import WebhookLogger from './webhookLogger.js';
import config from '../config/config.js';

class AntiCrashSystem extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.crashCount = 0;
        this.maxCrashes = 5;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = constants.TIMEOUTS.COMMAND_EXECUTION;
        this.isShuttingDown = false;
        this.init();
    }

    init() {
        this.setupProcessHandlers();
        this.setupDiscordHandlers();
    }

    setupProcessHandlers() {
        process.on('uncaughtException', (error) => {
            this.handleCriticalError('uncaughtException', error);
        });

        process.on('unhandledRejection', (reason) => {
            this.handleCriticalError('unhandledRejection', reason);
        });

        process.on('SIGINT', () => this.performGracefulShutdown());
        process.on('SIGTERM', () => this.performGracefulShutdown());
    }

    setupDiscordHandlers() {
        if (!this.client) return;

        this.client.on('error', (error) => {
            this.handleDiscordError(error);
        });

        this.client.on('disconnect', () => {
            this.handleDisconnect();
        });

        this.client.on('reconnecting', () => {
            this.emit('reconnecting');
        });

        this.client.on('resume', () => {
            this.reconnectAttempts = 0;
            this.emit('reconnected');
        });
    }

    async handleCriticalError(type, error) {
        // WebSocket/network blips (Discord gateway unreachable, Cloudflare 521, etc.)
        // are NOT logic crashes — treat them as reconnectable connection errors so the
        // crash counter is not incremented and the bot reconnects gracefully.
        if (this.isConnectionError(error)) {
            await this.handleConnectionError(error);
            return;
        }

        this.crashCount++;

        const errorDetails = {
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            crashCount: this.crashCount,
            uptime: process.uptime()
        };

        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            `Critical Error - ${type}`,
            errorDetails,
            null,
            {
                crashCount: this.crashCount,
                maxCrashes: this.maxCrashes,
                uptime: Math.floor(errorDetails.uptime)
            }
        );

        setTimeout(() => {
            this.attemptRecovery();
        }, 5000);
    }

    async handleDiscordError(error) {
        if (this.isConnectionError(error)) {
            await this.handleConnectionError(error);
        } else if (this.isRateLimitError(error)) {
            await this.handleRateLimitError(error);
        } else {
            const webhookLogger = new WebhookLogger(this.client);
            await webhookLogger.logError(
                'Discord Error',
                error,
                null,
                {
                    code: error.code || 'N/A',
                    type: error.constructor.name
                }
            );
        }
    }

    async handleConnectionError(error) {
        this.reconnectAttempts++;

        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            'Connection Error',
            error,
            null,
            {
                code: error.code,
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts,
                action: 'Reconnecting...'
            }
        );

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            setTimeout(() => {
                this.attemptReconnect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            const webhookLogger = new WebhookLogger(this.client);
            await webhookLogger.logError(
                'Max Reconnect Attempts',
                new Error('Max reconnect attempts reached'),
                null,
                {
                    attempts: this.reconnectAttempts,
                    maxAttempts: this.maxReconnectAttempts,
                    status: 'Skipping shutdown, continuing...'
                }
            );
        }
    }

    async handleRateLimitError(error) {
        const retryAfter = error.retry_after || 1000;

        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            'Rate Limit Hit',
            error,
            null,
            {
                retryAfter: retryAfter,
                limit: error.limit || 'N/A',
                remaining: error.remaining || 'N/A',
                action: 'Waiting...'
            }
        );

        setTimeout(() => {
            this.attemptRecovery();
        }, retryAfter);
    }

    handleDisconnect() {
        this.attemptReconnect();
    }

    attemptRecovery() {
        // IMPORTANT: never clear commands/events here — doing so would make
        // the bot appear online but not respond to any command until restarted.
        // Recovery from a non-connection error means the error was logged and
        // the process continues; no collections should be wiped.
        this.emit('attemptingRecovery');
    }

    attemptReconnect() {
        // Discord.js v14 reconnects the WebSocket automatically after transient
        // failures. Calling client.destroy() + client.login() here is dangerous:
        // destroy() removes ALL event listeners (messageCreate, interactionCreate,
        // etc.) so the bot would come back online but be deaf to everything.
        // We just log the attempt and let discord.js handle the reconnect.
        if (!this.client || this.isShuttingDown) return;
        console.warn('[AntiCrash] Reconnect requested — letting discord.js handle it automatically.');
    }

    async performEmergencyShutdown() {
        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            'Emergency Shutdown Skipped',
            new Error('Emergency shutdown was skipped'),
            null,
            {
                crashCount: this.crashCount,
                maxCrashes: this.maxCrashes,
                status: 'Skipping shutdown, continuing operation...',
                uptime: Math.floor(process.uptime())
            }
        );
    }

    performGracefulShutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        if (this.client) {
            this.client.destroy();
        }

        process.exit(0);
    }

    isConnectionError(error) {
        // Safely coerce to string — process-level events can emit non-Error values
        const msg = (error?.message ?? String(error ?? '')).toString();
        const code = error?.code;
        return code === 'ECONNRESET' ||
            code === 'ENOTFOUND' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNREFUSED' ||
            msg.includes('Connection reset') ||
            msg.includes('WebSocket connection closed') ||
            msg.includes('socket hang up') ||
            // Cloudflare / Discord gateway temporary outages (HTTP 521, 520, etc.)
            msg.includes('Unexpected server response');
    }

    isRateLimitError(error) {
        return error.code === 429 ||
            error.message.includes('rate limit') ||
            error.message.includes('Too Many Requests');
    }

    getStats() {
        return {
            crashCount: this.crashCount,
            reconnectAttempts: this.reconnectAttempts,
            uptime: process.uptime(),
            isShuttingDown: this.isShuttingDown
        };
    }

    async handleMessageError(error, message) {
        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            'Message Error',
            error,
            message.guild?.id || null,
            {
                channel: message.channel.id,
                user: message.author.id,
                content: message.content.substring(0, 100)
            }
        );
    }

    async handleInteractionError(error, interaction) {
        const webhookLogger = new WebhookLogger(this.client);
        await webhookLogger.logError(
            'Interaction Error',
            error,
            interaction.guild?.id || null,
            {
                type: interaction.type,
                command: interaction.commandName || 'N/A',
                user: interaction.user.id,
                guild: interaction.guild?.name || 'DM'
            }
        );
    }

    reset() {
        this.crashCount = 0;
        this.reconnectAttempts = 0;
    }
}

export default AntiCrashSystem;