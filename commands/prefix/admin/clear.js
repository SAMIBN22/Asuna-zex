import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'clear',
    aliases: ['purge', 'mse7', 'ms7', 'clean', 'bulkdelete'],
    noPrefix: true,
    description: 'Clear multiple messages from the channel',
    category: 'Admin',
    usage: '+clear <amount>',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Manage Messages permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Manage Messages permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}clear <1-100>\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}clear 50\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        try {
            const messages = await message.channel.messages.fetch({ limit: amount });
            const deletableMessages = messages.filter(msg => !msg.pinned && (Date.now() - msg.createdTimestamp) < 1209600000);

            if (deletableMessages.size === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __No Messages__\n\n` +
                                    `> ${emojis.star || ''} **__Could not find any deletable messages.__**\n` +
                                    `> ${emojis.star || ''} **__Pinned/Old messages cannot be deleted.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            await message.channel.bulkDelete(deletableMessages, true);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Clear Success__\n\n` +
                                `> ${emojis.star || ''} **__Successfully cleared ${deletableMessages.size} messages.__**\n` +
                                `> ${emojis.star || ''} **__The channel has been cleaned up.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                        )
                );

            const successMsg = await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => null);
            if (successMsg) {
                setTimeout(() => successMsg.delete().catch(() => null), 4000);
            }

        } catch (error) {
            console.error('[Clear Command Error]:', error);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Clear Error__\n\n` +
                                `> ${emojis.star || ''} **__Failed to clear messages:__**\n` +
                                `> ${emojis.star || ''} **__${error.message}__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }
    }
};
