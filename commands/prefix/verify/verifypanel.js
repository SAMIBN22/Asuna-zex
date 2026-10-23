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

import verifyBoyCommand from './verifyboy.js';
import verifyGirlCommand from './verifygirls.js';
import verifyInfoCommand from './verifyinfo.js';
import susCommand from './sus.js';
import unsusCommand from './unsus.js';
import susInfoCommand from './susinfo.js';
import helpCommand from '../general/help.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'verifypanel',
    description: 'Displays the verification control panel',
    category: 'Verification',
    usage: '+verifypanel',
    permissions: ['ManageRoles'],
    requiredRoles: 'verificatorsRoleIds',
    guildOnly: true,
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const config = await GuildConfig.findOne({ guildId: message.guild.id });

        if (!config || !config.verificatorsRoleIds || config.verificatorsRoleIds.length === 0) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                        `> ${emojis.star || ''} **__Verification system is not configured.__**\n` +
                                        `> ${emojis.star || ''} __Use \`/setupverify\` first.__`
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

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_verify_boy')
                .setLabel('Verify Boy')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_verify_girl')
                .setLabel('Verify Girl')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_verify_check')
                .setLabel('Verify Check')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_sus')
                .setLabel('Sus User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_unsus')
                .setLabel('Unsus User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_sus_info')
                .setLabel('Sus Info')
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${emojis.title || ''} __Verification Panel__\n\n` +
                            `> ${emojis.star || ''} **__Use the controls below to manage user status.__**\n` +
                            `> ${emojis.star || ''} **__Gender Access:__** \`Assign Boy / Girl roles\`\n` +
                            `> ${emojis.star || ''} **__Trust Monitor:__** \`Mark users as Sus / Unsus\``
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
                            `${emojis.title || ''} **__See commands:__** \`${client.config.prefix}help verification\` __or click below.__`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setLabel("Help")
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("panel_help_verification")
                    )
            );
        const msg = await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    }
};
