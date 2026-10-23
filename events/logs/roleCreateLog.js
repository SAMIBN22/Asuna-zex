import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
        if (!role.guild) return;

        await new Promise(r => setTimeout(r, 1500));
        let createdBy = null;
        try {
            const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === role.id && (Date.now() - entry.createdTimestamp) < 5000) {
                createdBy = entry.executor;
            }
        } catch { /* */ }

        await sendLog(client, role.guild, 'roleCreate', (accent, theme) => {
            const star  = theme.emojis?.star || '⭐';
            const color = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '`Default`';

            return new ContainerBuilder()
                .setAccentColor(COLORS.green)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎨 __Role Created__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Role:** <@&${role.id}> (\`${role.name}\`)\n` +
                            `${star} **Role ID:** \`${role.id}\`\n` +
                            `${star} **Color:** \`${color}\`\n` +
                            `${star} **Hoisted:** \`${role.hoist ? 'Yes' : 'No'}\`\n` +
                            `${star} **Mentionable:** \`${role.mentionable ? 'Yes' : 'No'}\`\n` +
                            `${star} **Created By:** ${createdBy ? `<@${createdBy.id}>` : '`Unknown`'}\n` +
                            `${star} **Created At:** ${ts()}`
                        ))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'))
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(role.guild));
        });
    },
};
