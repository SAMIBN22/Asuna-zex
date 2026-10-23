import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionsBitField
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: "puser",
    aliases: ["primeuser"],
    description: "Manage users of your prime room (add/reject).",
    category: "Premium",

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const subCommand = args[0]?.toLowerCase();
        const target = await resolveMember(message, args[0]);
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
                        `> ${theme.emojis.star || ''} __Only the owner or a manager of this room can manage its users.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!subCommand || !["add", "remove"].includes(subCommand) || !target) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title} __Prime User Command__\n` +
                                `> ${theme.emojis.star} __Examples:__ \n` +
                                `> ${theme.emojis.star} \`puser add userid\`  Allow user in room\n` +
                                `> ${theme.emojis.star} \`puser remove userid\`  Reject user from room`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (subCommand === "add") {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("puser_add_select")
                .setPlaceholder("Choose access type")
                .addOptions([
                    { label: "Channel Only", value: "channel" },
                    { label: "Role Only", value: "role" },
                    { label: "Both", value: "both" }
                ]);

            const containerSelect = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${theme.emojis.title} __Select Access Type__\n` +
                                `> ${theme.emojis.star} Choose what you want to give the user access to.`
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
                if (choice === "channel" || choice === "both") {
                    await targetChannel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
                }
                if ((choice === "role" || choice === "both") && setup.roleId) {
                    const role = message.guild.roles.cache.get(setup.roleId);
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member && role) await member.roles.add(role).catch(() => { });
                }

                if (!setup.allowedUsers) setup.allowedUsers = [];
                if (!setup.allowedUsers.includes(target.id)) {
                    setup.allowedUsers.push(target.id);
                    setup.rejectedUsers = (setup.rejectedUsers || []).filter(id => id !== target.id);
                    await setup.save();
                }

                const containerSuccess = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.yes} __Success__\n` +
                            `> ${theme.emojis.star} __Access granted to <@${target.id}> (${choice}).__`
                        )
                    );

                await i.update({ components: [containerSuccess] });
                collector.stop();
            });
        }

        if (subCommand === "remove") {
            if (target.id === setup.ownerId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${theme.emojis.title} __Warning__\n` +
                                    `> ${theme.emojis.star} You cannot reject the owner of this room.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            const removeMenu = new StringSelectMenuBuilder()
                .setCustomId("puser_remove_select")
                .setPlaceholder("Choose what to remove")
                .addOptions([
                    { label: "Channel Only", value: "channel" },
                    { label: "Role Only", value: "role" },
                    { label: "Both", value: "both" }
                ]);

            const containerRemove = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Select Rejection Type__\n` +
                        `> ${theme.emojis.star || ''} Choose what permissions you want to remove from **${targetChannel.name}** for <@${target.id}>.`
                    )
                )
                .addActionRowComponents(row => row.setComponents(removeMenu));

            const sentRemove = await message.reply({ components: [containerRemove], flags: MessageFlags.IsComponentsV2 });

            const removeCollector = sentRemove.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            removeCollector.on("collect", async i => {
                const choice = i.values[0];

                if (choice === "channel" || choice === "both") {
                    await targetChannel.permissionOverwrites.edit(target.id, { Connect: false });
                }
                if ((choice === "role" || choice === "both") && setup.roleId) {
                    const role = message.guild.roles.cache.get(setup.roleId);
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member && role) await member.roles.remove(role).catch(() => { });
                }

                if (!setup.rejectedUsers) setup.rejectedUsers = [];
                if (!setup.rejectedUsers.includes(target.id)) {
                    setup.rejectedUsers.push(target.id);
                    setup.allowedUsers = (setup.allowedUsers || []).filter(id => id !== target.id);
                    await setup.save();
                }

                const containerSuccess = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.yes} __Success__\n` +
                            `> ${theme.emojis.star} __Access removed from <@${target.id}> (${choice}).__`
                        )
                    );
                await i.update({ components: [containerSuccess] });
                removeCollector.stop();
            });
        }
    }
};
