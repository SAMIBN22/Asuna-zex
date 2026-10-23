import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        if (!channel.guild) return;

        try {
            const settings = await client.getSettings(channel.guild.id);
            if (!settings || !settings.antiChannelCreateEnabled) return;

            // Wait a moment for audit logs to generate
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelCreate,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            
            // Check if log matches our channel
            if (!executor || executor.bot || target.id !== channel.id) return;

            const wasPunished = await checkAntiNukeLimit(client, channel.guild, executor, settings, 'ChannelCreate');
            
            if (wasPunished) {
                // Restore: Delete the newly created channel
                await channel.delete("Anti-Nuke Protection Reversal").catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-ChannelCreate Error', error, channel.guild.id);
        }
    }
};
