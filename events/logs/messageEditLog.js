import { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (!newMessage.guild) return;
        if (newMessage.author?.bot) return;
        if (!newMessage.author) return;

        const oldContent = oldMessage.content?.trim() || '';
        const newContent = newMessage.content?.trim() || '';

        // Ignore embed-only updates (e.g. link previews loading)
        if (oldContent === newContent) return;

        await sendLog(client, newMessage.guild, 'messageEdit', (accent, theme) => {
            const star    = theme.emojis?.star || '⭐';
            const oldPrev = oldContent.length > 500 ? oldContent.slice(0, 497) + '...' : (oldContent || '`Empty`');
            const newPrev = newContent.length > 500 ? newContent.slice(0, 497) + '...' : (newContent || '`Empty`');
            const link    = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;

            return new ContainerBuilder()
                .setAccentColor(COLORS.blue)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✏️ __Message Edited__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Author:** ${newMessage.author} (\`${newMessage.author.username}\`)\n` +
                            `${star} **Channel:** <#${newMessage.channel.id}>\n` +
                            `${star} **Edited At:** ${ts()}\n` +
                            `${star} **[Jump to Message](${link})**`
                        ))
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(
                                newMessage.author.displayAvatarURL({ extension: 'png', size: 256 })
                            )
                        )
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**📄 Before:**\n\`\`\`\n${oldPrev}\n\`\`\`\n` +
                    `**📝 After:**\n\`\`\`\n${newPrev}\n\`\`\``
                ))
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(newMessage.guild));
        });
    },
};
