import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'snipe',
    aliases: ['s', 'deletedmsg', 'snipemsg'],
    description: 'Show the most recently deleted message in this channel',
    category: 'BotManage',
    usage: '&snipe [#channel]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const channel = message.mentions.channels.first() || message.channel;

        if (!client.snipeCache) client.snipeCache = new Map();

        const snipedMsg = client.snipeCache.get(channel.id);

        if (!snipedMsg) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __No Deleted Messages__\n` +
                                `> ${emojis.star || ''} **Notice:** No recently deleted messages found in ${channel.toString()}.\n` +
                                `> ${emojis.star || ''} The cache resets when the bot restarts.`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 })))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const deletedAt = `<t:${Math.floor(snipedMsg.deletedAt / 1000)}:R>`;
        const content = snipedMsg.content || '*(No text content)*';
        const hasAttachments = snipedMsg.attachments?.length > 0;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Sniped Message__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${snipedMsg.authorTag}\n` +
                            `> ${emojis.star || ''} **Channel:** ${channel.toString()}\n` +
                            `> ${emojis.star || ''} **Deleted:** ${deletedAt}\n` +
                            `> ${emojis.star || ''} **Attachments:** ${hasAttachments ? snipedMsg.attachments.length : 'None'}`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(snipedMsg.authorAvatar || client.user.displayAvatarURL()))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Content__\n> ${content.slice(0, 1000)}`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
