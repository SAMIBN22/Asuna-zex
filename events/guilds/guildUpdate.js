import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild, client) {
        if (!newGuild) return;

        try {
            const settings = await client.getSettings(newGuild.id);
            if (!settings || !settings.antiGuildUpdateEnabled) return;

            // Wait a moment for audit logs to generate
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await newGuild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.GuildUpdate,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            
            if (!executor || executor.bot || target.id !== newGuild.id) return;

            const wasPunished = await checkAntiNukeLimit(client, newGuild, executor, settings, 'GuildUpdate');
            
            if (wasPunished) {
                // Restore: Restore server configurations (name, icon, region, verification, etc.)
                let updateData = {
                    name: oldGuild.name,
                    reason: "Anti-Nuke Protection Reversal (Server Update)",
                    verificationLevel: oldGuild.verificationLevel,
                    explicitContentFilter: oldGuild.explicitContentFilter,
                    defaultMessageNotifications: oldGuild.defaultMessageNotifications,
                    afkChannel: oldGuild.afkChannelId || null,
                    afkTimeout: oldGuild.afkTimeout,
                    systemChannel: oldGuild.systemChannelId || null,
                    rulesChannel: oldGuild.rulesChannelId || null,
                    publicUpdatesChannel: oldGuild.publicUpdatesChannelId || null,
                    description: oldGuild.description || null,
                    premiumProgressBarEnabled: oldGuild.premiumProgressBarEnabled
                };

                // Restoring vanities or invites is very complex or impossible without boosts/premium
                await newGuild.edit(updateData).catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-GuildUpdate Error', error, newGuild.id);
        }
    }
};
