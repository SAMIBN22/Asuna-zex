import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionsBitField
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: "plimit",
    aliases: ["setplimit", "set-plimit", "setup-plimit", "setupplimit"],
    description: "Set or manage your prime room user limit.",
    category: "Premium",

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const voiceChannel = message.member.voice.channel;
        
        let setup = null;
        let targetChannel = null;

        if (voiceChannel) {
            setup = await GuildSetup.findOne({ channelId: voiceChannel.id });
            if (setup) targetChannel = voiceChannel;
        }

        if (!setup) {
            setup = await GuildSetup.findOne({ guildId: message.guild.id, ownerId: message.author.id, type: 'prime-room' });
            if (setup) {
                targetChannel = message.guild.channels.cache.get(setup.channelId);
            }
        }

        if (!setup || !targetChannel) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Access Denied__\n` +
                        `> ${theme.emojis.star || ''} __You must be in a managed room or own a prime room to use this command.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const managers = Array.isArray(setup.managers) ? setup.managers.map(String) : [];
        const isOwner = setup.ownerId === message.author.id;
        const isManager = managers.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdmin && !isOwner && !isManager) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Permission Denied__\n` +
                        `> ${theme.emojis.star || ''} __Only the owner or a manager of this room can manage its limit.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const limit = parseInt(args[0]);
        if (isNaN(limit) || limit < 1 || limit > 99) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Command Prime Limit__\n` +
                        `> ${theme.emojis.star || ''} **__Usage:__** plimit \`number\`\n` +
                        `> ${theme.emojis.star || ''} **__Example:__** plimit \`10\``
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await targetChannel.setUserLimit(limit);
        setup.userLimit = limit;
        await setup.save();
        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${theme.emojis.yes || ''} __Success__\n` +
                    `> ${theme.emojis.star || ''} __Room limit set to \`${limit}\` for channel **${targetChannel.name}**.__`
                )
            );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
