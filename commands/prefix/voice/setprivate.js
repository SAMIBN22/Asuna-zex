// ─── &setprivate — Private Voice Rooms Setup ─────────────────────────────────
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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

// ─── Separator helpers ─────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Per-guild temp session ────────────────────────────────────────────────────
const _temp = new Map();

function _initTemp(guildId, config) {
    if (_temp.has(guildId)) return;
    const saved = config?.privateVoiceConfig || {};
    _temp.set(guildId, {
        categoryId:     saved.categoryId     || null,
        joinChannels:   saved.joinChannels   || [],   // [{ id, name }]
        logsChannelId:  saved.logsChannelId  || null,
        roleId:         saved.roleId         || null,
        nameTemplate:   saved.nameTemplate   || ' {username}\'s Room',
        welcomeMessage: saved.welcomeMessage || 'Welcome to your private room, {mention}! ',
    });
}

function _getTemp(guildId) { return _temp.get(guildId); }

// ─── Permission check ──────────────────────────────────────────────────────────
function _hasPermission(message, client) {
    const guild  = message.guild;
    const member = message.member;

    // Server owner
    if (guild.ownerId === member.id) return true;

    // Bot owner / devId
    const devIds = (client.config?.devIds || []).map(String);
    if (devIds.includes(String(member.id))) return true;

    // Role position higher than bot's highest role
    const botMember = guild.members.me;
    if (botMember && member.roles.highest.position > botMember.roles.highest.position) return true;

    return false;
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setprivate',
    aliases: ['privatevoice', 'setpv'],
    description: 'Configure the Private Voice Rooms system',
    usage: '&setprivate',
    category: 'Voice',

    async execute(message, args, client) {
        if (!_hasPermission(message, client)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Access Denied\n` +
                                `> Only the **server owner**, **bot owners**, or members with a **role higher than the bot** can use this command.`
                            )
                        )
                ]
            });
        }

        const guildId    = message.guild.id;
        const theme      = await themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x5865F2;
        const config     = await GuildConfig.findOne({ guildId });

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
        filter: i => i.user.id === message.author.id && i.customId.startsWith('spv_'),
        time:   600_000,
    });

    collector.on('collect', async interaction => {
        try {
            const id   = interaction.customId;
            const data = _getTemp(guildId);

            // ── Done ──────────────────────────────────────────────────────────
            if (id === 'spv_done') {
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
                                            `> Private Voice Rooms system has been configured successfully.\n` +
                                            `> Members who join the designated channels will get a private room automatically.`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL())
                                    )
                            )
                    ],
                });
            }

            // ── Back to main ──────────────────────────────────────────────────
            if (id === 'spv_back') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Set Category ──────────────────────────────────────────────────
            if (id === 'spv_category') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildCategoryPicker(themeColor)],
                });
            }
            if (id === 'spv_category_select') {
                data.categoryId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Add Join Channel ──────────────────────────────────────────────
            if (id === 'spv_add_channel') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildAddChannelPicker(themeColor)],
                });
            }
            if (id === 'spv_add_channel_select') {
                const channelId = interaction.values[0];
                const channel   = message.guild.channels.cache.get(channelId);
                if (channel && !data.joinChannels.find(c => c.id === channelId)) {
                    data.joinChannels.push({ id: channelId, name: channel.name });
                }
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Remove Join Channel ───────────────────────────────────────────
            if (id === 'spv_remove_channel') {
                if (data.joinChannels.length === 0) {
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
            if (id === 'spv_remove_channel_select') {
                const removeId = interaction.values[0];
                data.joinChannels = data.joinChannels.filter(c => c.id !== removeId);
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Set Logs Channel ──────────────────────────────────────────────
            if (id === 'spv_logs') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildLogsChannelPicker(themeColor)],
                });
            }
            if (id === 'spv_logs_select') {
                data.logsChannelId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Set Room Role ─────────────────────────────────────────────────
            if (id === 'spv_role') {
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildRolePicker(themeColor)],
                });
            }
            if (id === 'spv_role_select') {
                data.roleId = interaction.values[0];
                await _saveConfig(guildId, data);
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                });
            }

            // ── Room Name Template ────────────────────────────────────────────
            if (id === 'spv_name') {
                const modal = new ModalBuilder()
                    .setCustomId('spv_name_modal')
                    .setTitle('Room Name Template')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('name_template')
                                .setLabel('Name Template — use {username}')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder(" {username}'s Room")
                                .setRequired(true)
                                .setMaxLength(100)
                                .setValue(data.nameTemplate)
                        )
                    );
                await interaction.showModal(modal);
                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'spv_name_modal',
                    time:   120_000,
                }).catch(() => null);
                if (!res) return;
                data.nameTemplate = res.fields.getTextInputValue('name_template').trim();
                await _saveConfig(guildId, data);
                await res.deferUpdate().catch(() => {});
                return res.message.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [_buildMain(guildId, message.guild, themeColor, client)],
                }).catch(() => {});
            }

            // ── Welcome Message ───────────────────────────────────────────────
            if (id === 'spv_welcome') {
                const modal = new ModalBuilder()
                    .setCustomId('spv_welcome_modal')
                    .setTitle('Room Welcome Message')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('welcome_msg')
                                .setLabel('Message  (use {mention} and {username})')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Welcome to your private room, {mention}! ')
                                .setRequired(true)
                                .setMaxLength(1000)
                                .setValue(data.welcomeMessage)
                        )
                    );
                await interaction.showModal(modal);
                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'spv_welcome_modal',
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

        } catch (err) {
            console.error('[SetPrivate] Collector error:', err);
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
                            `##   Session Expired\n> Run \`&setprivate\` again to continue.`
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

    const c = new ContainerBuilder().setAccentColor(themeColor);

    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(banner).setDescription('Private Voice Rooms')
        )
    ).addSeparatorComponents(div());

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Private Voice Rooms\n` +
                    `> Configure the automatic private room system.\n` +
                    `> When a member joins a designated channel, the bot creates a private room for them.`
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
            )
    );

    c.addSeparatorComponents(div());
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`###   Configuration Status`));
    c.addSeparatorComponents(divS());

    const joinList = data.joinChannels.length > 0
        ? data.joinChannels.map(ch => `<#${ch.id}>`).join(', ')
        : '`None`';

    const rows = [
        { label: '  Category',        value: data.categoryId     ? `<#${data.categoryId}>`     : '`Not set`' },
        { label: '  Join Channels',   value: joinList },
        { label: '  Logs Channel',    value: data.logsChannelId  ? `<#${data.logsChannelId}>`  : '`Not set`' },
        { label: '  Room Role',       value: data.roleId         ? `<@&${data.roleId}>`        : '`Not set`' },
        { label: '  Name Template',   value: `\`${data.nameTemplate}\`` },
        { label: '  Welcome Message', value: `\`${data.welcomeMessage.slice(0, 60)}${data.welcomeMessage.length > 60 ? '…' : ''}\`` },
    ];

    for (const row of rows) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${row.label}** — ${row.value}`)
        );
        c.addSeparatorComponents(divS());
    }

    c.addSeparatorComponents(div());

    // Row 1
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('spv_category').setLabel('  Set Category').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('spv_add_channel').setLabel('  Add Join Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('spv_remove_channel').setLabel('  Remove Channel').setStyle(ButtonStyle.Secondary).setDisabled(data.joinChannels.length === 0),
        )
    );

    // Row 2
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('spv_logs').setLabel('  Logs Channel').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('spv_role').setLabel('  Room Role').setStyle(ButtonStyle.Secondary),
        )
    );

    // Row 3
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('spv_name').setLabel('  Room Name').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('spv_welcome').setLabel('  Welcome Message').setStyle(ButtonStyle.Secondary),
        )
    );

    c.addSeparatorComponents(divS());

    // Row 4 — Done
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('spv_done').setLabel('  Save & Done').setStyle(ButtonStyle.Success),
        )
    );

    c.addSeparatorComponents(div());
    return c;
}

function _buildCategoryPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Select Category\n> Choose the category where private rooms will be created.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('spv_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('spv_category_select')
                .setPlaceholder('Select a category…')
                .setChannelTypes(ChannelType.GuildCategory)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

function _buildAddChannelPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Add Join Channel\n> Select the voice channel members join to get a private room.\n> You can add multiple channels.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('spv_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('spv_add_channel_select')
                .setPlaceholder('Select a voice channel…')
                .setChannelTypes(ChannelType.GuildVoice)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

function _buildRemoveChannelPicker(data, themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Remove Join Channel\n> Select the channel you want to remove from the list.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('spv_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());

    const options = data.joinChannels.map(ch =>
        new StringSelectMenuOptionBuilder()
            .setValue(ch.id)
            .setLabel(ch.name.slice(0, 100))
            .setDescription(`ID: ${ch.id}`)
    );

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('spv_remove_channel_select')
                .setPlaceholder('Select a channel to remove…')
                .addOptions(options)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

function _buildLogsChannelPicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Select Logs Channel\n> Choose where private room activity will be logged.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('spv_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('spv_logs_select')
                .setPlaceholder('Select a text channel…')
                .setChannelTypes(ChannelType.GuildText)
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

function _buildRolePicker(themeColor) {
    const c = new ContainerBuilder().setAccentColor(themeColor);
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##   Select Room Role\n` +
                    `> This role is **given automatically** to members when they join a private room.\n` +
                    `> Only members with this role can see and access private rooms.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId('spv_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
    );
    c.addSeparatorComponents(divS());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('spv_role_select')
                .setPlaceholder('Select a role…')
        )
    );
    c.addSeparatorComponents(div());
    return c;
}

// ─── Save config to DB ─────────────────────────────────────────────────────────
async function _saveConfig(guildId, data) {
    await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { privateVoiceConfig: { ...data } } },
        { upsert: true }
    ).catch(err => console.error('[SetPrivate] DB save error:', err));
}
