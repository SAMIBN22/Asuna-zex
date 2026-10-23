import WebhookLogger from '../functions/webhookLogger.js';

class NoPrefixHandler {
    constructor(client) {
        this.client = client;
    }

    init() {
    }

    async handleMessage(message, preFetchedSettings = null) {
        if (message.author.bot || !message.guild) return false;

        const settings = preFetchedSettings || await this.client.getSettings(message.guild.id);
        if (!settings) return false;
        const prefix = settings.prefix || this.client.config.prefix || '+';
        if (message.content.startsWith(prefix)) return false;

        const args = message.content.trim().split(/\s+/);
        const trigger = args.shift()?.toLowerCase();
        if (!trigger) return false;

        let commandName = trigger;
        let resolvedViaCustomAlias = false;
        if (settings.customAliases) {
            if (settings.customAliases.get && typeof settings.customAliases.get === 'function') {
                if (settings.customAliases.has(trigger)) {
                    commandName = settings.customAliases.get(trigger);
                    resolvedViaCustomAlias = true;
                }
            } else if (settings.customAliases[trigger]) {
                commandName = settings.customAliases[trigger];
                resolvedViaCustomAlias = true;
            }
        }

        const command = this.client.prefixCommands.get(commandName);
        if (!command) return false;

        // Any alias (built-in or custom) bypasses the noPrefixCommands gate.
        // Built-in aliases: trigger !== command.name (e.g. "ms7" vs "music")
        // Custom aliases:   resolvedViaCustomAlias is true
        // Primary name:     trigger === command.name → gate still applies normally
        const resolvedViaAlias = resolvedViaCustomAlias || (trigger !== command.name);
        const isGlobalNoPrefix = command.noPrefix === true;
        if (!resolvedViaAlias && !isGlobalNoPrefix && !settings.noPrefixCommands.includes(command.name)) return false;

        try {
            if (command.execute) {
                await command.execute(message, args, this.client);
            } else if (command.run) {
                await command.run(this.client, message, args);
            }
            return true;
        } catch (error) {
            console.error(`[NoPrefix] Error executing ${command.name}:`, error);
            const webhookLogger = new WebhookLogger(this.client);
            await webhookLogger.logError('No Prefix Command Error', error, message.guild.id, {
                commandName: command.name,
                user: message.author.tag,
                content: message.content
            });
            return false;
        }
    }

    getStats() {
        return {
            mode: 'Dynamic'
        };
    }
}

export default NoPrefixHandler;
