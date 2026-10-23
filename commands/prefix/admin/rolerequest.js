/**
 * &rolerequest — Role Request System admin setup panel.
 * Requires Administrator or ManageGuild (or server owner).
 */

import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    PermissionsBitField,
} from 'discord.js';
import RoleRequestConfig     from '../../../models/roleRequestConfig.js';
import { CATEGORIES, buildPublicPanel } from '../../../handlers/roleRequestHandler.js';
import config                from '../../../config/config.js';
import themeManager          from '../../../themes/themeManager.js';

// Re-export ordered category keys for use here
const CAT_ORDER = ['limited', 'powers', 'special', 'girls', 'custom'];

const OWNER_IDS = (config.devIds || []).map(String);

function hasAccess(member) {
    if (OWNER_IDS.includes(String(member.user.id))) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

// ── Build the admin setup panel ───────────────────────────────────────────────

function buildSetupPanel(guild, cfg, theme, accent, client, expired = false) {
    const emojis  = theme.emojis;
    const panelCh = cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : '`Not set`';
    const logsCh  = cfg.logsChannelId  ? `<#${cfg.logsChannelId}>`  : '`Not set`';
    const status  = cfg.enabled
        ? `${emojis.yes || ''} Enabled`
        : `${emojis.no  || ''} Disabled`;
    const botName = client?.user?.username || 'Bot';
    const glowingBotName = `🟦⚡ **${botName.toUpperCase()}** ⚡🟡🔴`;

    const container = new ContainerBuilder()
        .setAccentColor(accent)
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `##  ${glowingBotName}\n` +
                `> Configure role categories and deploy the request panel for **${guild.name}**.`
            ))
            .setThumbnailAccessory(th => th.setURL(
                guild.iconURL({ extension: 'png', size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())

        // Status
        .addTextDisplayComponents(t => t.setContent(
            `**${emojis.star || ''} Status:** ${status}\n` +
            `**${emojis.star || ''} Panel Channel:** ${panelCh}\n` +
            `**${emojis.star || ''} Logs Channel:** ${logsCh}\n` +
            `**${emojis.star || ''} Panel Image:** ${cfg.animatedImageUrl ? `[Set](${cfg.animatedImageUrl})` : '`Not set (will use guild banner/icon)`'}`
        ))
        .addSeparatorComponents(new SeparatorBuilder());

    // Category rows
    for (const k of CAT_ORDER) {
        const def   = CATEGORIES[k];
        const count = cfg.categories[k]?.roleIds?.length ?? 0;
        container.addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `${def.emoji} **${def.label}** — ${count > 0 ? `${count} role(s) configured` : '`No roles set`'}\n` +
                `-# ${def.description}`
            ))
            .setButtonAccessory(
                new ButtonBuilder()
                    .setCustomId(`rr_setup_cat_${k}`)
                    .setLabel('  Configure')
                    .setStyle(count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(expired)
            )
        );
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())

        // Row 1: channels + image
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rr_setup_channels')
                .setLabel('  Set Channels')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('rr_setup_image')
                .setLabel('  Set Panel Image')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired),
        ))

        // Row 2: deploy + toggle + refresh
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rr_setup_deploy')
                .setLabel('  Deploy Panel')
                .setStyle(ButtonStyle.Success)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('rr_setup_toggle')
                .setLabel(cfg.enabled ? '  Disable System' : '  Enable System')
                .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('rr_setup_refresh')
                .setLabel('  Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired),
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `-# ${emojis.star || ''} Only **Administrator** or **Manage Server** can interact with this panel.`
        ));

    return [container];
}

// ── Export ────────────────────────────────────────────────────────────────────

