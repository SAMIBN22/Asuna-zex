// ─── &setstaff — Staff Application Panel Setup ──────────────────────────────
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

// ─── Default positions ─────────────────────────────────────────────────────────
const DEFAULT_BUTTONS = [
    { label: 'Moderator',  emoji: '', description: 'Keep the community safe and orderly' },
    { label: 'Support',    emoji: '', description: 'Assist members with their questions'  },
    { label: 'Events',     emoji: '', description: 'Plan and host server events'          },
    { label: 'Media',      emoji: '', description: 'Create and manage server media'       },
    { label: 'Management', emoji: '', description: 'Oversee server operations'            },
    { label: 'General',    emoji: '', description: 'General staff role'                   },
];

// ─── Per-guild temp session ────────────────────────────────────────────────────
// guildId → { channelId, logsChannelId, bannerUrl, style, count, buttons[] }
const _temp = new Map();

function _initTemp(guildId, config) {
    if (_temp.has(guildId)) return;
    const saved = config?.staffConfig || {};
    _temp.set(guildId, {
        channelId:    saved.channelId    || null,
        logsChannelId: saved.logsChannelId || null,
        bannerUrl:    saved.bannerUrl    || null,
        style:        saved.style        || 'buttons',
        count:        saved.buttons?.length || 6,
        buttons:      saved.buttons?.length
            ? saved.buttons
            : DEFAULT_BUTTONS.slice(0, 6),
    });
}

function _getTemp(guildId) { return _temp.get(guildId); }

// ─── Separator helpers ─────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setstaff',
    description: 'Staff Application Panel Setup',
    usage: '&setstaff',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const guildId    = message.guild.id;
        const theme      = await themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x2b2d31;
        const config     = await GuildConfig.findOne({ guildId });

        _initTemp(guildId, config);

        const sent = await message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
        });

        _setupCollector(sent, message, theme, themeColor, client);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// COLLECTOR
