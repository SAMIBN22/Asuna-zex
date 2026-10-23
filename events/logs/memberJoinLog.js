import { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, tsR, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (!member.guild) return;

        await sendLog(client, member.guild, 'memberJoin', (accent, theme) => {
            const isNew = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000;
            const star  = theme.emojis?.star || '⭐';

            return new ContainerBuilder()
                .setAccentColor(COLORS.green)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# 📥 __Member Joined__`
                ))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Member:** ${member} (\`${member.user.username}\`)\n` +
                            `${star} **User ID:** \`${member.id}\`\n` +
                            `${star} **Account Created:** ${tsR(member.user.createdTimestamp)}\n` +
                            `${star} **Joined At:** ${ts(member.joinedTimestamp ?? Date.now())}\n` +
                            `${star} **Member Count:** \`${member.guild.memberCount.toLocaleString()}\`` +
                            (isNew ? `\n\n⚠️ **New Account** — created less than **7 days** ago` : '')
                        ))
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(
                                member.user.displayAvatarURL({ extension: 'png', size: 256 })
                            )
                        )
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(member.guild));
        });
    },
};
