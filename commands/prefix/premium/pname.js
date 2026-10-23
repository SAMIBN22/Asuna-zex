import {
    ContainerBuilder,
    TextDisplayBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    MessageFlags,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    ChannelType,
    PermissionsBitField,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: "pname",
    aliases: ["setpname", "set-pname", "setup-pname", "setroomname"],
    description: "Set or manage your prime room name.",
    category: "Premium",

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const voiceChannel = message.member.voice.channel;
        
        // 1. Find the target room: 
        // Either the one they are in, OR the one they own if not in a channel.
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
                        `> ${theme.emojis.star || ''} __Only the owner or a manager of this room can change its name.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const newName = args.join(" ");
        if (!newName || newName.length > 32) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${theme.emojis.title} __Command Prime Name__\n` +
                                `> ${theme.emojis.star} **__Usage:__** pname \`new name\` \n` +
                                `> ${theme.emojis.star} **__Example:__** pname \`Chill Room\` `
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("pname_select")
            .setPlaceholder("Choose what to rename")
            .addOptions([
                { label: "Voice Channel", value: "channel" },
                { label: "Role", value: "role" },
                { label: "Both", value: "both" }
            ]);

        const containerSelect = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${theme.emojis.title || ''} __Select Target__\n` +
                    `> ${theme.emojis.star || ''} Please choose what you want to rename in **${targetChannel.name}**.`
                )
            )
            .addActionRowComponents(row => row.setComponents(selectMenu));

        const sentMsg = await message.reply({
            components: [containerSelect],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on("collect", async i => {
            if (i.user.id !== message.author.id) return i.reply({ ephemeral: true, content: "You cannot use this menu." });

            const choice = i.values[0];

            if (choice === "channel" || choice === "both") await targetChannel.setName(newName);
            if ((choice === "role" || choice === "both") && setup.roleId) {
                const role = message.guild.roles.cache.get(setup.roleId);
                if (role) await role.setName(newName);
            }

            setup.name = newName;
            await setup.save();

            const containerSuccess = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes} __Success__\n` +
                        `> ${theme.emojis.star} __Name applied to ${choice}.__`
                    )
                );

            await i.update({ components: [containerSuccess] });
            collector.stop();
        });
    }
};
