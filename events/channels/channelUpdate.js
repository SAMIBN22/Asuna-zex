import { Events, AuditLogEvent, PermissionsBitField } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
        if (!newChannel.guild) return;

        try {
            const settings = await client.getSettings(newChannel.guild.id);
            if (!settings || !settings.antiChannelUpdateEnabled) return;

            // Wait a moment for audit logs to generate
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await newChannel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelUpdate,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            
            // Check if log matches our channel
            if (!executor || executor.bot || target.id !== newChannel.id) return;

            const wasPunished = await checkAntiNukeLimit(client, newChannel.guild, executor, settings, 'ChannelUpdate');
            
            if (wasPunished) {
                // Restore: Restore channel name, topic, nsfw, and permission overwrites
                const updateData = {
                    name: oldChannel.name,
                    reason: "Anti-Nuke Protection Reversal (Channel Update)"
                };

                if (oldChannel.type === newChannel.type) {
                    if (oldChannel.topic !== undefined) updateData.topic = oldChannel.topic;
                    if (oldChannel.nsfw !== undefined) updateData.nsfw = oldChannel.nsfw;
                    if (oldChannel.bitrate !== undefined) updateData.bitrate = oldChannel.bitrate;
                    if (oldChannel.userLimit !== undefined) updateData.userLimit = oldChannel.userLimit;
                    
                    // Restore permissions
                    await newChannel.permissionOverwrites.set(oldChannel.permissionOverwrites.cache);
                }

                await newChannel.edit(updateData).catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-ChannelUpdate Error', error, newChannel.guild.id);
        }
    }
};
