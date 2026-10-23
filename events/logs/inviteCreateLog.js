import { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.InviteCreate,
    async execute(invite, client) {
        if (!invite.guild) return;

        await sendLog(client, invite.guild, 'inviteCreate', (accent, theme) => {
            const star    = theme.emojis?.star || '⭐';
            const creator = invite.inviter;
            const expires = invite.expiresTimestamp
                ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`
                : '`Never`';
            const maxUses = invite.maxUses === 0 ? '`Unlimited`' : `\`${invite.maxUses}\``;

            const c = new ContainerBuilder()
                .setAccentColor(COLORS.blue)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔗 __Invite Created__`))
                .addSeparatorComponents(div(true));

            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${star} **Code:** \`${invite.code}\`\n` +
                    `${star} **Channel:** <#${invite.channel?.id}>\n` +
                    `${star} **Created By:** ${creator ? `<@${creator.id}> (\`${creator.username}\`)` : '`Unknown`'}\n` +
                    `${star} **Max Uses:** ${maxUses}\n` +
                    `${star} **Expires:** ${expires}\n` +
                    `${star} **Created At:** ${ts()}`
                ));

            if (creator) {
                section.setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(creator.displayAvatarURL({ extension: 'png', size: 256 }))
                );
            } else {
                section.addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'));
            }

            c.addSectionComponents(section)
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(invite.guild));

            return c;
        });
    },
};
