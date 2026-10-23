import {
    TextDisplayBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

function getRoleInfoContainer(role, theme, themeColor, permissionsCount, membersCount, message) {
    const emojis = theme.emojis;
    const createdAt = new Date(role.createdTimestamp);
    const hexColor = role.hexColor !== '#000000' ? role.hexColor : 'None';
    const roleAge = Math.floor((Date.now() - role.createdTimestamp) / (1000 * 60 * 60 * 24));
    const roleIcon = role.iconURL({ extension: 'png', size: 4096 });
    const botAvatar = message.client.user.displayAvatarURL({ extension: 'png', size: 4096 });

    const basicInfoText =
        `> ${emojis.star || ''} **__Name:__ \`${role.name}\`**\n` +
        `> ${emojis.star || ''} **__ID:__ \`${role.id}\`**\n` +
        `> ${emojis.star || ''} **__Mention:__ <@&${role.id}>**\n` +
        `> ${emojis.star || ''} **__Color:__ \`${hexColor}\`**\n` +
        `> ${emojis.star || ''} **__Position:__ \`${role.position}/${message.guild.roles.cache.size - 1}\`**\n` +
        `> ${emojis.star || ''} **__Age:__ \`${roleAge} days\`**\n` +
        `> ${emojis.star || ''} **__Created:__ <t:${Math.floor(createdAt.getTime() / 1000)}:R>**`;

    const permissionsButton = new ButtonBuilder()
        .setCustomId('show_permissions')
        .setLabel(`Permissions (${permissionsCount})`)
        .setStyle(ButtonStyle.Secondary);

    const membersButton = new ButtonBuilder()
        .setCustomId('show_members')
        .setLabel(`Members (${membersCount})`)
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder()
        .addComponents(permissionsButton, membersButton);

    const themeImage = new MediaGalleryBuilder().addItems(item =>
        item.setURL(theme.images.help || message.client.user.displayAvatarURL())
    );

    return new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${emojis.title || ''} __${role.name} Info__\n\n` +
                        `${basicInfoText}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(roleIcon || botAvatar)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(themeImage)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buttonRow);
}

