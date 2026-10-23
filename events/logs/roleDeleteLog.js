import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
        if (!role.guild) return;

        await new Promise(r => setTimeout(r, 1500));
        let deletedBy = null;
        try {
            const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === role.id && (Date.now() - entry.createdTimestamp) < 5000) {
                deletedBy = entry.executor;
            }
        } catch { /* */ }

        await sendLog(client, role.guild, 'roleDelete', (accent, theme) => {
            const star  = theme.emojis?.star || '⭐';
            const color = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '`Default`';

            return new ContainerBuilder()
                .setAccentColor(COLORS.red)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ __Role Deleted__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Role Name:** \`@${role.name}\`\n` +
                            `${star} **Role ID:** \`${role.id}\`\n` +
                            `${star} **Color:** \`${color}\`\n` +
                            `${star} **Members Had It:** \`${role.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size}\`\n` +
                            `${star} **Deleted By:** ${deletedBy ? `<@${deletedBy.id}>` : '`Unknown`'}\n` +
                            `${star} **Deleted At:** ${ts()}`
                        ))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'))
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(role.guild));
        });
    },
};