// ═════════════════════════════════════════════════════════════════════════════
function _setupCollector(sent, message, theme, themeColor, client) {
    const guildId = message.guild.id;

    const collector = sent.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id && i.customId.startsWith('setstaff_'),
        time:   600_000,
    });

    collector.on('collect', async interaction => {
        try {
            const id   = interaction.customId;
            const data = _getTemp(guildId);

            // ── Done ──────────────────────────────────────────────────────────
            if (id === 'setstaff_done') {
                await _saveConfig(guildId, data);
                collector.stop('done');
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##  Configuration Saved\n> Staff application system has been configured successfully.`
                                        )
                                    )
                                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(
                                        theme.images?.thumbnail || client.user.displayAvatarURL()
                                    ))
                            )
                    ],
                });
            }

            // ── Panel channel ─────────────────────────────────────────────────
            if (id === 'setstaff_channel') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildChannelPicker(guildId, message.guild, theme, themeColor, client, 'channel')],
                });
            }
            if (id === 'setstaff_channel_select') {
                data.channelId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Logs channel ──────────────────────────────────────────────────
            if (id === 'setstaff_logs') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildChannelPicker(guildId, message.guild, theme, themeColor, client, 'logs')],
                });
            }
            if (id === 'setstaff_logs_select') {
                data.logsChannelId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Back to main ──────────────────────────────────────────────────
            if (id === 'setstaff_back') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Banner ────────────────────────────────────────────────────────
            if (id === 'setstaff_banner') {
                const modal = new ModalBuilder()
                    .setCustomId('setstaff_banner_modal')
                    .setTitle('Set Animated Banner / GIF')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('banner_url')
                                .setLabel('GIF / Image URL')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://example.com/banner.gif')
                                .setRequired(true)
                                .setMaxLength(512)
                                .setValue(data.bannerUrl || '')
                        )
                    );

                await interaction.showModal(modal);
                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'setstaff_banner_modal',
                    time:   120_000,
                }).catch(() => null);
                if (!res) return;

                data.bannerUrl = res.fields.getTextInputValue('banner_url').trim();
                await _saveConfig(guildId, data);
                await res.deferUpdate().catch(() => {});
                return res.message.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                }).catch(() => {});
            }

            // ── Style picker ──────────────────────────────────────────────────
            if (id === 'setstaff_style') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildStylePicker(guildId, message.guild, theme, themeColor, client)],
                });
            }
            if (id === 'setstaff_style_buttons') {
                data.style = 'buttons';
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }
            if (id === 'setstaff_style_select') {
                data.style = 'select';
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Count picker ──────────────────────────────────────────────────
            if (id === 'setstaff_count') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildCountPicker(guildId, message.guild, theme, themeColor, client)],
                });
            }
            if (id.startsWith('setstaff_count_')) {
                const n = parseInt(id.replace('setstaff_count_', ''), 10);
                if (n >= 1 && n <= 6) {
                    data.count = n;
                    // Pad/trim buttons array to match count
                    while (data.buttons.length < n) {
                        const def = DEFAULT_BUTTONS[data.buttons.length] || DEFAULT_BUTTONS[0];
                        data.buttons.push({ ...def });
                    }
                    data.buttons = data.buttons.slice(0, n);
                    await _saveConfig(guildId, data);
                }
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Edit buttons list ─────────────────────────────────────────────
            if (id === 'setstaff_edit_buttons') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildEditList(guildId, message.guild, theme, themeColor, client)],
                });
            }

            // ── Edit individual button ─────────────────────────────────────────
            if (id.startsWith('setstaff_edit_btn_')) {
                const idx = parseInt(id.replace('setstaff_edit_btn_', ''), 10);
                const btn = data.buttons[idx];
                if (!btn) return interaction.deferUpdate().catch(() => {});

                const modal = new ModalBuilder()
                    .setCustomId(`setstaff_btn_modal_${idx}`)
                    .setTitle(`Edit Position ${idx + 1}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('btn_label')
                                .setLabel('Position Name')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('e.g. Moderator')
                                .setRequired(true)
                                .setMaxLength(80)
                                .setValue(btn.label)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('btn_emoji')
                                .setLabel('Emoji (paste emoji or leave blank)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('  or  leave empty')
                                .setRequired(false)
                                .setMaxLength(100)
                                .setValue(btn.emoji || '')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('btn_description')
                                .setLabel('Short Description')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('What does this role do?')
                                .setRequired(false)
                                .setMaxLength(100)
                                .setValue(btn.description || '')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('btn_role_id')
                                .setLabel('Role ID to give on Accept')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Right-click role → Copy ID (Developer Mode)')
                                .setRequired(false)
                                .setMaxLength(30)
                                .setValue(btn.roleId || '')
                        )
                    );

                await interaction.showModal(modal);
                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === `setstaff_btn_modal_${idx}`,
                    time:   120_000,
                }).catch(() => null);
                if (!res) return;

                data.buttons[idx] = {
                    label:       res.fields.getTextInputValue('btn_label').trim(),
                    emoji:       res.fields.getTextInputValue('btn_emoji').trim() || null,
                    description: res.fields.getTextInputValue('btn_description').trim() || '',
                    roleId:      res.fields.getTextInputValue('btn_role_id').trim() || null,
                };
                await _saveConfig(guildId, data);
                await res.deferUpdate().catch(() => {});
                return res.message.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildEditList(guildId, message.guild, theme, themeColor, client)],
                }).catch(() => {});
            }

            // ── Send panel ────────────────────────────────────────────────────
            if (id === 'setstaff_send') {
                if (!data.channelId) {
                    return interaction.reply({
                        content:   ' Please set the **Panel Channel** first.',
                        flags:     MessageFlags.Ephemeral,
                    }).catch(() => {});
                }
                const ch = message.guild.channels.cache.get(data.channelId);
                if (!ch?.isTextBased()) {
                    return interaction.reply({
                        content:   ' The configured panel channel is invalid or was deleted.',
                        flags:     MessageFlags.Ephemeral,
                    }).catch(() => {});
                }

                await interaction.deferUpdate().catch(() => {});

                // Build and send the public staff panel
                const publicPanel = await _buildPublicPanel(message.guild, data, client);
                await ch.send(publicPanel).catch(err => {
                    console.error('[SetStaff] Failed to send panel:', err);
                });

                return interaction.editReply({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##  Staff Panel Sent\n> The application panel has been posted in <#${data.channelId}>.`
                                )
                            )
                            .addSeparatorComponents(divS())
                            .addActionRowComponents(
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('setstaff_back')
                                        .setLabel('← Back to Setup')
                                        .setStyle(ButtonStyle.Secondary)
                                )
                            )
                    ],
                }).catch(() => {});
            }

        } catch (err) {
            console.error('[SetStaff] Collector error:', err);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'done') return;
        sent.edit({
            flags:      MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(0x2b2d31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  Session Expired\n> Run \`&setstaff\` again to continue.`
                        )
                    )
            ],
        }).catch(() => {});
        _temp.delete(message.guild.id);
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// PANEL BUILDERS
// ═════════════════════════════════════════════════════════════════════════════

