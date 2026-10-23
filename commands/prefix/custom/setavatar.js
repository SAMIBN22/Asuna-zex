import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} from 'discord.js';

import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'setavatar',
    description: "Change the bot's avatar",
    category: 'BotManage',
    usage: '+setavatar <url>',
    aliases: ['botavatar', 'botav'],
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const guildConfig = await GuildConfig.findOne({ guildId });

        const isPermitted = client.config.devIds.includes(message.author.id) || guildConfig?.customPermitUsers?.includes(message.author.id);

        if (!isPermitted) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Permission Denied__\n` +
                                `> ${emojis.star || ''} Only the bot owners can use this command.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const avatarUrl = args[0] || (message.attachments.first() ? message.attachments.first().url : null);

        if (!avatarUrl) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __How To Use__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}setavatar\` \`<url>\` \n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}setavatar\` https://example.com/bot.png`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await client.user.setAvatar(avatarUrl);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Avatar Updated__\n` +
                                `> ${emojis.star || ''} Successfully changed the bot's profile picture.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __System Error__\n` +
                                `> ${emojis.star || ''} Failed to set avatar: \`${error.message}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
