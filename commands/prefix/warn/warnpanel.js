import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField,
    SectionBuilder,
    ThumbnailBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    ActionRowBuilder
} from 'discord.js';

import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'warnpanel',
    description: 'Displays the warn system control panel',
    category: 'Warn',
    usage: '+warnpanel',
    permissions: ['ManageMessages'],
    requiredRoles: 'warnerRoleIds',
    guildOnly: true,
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const config = await GuildConfig.findOne({ guildId: message.guild.id });

        if (!config || !config.warnerRoleIds || config.warnerRoleIds.length === 0) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Setup Required__\n\n` +
                                        `> ${emojis.star || ''} **__Warn system needs to be configured.__**\n` +
                                        `> ${emojis.star || ''} __Run \`${client.config.prefix}setwarn\` to get started.__`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL())
                                )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const hasRole = message.member.roles.cache.some(r => config.warnerRoleIds.includes(r.id));
            if (!hasRole) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Access Denied__\n\n` +
                                    `> ${emojis.star || ''} **__You need permission__**\n` +
                                    `> ${emojis.star || ''} __to use this command.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL())
                            )
                    );

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_warn_first')
                .setLabel('First Warn')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_warn_second')
                .setLabel('Second Warn')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_warn_last')
                .setLabel('Last Warn')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_unwarn')
                .setLabel('Unwarn')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_warn_info')
                .setLabel('Warn Info')
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${emojis.title || ''} __Warning Panel__\n\n` +
                            `> ${emojis.star || ''} **__Use the controls below to manage warnings.__**\n` +
                            `> ${emojis.star || ''} **__Warning Levels:__** \`First / Second / Last\`\n` +
                            `> ${emojis.star || ''} **__Management:__** \`Unwarn / Check Info\``
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row1)
            .addActionRowComponents(row2)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${emojis.title || ''} **__See commands:__** \`${client.config.prefix}help warn\` __or click below.__`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setLabel("Help")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("panel_help_warn")
                    )
            );

        const msg = await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
