import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildBanRemove,
    async execute(ban, client) {
        if (!ban.guild) return;

        await new Promise(r => setTimeout(r, 1500));
        let unbannedBy = null;

        try {
            const logs  = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUnban });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === ban.user.id && (Date.now() - entry.createdTimestamp) < 5000) {
                unbannedBy = entry.executor;
            }
        } catch { /* no audit log access */ }

        await sendLog(client, ban.guild, 'memberUnban', (accent, theme) => {
            const star = theme.emojis?.star || '⭐';

            return new ContainerBuilder()
                .setAccentColor(COLORS.green)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# ✅ __Member Unbanned__`
                ))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Member:** \`${ban.user.tag}\`\n` +
                            `${star} **User ID:** \`${ban.user.id}\`\n` +
                            `${star} **Unbanned By:** ${unbannedBy ? `<@${unbannedBy.id}> (\`${unbannedBy.tag}\`)` : '`Unknown`'}\n` +
                            `${star} **Unbanned At:** ${ts()}`
                        ))
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(
                                ban.user.displayAvatarURL({ extension: 'png', size: 256 })
                            )
                        )
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(ban.guild));
        });
    },
};
