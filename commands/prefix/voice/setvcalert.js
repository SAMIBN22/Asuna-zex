// ─── &setvcalert — Voice Channel Alert System ────────────────────────────────
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
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Per-guild temp session ────────────────────────────────────────────────────
const _temp = new Map();

function _initTemp(guildId, config) {
    if (_temp.has(guildId)) return;
    const saved = config?.vcAlertConfig || {};
    _temp.set(guildId, {
        enabled:        saved.enabled        ?? true,
        channels:       saved.channels       || [],   // [{ id, name }] — specific VCs
        categories:     saved.categories     || [],   // [{ id, name }] — whole categories
        roles:          saved.roles          || [],   // [{ id, name }] — roles to ping
        logsChannelId:  saved.logsChannelId  || null,
        welcomeMessage: saved.welcomeMessage || 'Welcome, **{username}**! Staff have been notified and will be with you shortly.',
    });
}

function _getTemp(guildId) { return _temp.get(guildId); }

// ─── Permission check ──────────────────────────────────────────────────────────
function _hasPermission(message, client) {
    const guild  = message.guild;
    const member = message.member;
    if (guild.ownerId === member.id) return true;
    const devIds = (client.config?.devIds || []).map(String);
    if (devIds.includes(String(member.id))) return true;
    const botMember = guild.members.me;
    if (botMember && member.roles.highest.position > botMember.roles.highest.position) return true;
    return false;
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setvcalert',
    aliases: ['vcalert', 'setvca', 'vca'],
    description: 'Configure the Voice Channel Alert system',
    usage: '&setvcalert',
    category: 'Voice',

    async execute(message, args, client) {
        if (!_hasPermission(message, client)) {
            return message.reply({
                flags:      MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Access Denied\n` +
                                `> Only the **server owner**, **bot owners**, or members with a **role higher than the bot** can use this command.`
                            )
                        )
                ],
            });
        }

        const guildId    = message.guild.id;
        const theme      = await themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x5865F2;
        const config     = await GuildConfig.findOne({ guildId });

        _temp.delete(guildId); // always reset for fresh config load
        _initTemp(guildId, config);

        const sent = await message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [_buildMain(guildId, message.guild, themeColor, client)],
        });

        _setupCollector(sent, message, themeColor, client);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// COLLECTOR
// ═════════════════════════════════════════════════════════════════════════════
function _setupCollector(sent, message, themeColor, client) {
    const guildId = message.guild.id;

    const collector = sent.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id && i.customId.startsWith('vca_'),
        time:   600_000,
    });

    collector.on('collect', async interaction => {
        try {
            const id   = interaction.customId;
            const data = _getTemp(guildId);

            // ── Done / Save ───────────────────────────────────────────────────
            if (id === 'vca_done') {
                await _saveConfig(guildId, data);
                collector.stop('done');
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0x57F287)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   Configuration Saved\n` +
                                            `> **Voice Channel Alert** system has been configured.\n` +
                                            `> The bot will now send alerts in your logs channel when members join monitored channels.`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL())
                                    )
                            )
                    ],
                });
            }

            // ── Back ──────────────────────────────────────────────────────────
            if (id === 'vca_back') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Toggle enable/disable ─────────────────────────────────────────
            if (id === 'vca_toggle') {
                data.enabled = !data.enabled;
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Add specific voice channels ───────────────────────────────────
            if (id === 'vca_add_channels') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildAddChannelsPicker(themeColor)],
                });
            }
            if (id === 'vca_add_channels_select') {
                for (const channelId of interaction.values) {
                    if (!data.channels.find(c => c.id === channelId)) {
                        const ch = message.guild.channels.cache.get(channelId);
                        data.channels.push({ id: channelId, name: ch?.name || channelId });
                    }
                }
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Remove specific voice channels ────────────────────────────────
            if (id === 'vca_remove_channel') {
                if (data.channels.length === 0) {
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildMain(guildId, message.guild, themeColor, client)],
                    });
                }
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildRemoveChannelPicker(data, themeColor)],
                });
            }
            if (id === 'vca_remove_channel_select') {
                data.channels = data.channels.filter(c => !interaction.values.includes(c.id));
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Add categories ────────────────────────────────────────────────
            if (id === 'vca_add_categories') {
                const options = _getCategoryOptions(message.guild, data.categories);
                if (options.length === 0) {
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildMain(guildId, message.guild, themeColor, client)],
                    });
                }
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildAddCategoryPicker(options, themeColor)],
                });
            }
            if (id === 'vca_add_category_select') {
                for (const catId of interaction.values) {
                    if (!data.categories.find(c => c.id === catId)) {
                        const cat = message.guild.channels.cache.get(catId);
                        data.categories.push({ id: catId, name: cat?.name || catId });
                    }
                }
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Remove categories ─────────────────────────────────────────────
            if (id === 'vca_remove_category') {
                if (data.categories.length === 0) {
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildMain(guildId, message.guild, themeColor, client)],
                    });
                }
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildRemoveCategoryPicker(data, themeColor)],
                });
            }
            if (id === 'vca_remove_category_select') {
                data.categories = data.categories.filter(c => !interaction.values.includes(c.id));
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Add alert roles ───────────────────────────────────────────────
            if (id === 'vca_add_roles') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildAddRolesPicker(themeColor)],
                });
            }
            if (id === 'vca_add_roles_select') {
                for (const roleId of interaction.values) {
                    if (!data.roles.find(r => r.id === roleId)) {
                        const role = message.guild.roles.cache.get(roleId);
                        data.roles.push({ id: roleId, name: role?.name || roleId });
                    }
                }
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Remove alert roles ────────────────────────────────────────────
            if (id === 'vca_remove_role') {
                if (data.roles.length === 0) {
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildMain(guildId, message.guild, themeColor, client)],
                    });
                }
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildRemoveRolePicker(data, themeColor)],
                });
            }
            if (id === 'vca_remove_role_select') {
                data.roles = data.roles.filter(r => !interaction.values.includes(r.id));
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Welcome message ───────────────────────────────────────────────
            if (id === 'vca_welcome') {
                const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
                const modal = new ModalBuilder()
                    .setCustomId('vca_welcome_modal')
                    .setTitle('VC Welcome Message')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('welcome_msg')
                                .setLabel('Message — use {mention} and {username}')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Welcome, **{username}**! Staff have been notified and will be with you shortly.')
                                .setRequired(true)
                                .setMaxLength(1000)
                                .setValue(data.welcomeMessage)
                        )
                    );
                await interaction.showModal(modal);
                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'vca_welcome_modal',
                    time:   120_000,
                }).catch(() => null);
                if (!res) return;
                data.welcomeMessage = res.fields.getTextInputValue('welcome_msg').trim();
                await _saveConfig(guildId, data);
                await res.deferUpdate().catch(() => {});
                return res.message.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                }).catch(() => {});
            }

            // ── Logs channel ──────────────────────────────────────────────────
            if (id === 'vca_logs') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildLogsChannelPicker(themeColor)],
                });
            }
            if (id === 'vca_logs_select') {
                data.logsChannelId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

        } catch (err) {
            console.error('[SetVCAlert] Collector error:', err);
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
                            `##   Session Expired\n> Run \`&setvcalert\` again to continue.`
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

function _buildMain(guildId, guild, themeColor, client) {
    const data   = _getTemp(guildId);
    const banner = getPanelBanner(guild, client);

    const c = new ContainerBuilder().setAccentColor(data.enabled ? themeColor : 0x2b2d31);

    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(banner).setDescription('Voice Channel Alert')
        )
    ).addSeparatorComponents(div());

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Voice Channel Alert\n` +
                    `> When a member joins a monitored voice channel, the bot sends\n` +
                    `> an alert in your logs channel with the member's name, role,\n` +
                    `> and a **VC Alert** button to jump directly to the voice channel.\n` +
                    `> **Status:** ${data.enabled ? ' **Enabled**' : ' **Disabled**'}`
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
            )
    );

    c.addSeparatorComponents(div());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`###   Configuration`));
    c.addSeparatorComponents(divS());

    // Categories list
    const catList = data.categories.length > 0
        ? data.categories.map(cat => `\`${cat.name}\``).join(', ')
        : '`None configured`';

    // Channels list
    const chList = data.channels.length > 0
        ? data.channels.map(ch => `<#${ch.id}>`).join(', ')
        : '`None configured`';

    // Roles list
    const roleList = data.roles.length > 0
        ? data.roles.map(r => `<@&${r.id}>`).join(', ')
        : '`None configured`';

    const welcomePreview = data.welcomeMessage.length > 60
        ? data.welcomeMessage.slice(0, 60) + '…'
        : data.welcomeMessage;

    const rows = [
        { label: '  Monitored Categories', value: catList + (data.categories.length > 0 ? ` *(${data.categories.length})*` : '') },
        { label: '  Specific Channels',    value: chList + (data.channels.length > 0 ? ` *(${data.channels.length})*` : '') },
        { label: '  Alert Roles',          value: roleList + (data.roles.length > 0 ? ` *(${data.roles.length})*` : '') },
        { label: '  Logs Channel',         value: data.logsChannelId ? `<#${data.logsChannelId}>` : '`Not set`' },
        { label: '  Welcome Message',      value: `\`${welcomePreview}\`` },
    ];

    for (const row of rows) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${row.label}** — ${row.value}`)
        );
        c.addSeparatorComponents(divS());
    }

    c.addSeparatorComponents(div());

    // Row 1 — Categories
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vca_add_categories').setLabel('  Add Category').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vca_remove_category').setLabel('  Remove Category').setStyle(ButtonStyle.Secondary).setDisabled(data.categories.length === 0),
        )
    );

    // Row 2 — Specific Channels
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vca_add_channels').setLabel('  Add Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vca_remove_channel').setLabel('  Remove Channel').setStyle(ButtonStyle.Secondary).setDisabled(data.channels.length === 0),
        )
    );

    // Row 3 — Roles
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vca_add_roles').setLabel('  Add Role').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vca_remove_role').setLabel('  Remove Role').setStyle(ButtonStyle.Secondary).setDisabled(data.roles.length === 0),
        )
    );

    // Row 4 — Logs + Welcome message
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vca_logs').setLabel('  Logs Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vca_welcome').setLabel('  Welcome Message').setStyle(ButtonStyle.Secondary),
        )
    );

    // Row 5 — Toggle + Save
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('vca_toggle')
                .setLabel(data.enabled ? '  Disable' : '  Enable')
                .setStyle(data.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vca_done').setLabel('  Save').setStyle(ButtonStyle.Success),
        )
    );

    c.addSeparatorComponents(div());
    return c;
}

// ── Add specific voice channels picker ────────────────────────────────────────
function _buildAddChannelsPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Add Specific Voice Channels\n> Select up to 25 voice channels to monitor individually.\n> You can run this multiple times to add more.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('vca_add_channels_select')
                .setPlaceholder('Select voice channels…')
                .setChannelTypes(ChannelType.GuildVoice)
                .setMinValues(1)
                .setMaxValues(25)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Remove specific voice channels picker ─────────────────────────────────────
function _buildRemoveChannelPicker(data, themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Remove Specific Channels\n> Select the channels you want to stop monitoring.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());

    const options = data.channels.slice(0, 25).map(ch =>
        new StringSelectMenuOptionBuilder()
            .setValue(ch.id)
            .setLabel(ch.name.slice(0, 100))
            .setDescription(`Channel ID: ${ch.id}`)
    );

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('vca_remove_channel_select')
                .setPlaceholder('Select channels to remove…')
                .setMinValues(1)
                .setMaxValues(options.length)
                .addOptions(options)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Get available category options (not already added) ────────────────────────
function _getCategoryOptions(guild, existingCats) {
    const existingIds = new Set(existingCats.map(c => c.id));
    return guild.channels.cache
        .filter(ch => ch.type === ChannelType.GuildCategory && !existingIds.has(ch.id))
        .map(ch => new StringSelectMenuOptionBuilder()
            .setValue(ch.id)
            .setLabel(ch.name.slice(0, 100))
            .setDescription(`Category — ${ch.children?.cache?.size || 0} channels`)
        )
        .slice(0, 25);
}

// ── Add categories picker ─────────────────────────────────────────────────────
function _buildAddCategoryPicker(options, themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Add Categories\n` +
                    `> Select one or more categories to monitor.\n` +
                    `> **All voice channels inside** the selected categories will be monitored automatically.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('vca_add_category_select')
                .setPlaceholder('Select categories to monitor…')
                .setMinValues(1)
                .setMaxValues(options.length)
                .addOptions(options)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Remove categories picker ──────────────────────────────────────────────────
function _buildRemoveCategoryPicker(data, themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Remove Categories\n> Select the categories you want to stop monitoring.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());

    const options = data.categories.slice(0, 25).map(cat =>
        new StringSelectMenuOptionBuilder()
            .setValue(cat.id)
            .setLabel(cat.name.slice(0, 100))
            .setDescription(`Category ID: ${cat.id}`)
    );

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('vca_remove_category_select')
                .setPlaceholder('Select categories to remove…')
                .setMinValues(1)
                .setMaxValues(options.length)
                .addOptions(options)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Add alert roles picker ────────────────────────────────────────────────────
function _buildAddRolesPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Add Alert Roles\n> These roles will be pinged when someone joins a monitored channel.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('vca_add_roles_select')
                .setPlaceholder('Select roles to alert…')
                .setMinValues(1)
                .setMaxValues(10)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Remove alert roles picker ─────────────────────────────────────────────────
function _buildRemoveRolePicker(data, themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Remove Alert Roles\n> Select the roles you want to remove from alerts.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());

    const options = data.roles.slice(0, 25).map(r =>
        new StringSelectMenuOptionBuilder()
            .setValue(r.id)
            .setLabel(r.name.slice(0, 100))
            .setDescription(`Role ID: ${r.id}`)
    );

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('vca_remove_role_select')
                .setPlaceholder('Select roles to remove…')
                .setMinValues(1)
                .setMaxValues(options.length)
                .addOptions(options)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ── Logs channel picker ────────────────────────────────────────────────────────
function _buildLogsChannelPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Select Logs Channel\n> The bot will send VC Alert notifications here whenever a member joins a monitored channel.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('vca_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('vca_logs_select')
                .setPlaceholder('Select a text channel…')
                .setChannelTypes(ChannelType.GuildText)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ─── Save config to DB ─────────────────────────────────────────────────────────
async function _saveConfig(guildId, data) {
    await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { vcAlertConfig: { ...data } } },
        { upsert: true }
    ).catch(err => console.error('[SetVCAlert] DB save error:', err));
}
