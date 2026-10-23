/**
 * dating.js  —  &dating
 * Posts the bot-branded profile system panel to the configured panel channel.
 * Accessible from &setup → Dating.
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
    SeparatorSpacingSize,
} from 'discord.js';

import DatingConfig from '../../../models/datingConfig.js';
import mainConfig from '../../../config/config.js';

const PANEL_ACCENT = 0xf1c6d0;
const EMOJI_TITLE = '<:15249382247981424841:1537524927308107816>';
const EMOJI_SPARKLE = '<:15249398878437418961:1537525019536654387>';
const EMOJI_PROFILE = '<:15249405134704517821:1537525084372344892>';
const EMOJI_PICTURE = '<:15249418210655641801:1537525212751470680>';
const EMOJI_INVITE = '<:15249384250340804201:1537525313502707764>';
const EMOJI_INTENTIONS = '<:15249382291392430881:1537527370888781974>';

const panelDivider = (spacing = SeparatorSpacingSize.Small) =>
    new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(spacing);

export default {
    name:        'dating',
    aliases:     ['vynelcord', 'datingpanel'],
    description: 'Post the bot profile system panel to the configured channel',
    category:    'Dating',
    usage:       '&dating',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const guildId  = message.guild.id;
        const theme    = await client.themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x2b2d31;
        const botName = client.user?.globalName || client.user?.username || 'Discord Bot';

        const config = await DatingConfig.findOne({ guildId });

        if (!config?.panelChannelId) {
            return message.reply({
                flags:      MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##  __Not Configured__\n` +
                        `> The ${botName} panel channel has not been set.\n` +
                        `> Use \`&setdating\` (or \`&setup\` → **Dating**) to configure it first.`
                        ))
                ]
            });
        }

        const channel = message.guild.channels.cache.get(config.panelChannelId);
        if (!channel?.isTextBased()) {
            return message.reply({
                flags:      MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##  __Channel Error__\n` +
                            `> The configured panel channel is no longer accessible.\n` +
                            `> Please reconfigure it with \`&setdating\`.`
                        ))
                ]
            });
        }

        const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 256 });
        const panelImage = mainConfig.panelBanners?.[0] || botAvatar;

        // ── Public panel ──────────────────────────────────────────────────────
        const panel = new ContainerBuilder()
            .setAccentColor(PANEL_ACCENT)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${EMOJI_TITLE} __${botName} Profile System__`
                    ))
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(panelImage))
            )
            .addSeparatorComponents(panelDivider(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `• __Welcome to the ${botName} Dating System__ ${EMOJI_SPARKLE}`
            ))
            .addSeparatorComponents(panelDivider())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `• __Create your profile and connect with others in our community__ ${EMOJI_SPARKLE}`
            ))
            .addSeparatorComponents(panelDivider())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `• ${EMOJI_PROFILE} __Create a personal profile__ ${EMOJI_SPARKLE}\n` +
                `• ${EMOJI_PICTURE} __Upload a custom profile picture__ ${EMOJI_SPARKLE}\n` +
                `• ${EMOJI_INVITE} __Send connection invites__ ${EMOJI_SPARKLE}\n` +
                `• ${EMOJI_INTENTIONS} __Set your intentions (Friendship / Dating / Relationship)__ ${EMOJI_SPARKLE}`
            ))
            .addSeparatorComponents(panelDivider(SeparatorSpacingSize.Large))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('dating_my_profile')
                        .setLabel('My Profile')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EMOJI_TITLE),
                    new ButtonBuilder()
                        .setCustomId('dating_post_profile')
                        .setLabel('Post Profile')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EMOJI_PROFILE),
                    new ButtonBuilder()
                        .setCustomId('dating_thread')
                        .setLabel('Thread')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EMOJI_INTENTIONS),
                )
            );

        await channel.send({
            flags:      MessageFlags.IsComponentsV2,
            components: [panel],
        });

        return message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(themeColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `##  __Panel Posted!__\n> The ${botName} Profile System panel has been posted in <#${channel.id}>.`
                    ))
            ]
        });
    }
};
