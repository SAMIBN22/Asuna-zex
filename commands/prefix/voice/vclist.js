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
    name: "vclist",
    aliases: ["vL", "voicelist", "voicechannels", "vcl"],
    description: "Shows a list of users currently in your voice channel",
    category: "Voice",
    usage: "+vclist",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__You must be in a voice channel__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const members = [...voiceChannel.members.values()];
        if (members.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__Could not find any members__**\n` +
                                `> ${emojis.star || ''} **__in your current voice channel.__**`
                            )
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

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
                    .setCustomId("vclist_prev")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId("vclist_next")
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.voice || ''} __Voice Channel Info__\n\n` +
                                `> ${emojis.star || ''} **__Channel:__** <#${voiceChannel.id}>\n` +
                                `> ${emojis.star || ''} **__Users:__** \`${members.length}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
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
            if (interaction.customId === "vclist_prev") {
                page = Math.max(0, page - 1);
            } else if (interaction.customId === "vclist_next") {
                page = Math.min(totalPages - 1, page + 1);
            }

            await interaction.update({
                components: renderPage(page),
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on("end", async () => {
            try {
            } catch (e) { }
        });
    }
};

