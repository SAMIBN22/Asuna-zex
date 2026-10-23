import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildBanAdd,
    async execute(ban, client) {
        if (!ban.guild) return;

        await new Promise(r => setTimeout(r, 1500));
        let bannedBy = null;
        let reason   = ban.reason || 'No reason provided';

        try {
            const logs  = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBan });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === ban.user.id && (Date.now() - entry.createdTimestamp) < 5000) {
                bannedBy = entry.executor;
                reason   = entry.reason || reason;
            }
        } catch { /* no audit log access */ }

        await sendLog(client, ban.guild, 'memberBan', (accent, theme) => {
            const star = theme.emojis?.star || '⭐';

            return new ContainerBuilder()
                .setAccentColor(COLORS.red)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# 🔨 __Member Banned__`
                ))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Member:** \`${ban.user.tag}\`\n` +
                            `${star} **User ID:** \`${ban.user.id}\`\n` +
                            `${star} **Banned By:** ${bannedBy ? `<@${bannedBy.id}> (\`${bannedBy.tag}\`)` : '`Unknown`'}\n` +
                            `${star} **Reason:** \`${reason}\`\n` +
                            `${star} **Banned At:** ${ts()}`
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