function getPermissionsContainer(role, theme, themeColor, page = 0, message = null) {
    const emojis = theme.emojis;
    const permsArr = role.permissions.toArray();
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(permsArr.length / pageSize));
    const start = page * pageSize;
    const end = start + pageSize;
    const permissionsPage = permsArr.slice(start, end);

    const permissionsText = permissionsPage.length > 0
        ? permissionsPage.map((perm, index) => `> ${emojis.star || ''} **__${start + index + 1}.__ \`${perm}\`**`).join('\n')
        : `> ${emojis.star || ''} **__No special permissions.__**`;

    const buttons = [];
    if (page > 0) {
        buttons.push(new ButtonBuilder().setCustomId('prev_perm_page').setLabel('Previous').setStyle(ButtonStyle.Secondary));
    }
    if (page < totalPages - 1) {
        buttons.push(new ButtonBuilder().setCustomId('next_perm_page').setLabel('Next').setStyle(ButtonStyle.Secondary));
    }
    buttons.push(new ButtonBuilder().setCustomId('back_to_info').setLabel('Back to Info').setStyle(ButtonStyle.Primary));

    const buttonRow = new ActionRowBuilder().addComponents(buttons);
    const roleIcon = role.iconURL({ extension: 'png', size: 4096 });
    const botAvatar = message ? message.client.user.displayAvatarURL({ extension: 'png', size: 4096 }) : null;

    return new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${emojis.title || ''} __${role.name} Permissions__\n\n` +
                        `${permissionsText}\n\n` +
                        `> **__Total:__ \`${permsArr.length}\`** | **__Page:__ \`${page + 1}/${totalPages}\`**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(roleIcon || botAvatar)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buttonRow);
}

function getMembersContainer(role, theme, themeColor, membersArr, page = 0, message = null) {
    const emojis = theme.emojis;
    const pageSize = 10;
    const membersArray = Array.from(membersArr.values());
    const totalPages = Math.max(1, Math.ceil(membersArray.length / pageSize));
    const start = page * pageSize;
    const end = start + pageSize;
    const membersPage = membersArray.slice(start, end);

    const membersText = membersPage.length
        ? membersPage.map((member, i) => `> ${emojis.star || ''} **__${start + i + 1}.__ <@${member.user.id}>**`).join('\n')
        : `> ${emojis.star || ''} **__No members in this role.__**`;

    const buttons = [];
    if (page > 0) {
        buttons.push(new ButtonBuilder().setCustomId('prev_member_page').setLabel('Previous').setStyle(ButtonStyle.Secondary));
    }
    if (page < totalPages - 1) {
        buttons.push(new ButtonBuilder().setCustomId('next_member_page').setLabel('Next').setStyle(ButtonStyle.Secondary));
    }
    buttons.push(new ButtonBuilder().setCustomId('back_to_info').setLabel('Back to Info').setStyle(ButtonStyle.Primary));

    const buttonRow = new ActionRowBuilder().addComponents(buttons);
    const roleIcon = role.iconURL({ extension: 'png', size: 4096 });
    const botAvatar = message ? message.client.user.displayAvatarURL({ extension: 'png', size: 4096 }) : null;

    return new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${emojis.title || ''} __${role.name} Members__\n\n` +
                        `${membersText}\n\n` +
                        `> **__Page:__ \`${page + 1}/${totalPages}\`**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(roleIcon || botAvatar)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buttonRow);
}

export default {
    name: 'roleinfo',
    description: 'Get detailed information about a role',
    category: 'General',
    aliases: ['rinfo'],
    usage: '+roleinfo <role>',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        if (!args[0]) {
            const errContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Command Usage__\n\n` +
                                `> ${emojis.star || ''} **__Please provide a role__**\n` +
                                `> ${emojis.star || ''} **__mention or ID.__**\n` +
                                `> ${emojis.star || ''} **__Example: <@&RoleID>__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const roleSearch = args[0].replace(/[<@!&>]/g, '');
        const role = message.mentions.roles.first() ||
            message.guild.roles.cache.get(roleSearch) ||
            message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());

        if (!role) {
            const errContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Role Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that role.__**\n` +
                                `> ${emojis.star || ''} **__Check the name or ID.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const membersArr = message.guild.members.cache.filter(member => member.roles.cache.has(role.id));
        const permissionsCount = role.permissions.toArray().length;
        const membersCount = membersArr.size;

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [getRoleInfoContainer(role, theme, themeColor, permissionsCount, membersCount, message)],
            allowedMentions: { repliedUser: false }
        });

        const collector = sent.createMessageComponentCollector({
            time: 120000,
            filter: i => i.user.id === message.author.id
        });

        let permPage = 0;
        let memberPage = 0;

        collector.on('collect', async interaction => {
            if (interaction.customId === 'show_permissions') {
                permPage = 0;
                await interaction.update({ components: [getPermissionsContainer(role, theme, themeColor, permPage, message)] });
            } else if (interaction.customId === 'show_members') {
                memberPage = 0;
                await interaction.update({ components: [getMembersContainer(role, theme, themeColor, membersArr, memberPage, message)] });
            } else if (interaction.customId === 'next_perm_page') {
                permPage++;
                await interaction.update({ components: [getPermissionsContainer(role, theme, themeColor, permPage, message)] });
            } else if (interaction.customId === 'prev_perm_page') {
                permPage--;
                await interaction.update({ components: [getPermissionsContainer(role, theme, themeColor, permPage, message)] });
            } else if (interaction.customId === 'next_member_page') {
                memberPage++;
                await interaction.update({ components: [getMembersContainer(role, theme, themeColor, membersArr, memberPage, message)] });
            } else if (interaction.customId === 'prev_member_page') {
                memberPage--;
                await interaction.update({ components: [getMembersContainer(role, theme, themeColor, membersArr, memberPage, message)] });
            } else if (interaction.customId === 'back_to_info') {
                await interaction.update({ components: [getRoleInfoContainer(role, theme, themeColor, permissionsCount, membersCount, message)] });
            }
        });

        collector.on('end', () => {
            // complete
        });
    }
};

