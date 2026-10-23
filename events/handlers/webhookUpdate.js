import { Events } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';

export default {
    name: Events.WebhookUpdate,
    async execute(channel, client) {
        if (!channel.guild) return;

        try {
            const command = client.prefixCommands?.get("antiwebhook");
            if (command?.onWebhookUpdate) {
                await command.onWebhookUpdate(channel.guild, client);
            }
        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Webhook Update Error', error, channel.guild.id);
        }
    }
};
