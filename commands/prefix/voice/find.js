import { resolveUser } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

export default {
    name: "find",
    aliases: ["locate", "search", "where", "track"],
    description: "Finds a user in a voice channel and displays relevant information",
    category: "Voice",
    usage: "+find <user>",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        let targetUser;
        const targetId = args[0]?.replace(/[<@!>]/g, '');

        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
        } else if (targetId) {
            targetUser = await client.users.fetch(targetId).catch(() => null);
        } else {
            targetUser = message.author;
        }

        if (!targetUser) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}find <@user>\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}find ${message.author.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Member Not Found__\n\n` +
                                `> ${emojis.star || ''} **__The user <@${targetUser.id}> is not__**\n` +
                                `> ${emojis.star || ''} **__a member of this server.__**`
                            )
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__The user <@${targetUser.id}> is not__**\n` +
                                `> ${emojis.star || ''} **__connected to any voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const members = [...voiceChannel.members.values()];
        let page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(members.length / perPage);

        const renderPage = (currentPage) => {
            const start = currentPage * perPage;
            const usersOnPage = members.slice(start, start + perPage);

            const membersList = usersOnPage
                .map(m => `> ${emojis.star || ''} **__<@${m.id}>__**`)
                .join("\n");

            const paginationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("find_prev")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId("find_next")
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId("find_info")
                    .setLabel("User Info")
                    .setStyle(ButtonStyle.Danger)
            );

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.voice || ''} __Voice Tracking Info__\n\n` +
                                `> ${emojis.star || ''} **__Target:__** <@${targetUser.id}>\n` +
                                `> ${emojis.star || ''} **__Channel:__** <#${voiceChannel.id}>\n` +
                                `> ${emojis.star || ''} **__Name:__** \`${voiceChannel.name}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} **__Active Members__** *(Page ${currentPage + 1}/${totalPages})*\n\n` +
                        (membersList || "> *No users found in this range*")
                    )
                )
                .addActionRowComponents(paginationRow);

            return [container];
        };

        const msg = await message.reply({
            components: renderPage(page),
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
            time: 600000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on("collect", async interaction => {
            if (interaction.customId === "find_prev") {
                page = Math.max(0, page - 1);
            } else if (interaction.customId === "find_next") {
                page = Math.min(totalPages - 1, page + 1);
            } else if (interaction.customId === "find_info") {
                const createdAt = `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>`;
                const nickname = member?.nickname || "No Nickname";
                const joinedAt = member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Not in this server";
                const highestRole = member?.roles.highest ? member.roles.highest.toString() : "No Role";

                const infoContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __User Information__\n\n` +
                                    `> ${emojis.star || ''} **__Username:__** \`${targetUser.tag}\`\n` +
                                    `> ${emojis.star || ''} **__ID:__** \`${targetUser.id}\`\n` +
                                    `> ${emojis.star || ''} **__Nickname:__** \`${nickname}\`\n` +
                                    `> ${emojis.star || ''} **__Created:__** ${createdAt}\n` +
                                    `> ${emojis.star || ''} **__Joined:__** ${joinedAt}`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} **__Permissions & Roles__**\n\n` +
                            `> ${emojis.star || ''} **__Highest Role:__** ${highestRole}`
                        )
                    );

                return interaction.reply({
                    components: [infoContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            await interaction.update({
                components: renderPage(page),
                flags: MessageFlags.IsComponentsV2
            });
        });
    }
};

