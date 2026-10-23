import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole, client) {
        if (!newRole.guild) return;

        try {
            const settings = await client.getSettings(newRole.guild.id);
            if (!settings) return;

            // Wait for audit log
            await new Promise(resolve => setTimeout(resolve, 2000));

            const fetchedLogs = await newRole.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleUpdate,
            });

            const auditEntry = fetchedLogs.entries.first();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            if (!executor || executor.bot || target.id !== newRole.id) return;

            const permChanged = !oldRole.permissions.equals(newRole.permissions);
            const propChanged = oldRole.name !== newRole.name || 
                              oldRole.color !== newRole.color || 
                              oldRole.hoist !== newRole.hoist || 
                              oldRole.mentionable !== newRole.mentionable ||
                              oldRole.icon !== newRole.icon;

            let restoreNeeded = false;

            // 1. Check Permissions Update Protection
            if (permChanged && settings.antiRolePermsUpdateEnabled) {
                const punished = await checkAntiNukeLimit(client, newRole.guild, executor, settings, 'RolePermsUpdate');
                if (punished) restoreNeeded = true;
            }

            // 2. Check general Property Update Protection
            if (propChanged && settings.antiRoleUpdateEnabled) {
                const punished = await checkAntiNukeLimit(client, newRole.guild, executor, settings, 'RoleUpdate');
                if (punished) restoreNeeded = true;
            }

            if (restoreNeeded) {
                await newRole.edit({
                    name: oldRole.name,
                    color: oldRole.color,
                    hoist: oldRole.hoist,
                    permissions: oldRole.permissions,
                    mentionable: oldRole.mentionable,
                    icon: oldRole.icon,
                    unicodeEmoji: oldRole.unicodeEmoji,
                    reason: "Anti-Nuke Protection Reversal (Role Security)"
                }).catch(() => null);
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Anti-RoleUpdate Error', error, newRole.guild ? newRole.guild.id : 'Unknown');
        }
    }
};
