import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
        if (!role.guild) return;

        try {
            const settings = await client.getSettings(role.guild.id);
            if (!settings || !settings.antiRoleCreateEnabled) return;

            // Wait a moment for audit logs to generate
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleCreate,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            
            // Check if log matches our role
            if (!executor || executor.bot || target.id !== role.id) return;

            const wasPunished = await checkAntiNukeLimit(client, role.guild, executor, settings, 'RoleCreate');
            
            if (wasPunished) {
                // Restore: Delete the newly created role
                await role.delete("Anti-Nuke Protection Reversal").catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-RoleCreate Error', error, role.guild.id);
        }
    }
};
