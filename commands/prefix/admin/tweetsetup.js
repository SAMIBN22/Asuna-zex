/**
 * &tweetsetup — Tweets System configuration panel.
 * Requires Administrator or ManageGuild permission.
 */

import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionsBitField,
} from 'discord.js';
import config       from '../../../config/config.js';
import TweetConfig  from '../../../models/tweetConfig.js';
import themeManager from '../../../themes/themeManager.js';

const OWNER_IDS = (config.devIds || []).map(String);

function hasAccess(member) {
    if (OWNER_IDS.includes(String(member.user.id))) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

export default {
    name:        'tweetsetup',
    aliases:     ['tweetconfig', 'setuptweet'],
    description: 'Open the Tweets System setup panel.',
    category:    'Admin',
    usage:       '&tweetsetup',

    async execute(message, args, client) {
        if (!hasAccess(message.member)) return;

        const guild  = message.guild;
        const theme  = await themeManager.getTheme(guild.id);
        const accent = themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const cfg     = await TweetConfig.get(guild.id);
        const panelCh = cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : '`Not set`';
        const tweetCh = cfg.tweetChannelId ? `<#${cfg.tweetChannelId}>` : '`Not set`';
        const status  = cfg.enabled
            ? `${emojis.yes || ''} Enabled`
            : `${emojis.no  || ''} Disabled`;

        const container = new ContainerBuilder()
            .setAccentColor(accent)

            // ── Header ──────────────────────────────────────────────────
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(
                    `##  __Tweets System — Setup Panel__\n` +
                    `> Configure the tweet system for **${guild.name}**.`
                ))
                .setThumbnailAccessory(th => th.setURL(
                    guild.iconURL({ extension: 'png', size: 256 }) ||
                    client.user.displayAvatarURL({ extension: 'png' })
                ))
            )
            .addSeparatorComponents(new SeparatorBuilder())

            // ── Current status ───────────────────────────────────────────
            .addTextDisplayComponents(t => t.setContent(
                `**${emojis.star || ''} Status:** ${status}\n` +
                `**${emojis.star || ''} Panel Channel:** ${panelCh}\n` +
                `**${emojis.star || ''} Tweet Channel:** ${tweetCh}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())

            // ── Row 1: configure + send panel ────────────────────────────
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId('tweet_setup_configure')
                    .setLabel('  Configure Channels')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('tweet_setup_send_panel')
                    .setLabel('  Send Tweet Panel')
                    .setStyle(ButtonStyle.Success),
            ))

            // ── Row 2: manage + refresh ───────────────────────────────────
            .addActionRowComponents(r => r.addComponents(
                new ButtonBuilder()
                    .setCustomId('tweet_setup_manage')
                    .setLabel('  Manage Settings')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tweet_setup_status')
                    .setLabel('  Refresh Status')
                    .setStyle(ButtonStyle.Secondary),
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(t => t.setContent(
                `-# ${emojis.star || ''} Only members with **Administrator** or **Manage Server** can use this panel.`
            ));

        await message.reply({
            flags:           MessageFlags.IsComponentsV2,
            components:      [container],
            allowedMentions: { parse: [] },
        });
    },
};
