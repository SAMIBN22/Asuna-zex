import emojis from '../../emojis.js';
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
    name: "unlock",
    aliases: ["unlockchannel", "u"],
    description: "Unlock the current channel for everyone",
    category: "Admin",
    usage: "+unlock",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        // Permission check (user)
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Manage Channels permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Permission check (bot)
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Manage Channels permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: true,
            });

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.unlock || ''} __Unlocked Success__\n\n` +
                                `> ${emojis.star || ''} **__Successfully unlocked <#${message.channel.id}>__**\n` +
                                `> ${emojis.star || ''} **__Everyone can now send messages here.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('[Unlock Command Error]:', error);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Unlock Error__\n\n` +
                                `> ${emojis.star || ''} **__Failed to unlock channel:__**\n` +
                                `> ${emojis.star || ''} **__${error.message}__**`
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