export default {
    name:        'rolerequest',
    aliases:     ['rrsetup', 'rolesetup', 'rrequest'],
    description: 'Open the Role Request System setup panel.',
    category:    'Admin',
    usage:       '&rolerequest',

    async execute(message, args, client) {
        if (!hasAccess(message.member)) return;

        const guild  = message.guild;
        const theme  = await themeManager.getTheme(guild.id);
        const accent = themeManager.getRGBColor(theme.color);
        let cfg      = await RoleRequestConfig.get(guild.id);

        const sent = await message.reply({
            flags:           MessageFlags.IsComponentsV2,
            components:      buildSetupPanel(guild, cfg, theme, accent, client),
            allowedMentions: { parse: [] },
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => hasAccess(i.member),
            time:   300_000,
        });

        collector.on('collect', async interaction => {
            const cid = interaction.customId;

            // ── Category configure buttons ──────────────────────────────────
            if (cid.startsWith('rr_setup_cat_')) {
                const catKey = cid.replace('rr_setup_cat_', '');
                const catDef = CATEGORIES[catKey];
                if (!catDef) return;
                cfg = await RoleRequestConfig.get(guild.id);
                const currentIds = cfg.categories[catKey]?.roleIds || [];

                const selectMenu = new RoleSelectMenuBuilder()
                    .setCustomId(`rr_rolesel_${catKey}`)
                    .setPlaceholder(`Select roles for ${catDef.label} (up to 25)`)
                    .setMinValues(0)
                    .setMaxValues(25);

                await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(accent)
                            .addTextDisplayComponents(t => t.setContent(
                                `## ${catDef.emoji} Configure — **${catDef.label}**\n` +
                                `> ${catDef.description}\n\n` +
                                (currentIds.length
                                    ? `**Currently configured:** ${currentIds.map(id => `<@&${id}>`).join(', ')}`
                                    : `**No roles configured yet.** Select roles below.`)
                            ))
                            .addSeparatorComponents(new SeparatorBuilder())
                            .addActionRowComponents(r => r.addComponents(selectMenu))
                            .addTextDisplayComponents(t => t.setContent(
                                `-# Selecting 0 roles will clear this category. After saving, click **Refresh** on the setup panel.`
                            ))
                    ],
                });
                return;
            }

            // ── Set channels ────────────────────────────────────────────────
            if (cid === 'rr_setup_channels') {
                cfg = await RoleRequestConfig.get(guild.id);
                const modal = new ModalBuilder()
                    .setCustomId('rr_modal_channels')
                    .setTitle('  Set Role Request Channels');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('rr_panel_ch')
                            .setLabel('Panel Channel (ID or #mention)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('e.g. #role-request or 123456789012345678')
                            .setValue(cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : '')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('rr_logs_ch')
                            .setLabel('Logs Channel (ID or #mention)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('e.g. #role-request-logs or 123456789012345678')
                            .setValue(cfg.logsChannelId ? `<#${cfg.logsChannelId}>` : '')
                            .setRequired(true)
                    ),
                );
                return interaction.showModal(modal);
            }

            // ── Set image URL ───────────────────────────────────────────────
            if (cid === 'rr_setup_image') {
                cfg = await RoleRequestConfig.get(guild.id);
                const modal = new ModalBuilder()
                    .setCustomId('rr_modal_image')
                    .setTitle('  Set Panel Animated Image');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('rr_image_url')
                            .setLabel('GIF / Image URL (leave blank to clear)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://example.com/anime.gif')
                            .setValue(cfg.animatedImageUrl || '')
                            .setRequired(false)
                            .setMaxLength(512)
                    ),
                );
                return interaction.showModal(modal);
            }

            // ── Toggle enabled ──────────────────────────────────────────────
            if (cid === 'rr_setup_toggle') {
                cfg = await RoleRequestConfig.get(guild.id);
                cfg.enabled   = !cfg.enabled;
                cfg.updatedAt = new Date();
                await cfg.save();
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: buildSetupPanel(guild, cfg, theme, accent),
                });
            }

            // ── Refresh ─────────────────────────────────────────────────────
            if (cid === 'rr_setup_refresh') {
                cfg = await RoleRequestConfig.get(guild.id);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: buildSetupPanel(guild, cfg, theme, accent),
                });
            }

            // ── Deploy panel ────────────────────────────────────────────────
            if (cid === 'rr_setup_deploy') {
                await interaction.deferUpdate();
                cfg = await RoleRequestConfig.get(guild.id);

                if (!cfg.panelChannelId) {
                    return interaction.followUp({
                        content: '>  Panel channel not configured. Click ** Set Channels** first.',
                        ephemeral: true,
                    });
                }

                const ch = guild.channels.cache.get(cfg.panelChannelId) ||
                           await guild.channels.fetch(cfg.panelChannelId).catch(() => null);
                if (!ch?.isTextBased()) {
                    return interaction.followUp({
                        content: '>  Panel channel not found or is not a text channel.',
                        ephemeral: true,
                    });
                }

                const panelComponents = [buildPublicPanel(guild, cfg)];

                // Try to edit existing panel message
                let panelMsg = null;
                if (cfg.panelMessageId) {
                    panelMsg = await ch.messages.fetch(cfg.panelMessageId).catch(() => null);
                    if (panelMsg) {
                        await panelMsg.edit({
                            flags:           MessageFlags.IsComponentsV2,
                            components:      panelComponents,
                            allowedMentions: { parse: [] },
                        }).catch(() => { panelMsg = null; });
                    }
                }

                // Send new if needed
                if (!panelMsg) {
                    panelMsg = await ch.send({
                        flags:           MessageFlags.IsComponentsV2,
                        components:      panelComponents,
                        allowedMentions: { parse: [] },
                    }).catch(() => null);
                }

                if (panelMsg) {
                    cfg.panelMessageId = panelMsg.id;
                    cfg.updatedAt      = new Date();
                    await cfg.save();
                    return interaction.followUp({
                        content: `>  Panel deployed to <#${cfg.panelChannelId}> successfully!`,
                        ephemeral: true,
                    });
                } else {
                    return interaction.followUp({
                        content: '>  Failed to send panel. Make sure I have permission to send messages in that channel.',
                        ephemeral: true,
                    });
                }
            }
        });

        collector.on('end', () => {
            RoleRequestConfig.get(guild.id).then(finalCfg => {
                sent.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: buildSetupPanel(guild, finalCfg, theme, accent, true),
                }).catch(() => {});
            });
        });
    },
};