function _buildMain(guildId, guild, theme, themeColor, client) {
    const data      = _getTemp(guildId);
    const thumb     = guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();
    const bannerUrl = data.bannerUrl || getPanelBanner(guild, client);

    const c = new ContainerBuilder().setAccentColor(themeColor);

    // Banner
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Staff Panel Banner')
        )
    ).addSeparatorComponents(div());

    // Header with server icon
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   ${guild.name}  •  Play Staff\n` +
                    `> Configure your server's staff application panel below.\n` +
                    `> Set channels, design the panel, choose positions, then send it live.`
                )
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
    );

    c.addSeparatorComponents(div());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`###   Configuration Status`));
    c.addSeparatorComponents(divS());

    // Status rows
    const cfg = [
        { label: '  Panel Channel', value: data.channelId    ? `<#${data.channelId}>`     : '`Not set`' },
        { label: '  Logs Channel',  value: data.logsChannelId ? `<#${data.logsChannelId}>` : '`Not set`' },
        { label: '  Banner',         value: data.bannerUrl    ? '`Custom GIF set `'       : '`Default`' },
        { label: '  Display Style',  value: data.style === 'buttons' ? '`Buttons`'          : '`Select Menu`' },
        { label: '  Positions',      value: `\`${data.count} button${data.count !== 1 ? 's' : ''}\`` },
    ];

    for (const row of cfg) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${row.label}** — ${row.value}`)
        );
        c.addSeparatorComponents(divS());
    }

    c.addSeparatorComponents(div());

    // Action buttons — row 1
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setstaff_channel').setLabel('  Panel Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('setstaff_logs').setLabel('  Logs Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('setstaff_banner').setLabel('  Set Banner').setStyle(ButtonStyle.Secondary),
        )
    );

    // Action buttons — row 2
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setstaff_style').setLabel('  Display Style').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('setstaff_count').setLabel('  Button Count').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('setstaff_edit_buttons').setLabel('  Edit Positions').setStyle(ButtonStyle.Secondary),
        )
    );

    c.addSeparatorComponents(divS());

    // Send + Done — row 3
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setstaff_send').setLabel('  Send Panel').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('setstaff_done').setLabel('  Done').setStyle(ButtonStyle.Success),
        )
    );

    c.addSeparatorComponents(div());
    return c;
}

// ── Channel / Logs picker ──────────────────────────────────────────────────────
function _buildChannelPicker(guildId, guild, theme, themeColor, client, mode) {
    const isLogs = mode === 'logs';
    const c = new ContainerBuilder().setAccentColor(themeColor);

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${isLogs ? '  Select Logs Channel' : '  Select Panel Channel'}\n` +
                    `> ${isLogs
                        ? 'Choose where staff applications will be sent.'
                        : 'Choose where the public application panel will appear.'}`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('setstaff_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );

    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(isLogs ? 'setstaff_logs_select' : 'setstaff_channel_select')
                .setPlaceholder(isLogs ? 'Select logs channel…' : 'Select panel channel…')
                .setChannelTypes(ChannelType.GuildText)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Style picker ───────────────────────────────────────────────────────────────
function _buildStylePicker(guildId, guild, theme, themeColor, client) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Display Style\n> Choose how the application positions are shown on the panel.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('setstaff_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setstaff_style_buttons')
                .setLabel('  Buttons')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setstaff_style_select')
                .setLabel('  Select Menu')
                .setStyle(ButtonStyle.Secondary),
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Count picker ───────────────────────────────────────────────────────────────
function _buildCountPicker(guildId, guild, theme, themeColor, client) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Number of Positions\n> How many application buttons should the panel show? (1–6)`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('setstaff_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    // Max 5 buttons per row — split 1-5 on row1, 6 on row2
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            ...[1,2,3,4,5].map(n =>
                new ButtonBuilder()
                    .setCustomId(`setstaff_count_${n}`)
                    .setLabel(`${n}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        )
    );
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setstaff_count_6')
                .setLabel('6')
                .setStyle(ButtonStyle.Secondary)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Edit buttons list ──────────────────────────────────────────────────────────
