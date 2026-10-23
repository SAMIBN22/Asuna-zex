import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
        if (!role.guild) return;

        try {
            const settings = await client.getSettings(role.guild.id);
            if (!settings || !settings.antiRoleDeleteEnabled) return;

            // Wait a moment for audit logs to generate
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleDelete,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            
            // Check if log matches our role
            if (!executor || executor.bot || target.id !== role.id) return;

            const wasPunished = await checkAntiNukeLimit(client, role.guild, executor, settings, 'RoleDelete');
            
            if (wasPunished) {
                // Restore: Clone the deleted role (cannot restore users perfectly)
                await role.guild.roles.create({
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    permissions: role.permissions,
                    position: role.position, // Position might not perfectly restore, depends on discord api limits
                    mentionable: role.mentionable,
                    icon: role.icon,
                    unicodeEmoji: role.unicodeEmoji,
                    reason: "Anti-Nuke Protection Reversal (Role Delete)"
                }).catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-RoleDelete Error', error, role.guild.id);
        }
    }
};
