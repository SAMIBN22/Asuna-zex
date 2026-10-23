import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';
import AFK from '../../../models/afk.js';

export default {
    name: 'afk',
    description: 'Set your AFK status with an optional message',
    category: 'Utility',
    usage: 'afk [message]',
    aliases: ['away'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;
        const afkMessage = args.join(' ') || 'AFK';

        const existing = await AFK.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (existing) {
            await AFK.deleteOne({ userId: message.author.id, guildId: message.guild.id });
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __AFK Removed__\n` +
                                    `> ${emojis.star || ''} **Your AFK status has been cleared.**`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        await AFK.create({ userId: message.author.id, guildId: message.guild.id, message: afkMessage.slice(0, 200) });

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.title || ''} __AFK Status Set__\n` +
                                `> ${emojis.star || ''} **Message:** ${afkMessage.slice(0, 200)}\n` +
                                `> ${emojis.star || ''} **Status:** You are now marked as AFK.`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