function _buildEditList(guildId, guild, theme, themeColor, client) {
    const data = _getTemp(guildId);
    const c    = new ContainerBuilder().setAccentColor(themeColor);

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Edit Positions\n> Click a position to edit its name, emoji, and description.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('setstaff_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());

    // List each button
    for (let i = 0; i < data.buttons.length; i++) {
        const btn = data.buttons[i];
        const emojiDisplay = btn.emoji ? `${btn.emoji} ` : '';
        c.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${emojiDisplay}${btn.label}**\n-# ${btn.description || 'No description'}`
                    )
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId(`setstaff_edit_btn_${i}`)
                        .setLabel(' Edit')
                        .setStyle(ButtonStyle.Secondary)
                )
        );
        c.addSeparatorComponents(divS());
    }

    c.addSeparatorComponents(div());
    return c;
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC PANEL (sent to the selected channel)
// ═════════════════════════════════════════════════════════════════════════════
async function _buildPublicPanel(guild, data, client) {
    const thumb     = guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();
    const bannerUrl = data.bannerUrl || getPanelBanner(guild, client);
    const buttons   = data.buttons.slice(0, data.count);

    const c = new ContainerBuilder().setAccentColor(0x5865F2);

    // Banner
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Staff Application')
        )
    );
    c.addSeparatorComponents(div());

    // Header
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##  ${guild.name}  •  Play Staff\n\n` +
                    `> We are looking for **dedicated, passionate**, and **professional** individuals\n` +
                    `> to join our staff team and help us build a better community.\n` +
                    `> Here's a quick look at the open positions you can apply for:  `
                )
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
    );

    c.addSeparatorComponents(div());

    // Positions grid (2 per row using sections)
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`###   Open Positions`));
    c.addSeparatorComponents(divS());

    for (let i = 0; i < buttons.length; i += 2) {
        const a = buttons[i];
        const b = buttons[i + 1];
        const lineA = `• ${a.emoji || ''}  **${a.label}:**  ${a.description || 'Open for applications'}`;
        const lineB = b ? `• ${b.emoji || ''}  **${b.label}:**  ${b.description || 'Open for applications'}` : null;
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lineB ? `${lineA}\n\n${lineB}` : lineA)
        );
        c.addSeparatorComponents(divS());
    }

    c.addSeparatorComponents(div());

    // Footer text
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `>   **Ready to make a difference?** Choose a position below and fill out the application.\n` +
            `> -# Our staff team reviews every application — we'll get back to you as soon as possible.`
        )
    );

    c.addSeparatorComponents(divS());

    // Buttons or select menu
    if (data.style === 'select') {
        const options = buttons.map((btn, i) => {
            const opt = new StringSelectMenuOptionBuilder()
                .setValue(`staff_pos_${i}`)
                .setLabel(btn.label.slice(0, 100))
                .setDescription((btn.description || 'Apply for this position').slice(0, 100));
            if (btn.emoji) {
                try { opt.setEmoji(btn.emoji); } catch { /* Ignore invalid custom emojis. */ }
            }
            return opt;
        });
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('staff_select_apply')
                    .setPlaceholder('  Select a position to apply for…')
                    .addOptions(options)
            )
        );
    } else {
        // Up to 5 buttons per row, max 6 buttons → row1 up to 3, row2 up to 3
        const row1 = buttons.slice(0, Math.min(3, buttons.length));
        const row2 = buttons.slice(3, 6);

        const makeBtn = (btn, i) => {
            const b = new ButtonBuilder()
                .setCustomId(`staff_apply_${i}`)
                .setLabel(btn.label.slice(0, 80))
                .setStyle(ButtonStyle.Primary);
            if (btn.emoji && !btn.emoji.includes(':')) {
                try { b.setEmoji(btn.emoji); } catch {}
            }
            return b;
        };

        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(...row1.map((btn, i) => makeBtn(btn, i)))
        );
        if (row2.length > 0) {
            c.addActionRowComponents(
                new ActionRowBuilder().addComponents(...row2.map((btn, i) => makeBtn(btn, i + 3)))
            );
        }
    }

    c.addSeparatorComponents(div());

    return { flags: MessageFlags.IsComponentsV2, components: [c] };
}

// ─── Save config to DB ─────────────────────────────────────────────────────────
async function _saveConfig(guildId, data) {
    await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { staffConfig: { ...data } } },
        { upsert: true }
    ).catch(err => console.error('[SetStaff] DB save error:', err));
}
