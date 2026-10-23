import { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.InviteDelete,
    async execute(invite, client) {
        if (!invite.guild) return;

        await sendLog(client, invite.guild, 'inviteDelete', (accent, theme) => {
            const star = theme.emojis?.star || '⭐';

            return new ContainerBuilder()
                .setAccentColor(COLORS.orange)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🚫 __Invite Deleted__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Code:** \`${invite.code}\`\n` +
                            `${star} **Channel:** ${invite.channel ? `<#${invite.channel.id}>` : '`Unknown`'}\n` +
                            `${star} **Uses:** \`${invite.uses ?? '?'}\`\n` +
                            `${star} **Deleted At:** ${ts()}`
                        ))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'))
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(invite.guild));
        });
    },
};
