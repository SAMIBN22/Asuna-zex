import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    ActivityType
} from 'discord.js';

import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'setstatus',
    description: "Sets the bot's status and activity",
    category: 'BotManage',
    usage: '+setstatus <online|idle|dnd|invisible> <watching|listening|playing|streaming> <text>',
    aliases: ['botstatus', 'status'],
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

        const presence = args[0]?.toLowerCase();
        const type = args[1]?.toLowerCase();
        const text = args.slice(2).join(' ');

        const validPresences = ['online', 'idle', 'dnd', 'invisible'];
        const activityMap = {
            'playing': ActivityType.Playing,
            'streaming': ActivityType.Streaming,
            'listening': ActivityType.Listening,
            'watching': ActivityType.Watching,
            'competing': ActivityType.Competing
        };

        if (!presence || !validPresences.includes(presence)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __How To Use__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}setstatus\` <presence> <type> <text>\n` +
                                `> ${emojis.star || ''} **__Presences:__** \`online\`, \`idle\`, \`dnd\`, \`invisible\`\n` +
                                `> ${emojis.star || ''} **__Types:__** \`playing\`, \`watching\`, \`listening\`, \`streaming\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}setstatus online watching Morocco\` `
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Check if invisible (doesn't need type/text)
        if (presence === 'invisible') {
            try {
                client.user.setPresence({ status: 'invisible', activities: [] });
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Status Updated__\n` +
                                    `> ${emojis.star || ''} **Presence:** \`invisible\` (Offline)\n` +
                                    `> ${emojis.star || ''} Activity has been cleared.`
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
                                    `> ${emojis.star || ''} Failed to set status: \`${error.message}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        // Requires type and text for other statuses
        if (!type || !text || !activityMap[type]) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Missing Arguments__\n` +
                                `> ${emojis.star || ''} For \`${presence}\` status, you must provide a type and text.\n` +
                                `> ${emojis.star || ''} **__Types:__** \`playing\`, \`watching\`, \`listening\`, \`streaming\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            client.user.setPresence({
                status: presence,
                activities: [{ name: text, type: activityMap[type] }]
            });
            
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Status Updated__\n` +
                                `> ${emojis.star || ''} **Presence:** \`${presence}\`\n` +
                                `> ${emojis.star || ''} **Activity:** \`${type}\` \`${text}\``
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
                                `> ${emojis.star || ''} Failed to set status: \`${error.message}\``
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
