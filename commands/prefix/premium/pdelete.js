import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField,
    SectionBuilder,
    ThumbnailBuilder,
    ButtonBuilder,
    ChannelType,
    ComponentType,
    StringSelectMenuBuilder
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: "pdelete",
    description: "Delete a prime room and its associated role.",
    category: "Premium",
    aliases: ["pdel", "deleteroom"],
    permissions: [PermissionsBitField.Flags.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const themeColor = client.themeManager.getRGBColor(theme.color);

        // 1. Permission Check (Admin Only)
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Permission Denied__\n` +
                        `> ${theme.emojis.star || ''} __Only administrators have the permission to use this command.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // 2. Identify Target Channel
        let targetArg = args.join(' ');
        let voiceChannel = null;

        if (targetArg) {
            const targetId = targetArg.replace(/[<#>]/g, '');
            // Try ID/Mention first
            voiceChannel = message.guild.channels.cache.get(targetId) ||
                await message.guild.channels.fetch(targetId).catch(() => null);

            // If not found by ID, try searching by name
            if (!voiceChannel) {
                voiceChannel = message.guild.channels.cache.find(c =>
                    c.name.toLowerCase() === targetArg.toLowerCase() && c.type === ChannelType.GuildVoice
                );
            }
        } else {
            voiceChannel = message.member.voice.channel;
        }

        // ChannelType.GuildVoice is 2
        if (!voiceChannel || (voiceChannel.type !== 2 && voiceChannel.type !== ChannelType.GuildVoice)) {
            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Target Error__\n` +
                                `> ${theme.emojis.star || ''} __Please provide a valid room name, ID, or join the room.__\n` +
                                `> ${theme.emojis.star || ''} **Usage:** \`+pdelete [room_name / id / #mention]\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const setup = await GuildSetup.findOne({ channelId: voiceChannel.id });
        if (!setup) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Warning__\n` +
                        `> ${theme.emojis.star || ''} __This room \`${voiceChannel.name}\` is not in our records.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // 3. Selection UI
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("pdelete_select")
            .setPlaceholder("What do you want to delete?")
            .addOptions([
                { label: "Voice Channel Only", description: "Delete only the voice channel", value: "channel" },
                { label: "Role Only", description: "Delete only the associated role", value: "role" },
                { label: "Both (Complete Wipe)", description: "Delete channel, role and database record", value: "both" }
            ]);

        const containerSelect = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${theme.emojis.title || ''} __Select Deletion Target__\n` +
                            `> ${theme.emojis.star || ''} __Target Room:__ **${voiceChannel.name}**\n` +
                            `> ${theme.emojis.star || ''} __Target Role:__ ${setup.roleId ? `<@&${setup.roleId}>` : '*None*'}\n\n` +
                            `> ${theme.emojis.star || ''} **__Choose an option below to proceed.__**`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addActionRowComponents(row => row.setComponents(selectMenu));

        const sentMsg = await message.reply({ components: [containerSelect], flags: MessageFlags.IsComponentsV2 });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on("collect", async i => {
            const choice = i.values[0];
            await i.deferUpdate();

            try {
                const channelName = voiceChannel.name;
                let deletedItems = [];

                if (choice === "role" || choice === "both") {
                    if (setup.roleId) {
                        const role = message.guild.roles.cache.get(setup.roleId);
                        if (role) {
                            await role.delete(`Prime room cleanup by Admin ${message.author.tag}`).catch(() => null);
                            deletedItems.push("Role");
                            setup.roleId = null;
                        }
                    }
                }

                if (choice === "channel" || choice === "both") {
                    await voiceChannel.delete(`Prime room cleanup by Admin ${message.author.tag}`).catch(() => null);
                    deletedItems.push("Voice Channel");
                }

                // If "Both" or if it was the last thing to delete, wipe record.
                if (choice === "both") {
                    await GuildSetup.deleteOne({ guildId: message.guild.id, channelId: voiceChannel.id });
                } else {
                    await setup.save();
                }

                const successContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.yes || ''} __Deletion Successful__\n` +
                            `> ${theme.emojis.star || ''} __Room:__ **${channelName}**\n` +
                            `> ${theme.emojis.star || ''} __Removed:__ \`${deletedItems.join(" & ") || "Record Only"}\`\n\n` +
                            `> ${theme.emojis.star || ''} __The selected components have been removed.__`
                        )
                    );

                await i.editReply({ components: [successContainer] });
                collector.stop();

            } catch (error) {
                console.error('[PDELETE] Error:', error);
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.no || ''} __Error Occurred__\n` +
                            `> ${theme.emojis.star || ''} __An unexpected error occurred during the deletion process.__`
                        )
                    );
                await i.editReply({ components: [errorContainer] });
            }
        });
    }
};
