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
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

import jailCommand from './jail.js';
import unjailCommand from './unjail.js';
import jailInfoCommand from './jailinfo.js';
import helpCommand from '../general/help.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'jailpanel',
    description: 'Displays the jail control panel',
    category: 'Jail',
    usage: '+jailpanel',
    permissions: ['ManageRoles'],
    requiredRoles: 'jailerRoleId',
    guildOnly: true,
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const config = await GuildConfig.findOne({ guildId: message.guild.id });

        if (!config || !config.jailerRoleId || config.jailerRoleId.length === 0) {
            return message.channel.send({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                        `> ${emojis.star || ''} **__Jail system is not configured.__**\n` +
                                        `> ${emojis.star || ''} __Use \`/setupjail\` first.__`
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

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
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

            return message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_jail_user')
                .setLabel('Jail User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_unjail_user')
                .setLabel('Unjail User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_jail_info')
                .setLabel('Jail Info')
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${emojis.title || ''} __Jail Control Panel__\n\n` +
                            `> ${emojis.star || ''} **__Use the controls below to manage user restrictions.__**\n` +
                            `> ${emojis.star || ''} **__Punishment:__** \`Jail / Unjail users\`\n` +
                            `> ${emojis.star || ''} **__Info:__** \`View Jail Statistics\``
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row1)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${emojis.title || ''} **__See commands:__** \`${client.config.prefix}help jail\` __or click below.__`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setLabel("Help")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("panel_help_jail")
                    )
            );

        const msg = await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    }
};
