import {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, SectionBuilder, MediaGalleryBuilder,
    MediaGalleryItemBuilder, MessageFlags, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, PermissionFlagsBits,
    ChannelSelectMenuBuilder, ChannelType,
} from 'discord.js';
import LogConfig    from '../../../models/logConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

// ── Log type definitions ───────────────────────────────────────────────────────
const LOG_PAGES = [
    {
        title: 'Member Events',
        emoji: '👥',
        items: [
            { id: 'memberJoin',    label: 'Member Join',    icon: '📥', desc: 'Logs every new member that joins the server' },
            { id: 'memberLeave',   label: 'Member Leave',   icon: '📤', desc: 'Logs members who leave or get kicked' },
            { id: 'memberBan',     label: 'Member Ban',     icon: '🔨', desc: 'Logs ban actions with reason & moderator' },
            { id: 'memberUnban',   label: 'Member Unban',   icon: '✅', desc: 'Logs when a banned member is unbanned' },
            { id: 'memberTimeout', label: 'Member Timeout', icon: '⏱️', desc: 'Logs timeout actions with duration & reason' },
        ],
    },
    {
        title: 'Message Events',
        emoji: '💬',
        items: [
            { id: 'messageDel',  label: 'Message Delete', icon: '🗑️', desc: 'Logs deleted messages with full content' },
            { id: 'messageEdit', label: 'Message Edit',   icon: '✏️', desc: 'Logs edited messages showing before & after' },
        ],
    },
    {
        title: 'Member Updates',
        emoji: '🎭',
        items: [
            { id: 'roleAdd',    label: 'Role Added',       icon: '🎖️', desc: 'Logs when a role is granted to a member' },
            { id: 'roleRemove', label: 'Role Removed',     icon: '🎗️', desc: 'Logs when a role is taken from a member' },
            { id: 'nickChange', label: 'Nickname Changed', icon: '📝', desc: 'Logs nickname changes with old & new values' },
        ],
    },
    {
        title: 'Server Structure',
        emoji: '🏗️',
        items: [
            { id: 'channelCreate', label: 'Channel Created', icon: '📢', desc: 'Logs when a new channel is created' },
            { id: 'channelDelete', label: 'Channel Deleted', icon: '🗑️', desc: 'Logs when a channel is permanently deleted' },
            { id: 'roleCreate',    label: 'Role Created',    icon: '🎨', desc: 'Logs when a new role is created' },
            { id: 'roleDelete',    label: 'Role Deleted',    icon: '❌', desc: 'Logs when a role is permanently deleted' },
        ],
    },
    {
        title: 'Voice Events',
        emoji: '🔊',
        items: [
            { id: 'voiceJoin',  label: 'Voice Join',  icon: '🎙️', desc: 'Logs when a member joins a voice channel' },
            { id: 'voiceLeave', label: 'Voice Leave', icon: '🔇', desc: 'Logs when a member leaves a voice channel' },
            { id: 'voiceMove',  label: 'Voice Move',  icon: '🔄', desc: 'Logs when a member moves between voice channels' },
        ],
    },
    {
        title: 'Server Events',
        emoji: '🛡️',
        items: [
            { id: 'serverUpdate', label: 'Server Update',  icon: '⚙️', desc: 'Logs when server settings are changed' },
            { id: 'inviteCreate', label: 'Invite Created', icon: '🔗', desc: 'Logs when a new invite link is created' },
            { id: 'inviteDelete', label: 'Invite Deleted', icon: '🚫', desc: 'Logs when an invite link is deleted' },
        ],
    },
];

// ── UI helpers ─────────────────────────────────────────────────────────────────
function div(small = false) {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(small ? SeparatorSpacingSize.Small : SeparatorSpacingSize.Large);
}

// ── Main panel ─────────────────────────────────────────────────────────────────
function buildPanel(guild, accent, page, cfg, { expired = false, bannerUrl = null } = {}) {
    const total    = LOG_PAGES.length;
    const pageData = LOG_PAGES[page];
    const banner   = bannerUrl || guild.iconURL({ extension: 'png', size: 1024 }) || null;

    const totalConfigured = LOG_PAGES.flatMap(p => p.items).filter(i => cfg?.[i.id]).length;
    const allItems        = LOG_PAGES.flatMap(p => p.items).length;

    const c = new ContainerBuilder().setAccentColor(accent);

    if (banner) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(banner).setDescription('Log Control Panel')
            )
        );
    }

    c.addSeparatorComponents(div());

    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 📋 Log Control Panel\n` +
        `## ${pageData.emoji} ${pageData.title}  —  Page ${page + 1} / ${total}\n` +
        `> -# ✅ **${totalConfigured}** of **${allItems}** log types configured`
    ));

    c.addSeparatorComponents(div());

    for (const item of pageData.items) {
        const channelId = cfg?.[item.id];
        const isSet     = !!channelId;

        c.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${item.icon} ${item.label}**\n` +
                        (isSet
                            ? `> **Channel:** <#${channelId}> ✅`
                            : `> **Channel:** \`Not Configured\` ⚪`) + '\n' +
                        `> -# ${item.desc}`
                    )
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId(`logs_set_${item.id}`)
                        .setLabel(isSet ? '✅ Configured' : '⚙️ Set Channel')
                        .setStyle(isSet ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(expired)
                )
        );
        c.addSeparatorComponents(div(true));
    }

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('logs_prev')
                .setLabel('◀  Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired || page === 0),
            new ButtonBuilder()
                .setCustomId('logs_page_noop')
                .setLabel(`Page ${page + 1} / ${total}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('logs_next')
                .setLabel('Next  ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired || page === total - 1),
            new ButtonBuilder()
                .setCustomId('logs_clear_page')
                .setLabel('🗑️ Clear Page')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(expired),
        )
    );

    return [c];
}

// ── Select-channel panel (replaces main panel in-place) ────────────────────────
function buildSelectPanel(guild, accent, item, cfg, { bannerUrl = null } = {}) {
    const banner    = bannerUrl || guild.iconURL({ extension: 'png', size: 1024 }) || null;
    const channelId = cfg?.[item.id];

    const c = new ContainerBuilder().setAccentColor(accent);

    if (banner) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(banner).setDescription('Log Control Panel')
            )
        );
    }

    c.addSeparatorComponents(div());

    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 📋 Log Control Panel\n` +
        `## ⚙️ Select a Channel\n` +
        `> **Log Type:** ${item.icon} **${item.label}**\n` +
        (channelId
            ? `> **Current:** <#${channelId}>\n`
            : `> **Current:** \`Not Configured\`\n`) +
        `> -# Pick a channel from the dropdown below, then press ✅ Confirm.`
    ));

    c.addSeparatorComponents(div());

    // Channel select menu
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('logs_select_channel')
                .setPlaceholder('🔍  Choose a text channel...')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setMinValues(1)
                .setMaxValues(1)
        )
    );

    // Action buttons
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('logs_select_confirm')
                .setLabel('✅  Confirm')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),          // enabled after selection
            new ButtonBuilder()
                .setCustomId('logs_select_remove')
                .setLabel('🗑️  Remove Channel')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!channelId),
            new ButtonBuilder()
                .setCustomId('logs_select_cancel')
                .setLabel('✖  Back')
                .setStyle(ButtonStyle.Secondary),
        )
    );

    return [c];
}

// ── Select panel with a chosen channel (confirm now enabled) ───────────────────
function buildSelectPanelChosen(guild, accent, item, chosenId, cfg, { bannerUrl = null } = {}) {
    const banner = bannerUrl || guild.iconURL({ extension: 'png', size: 1024 }) || null;

    const c = new ContainerBuilder().setAccentColor(accent);

    if (banner) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(banner).setDescription('Log Control Panel')
            )
        );
    }

    c.addSeparatorComponents(div());

    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 📋 Log Control Panel\n` +
        `## ⚙️ Select a Channel\n` +
        `> **Log Type:** ${item.icon} **${item.label}**\n` +
        `> **Selected:** <#${chosenId}> ✅\n` +
        `> -# Press ✅ Confirm to save, or choose a different channel.`
    ));

    c.addSeparatorComponents(div());

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('logs_select_channel')
                .setPlaceholder('🔍  Choose a different channel...')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setMinValues(1)
                .setMaxValues(1)
        )
    );

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`logs_select_confirm_${chosenId}`)
                .setLabel('✅  Confirm')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('logs_select_remove')
                .setLabel('🗑️  Remove Channel')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!cfg?.[item.id]),
            new ButtonBuilder()
                .setCustomId('logs_select_cancel')
                .setLabel('✖  Back')
                .setStyle(ButtonStyle.Secondary),
        )
    );

    return [c];
}

// ── Command export ─────────────────────────────────────────────────────────────
export default {
    name:        'setup-logs',
    aliases:     ['setlogs', 'logs-setup', 'logssetup', 'logpanel'],
    description: 'Open the log system control panel',
    category:    'Setup',
    usage:       '&setup-logs',

    async execute(message, args, client) {
        // ── Permission guard ──────────────────────────────────────────────────
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const theme  = await themeManager.getTheme(message.guild.id);
            const accent = client.themeManager.getRGBColor(theme.color);
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## 🚫 Access Restricted\n` +
                            `> This command requires **Administrator** permission to use.`
                        )),
                ],
                allowedMentions: { parse: [] },
            });
        }

        const theme     = await themeManager.getTheme(message.guild.id);
        const accent    = client.themeManager.getRGBColor(theme.color);
        const bannerUrl = getPanelBanner(message.guild, client);

        let page        = 0;
        let activeItem  = null;   // the log-type item currently being configured
        let pendingId   = null;   // channel ID chosen but not yet confirmed

        let cfg = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }),
            allowedMentions: { parse: [] },
        });

        // ── Component collector ───────────────────────────────────────────────
        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time:   300_000,
        });

        collector.on('collect', async interaction => {
            const id = interaction.customId;

            // ── While in select-channel view ──────────────────────────────────
            if (activeItem) {
                // User picked a channel from the dropdown
                if (id === 'logs_select_channel') {
                    pendingId = interaction.values[0];
                    return interaction.update({
                        components: buildSelectPanelChosen(
                            message.guild, accent, activeItem, pendingId, cfg, { bannerUrl }
                        ),
                    });
                }

                // Confirm button — customId encodes the channel id
                if (id.startsWith('logs_select_confirm')) {
                    const channelId = id.includes('_') && id.split('logs_select_confirm_')[1]
                        ? id.split('logs_select_confirm_')[1]
                        : pendingId;

                    if (!channelId) {
                        return interaction.deferUpdate().catch(() => {});
                    }

                    await LogConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { [activeItem.id]: channelId } },
                        { upsert: true }
                    );
                    cfg        = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                    activeItem = null;
                    pendingId  = null;
                    return interaction.update({
                        components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }),
                    });
                }

                // Remove channel
                if (id === 'logs_select_remove') {
                    await LogConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { [activeItem.id]: null } },
                        { upsert: true }
                    );
                    cfg        = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                    activeItem = null;
                    pendingId  = null;
                    return interaction.update({
                        components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }),
                    });
                }

                // Back / cancel
                if (id === 'logs_select_cancel') {
                    activeItem = null;
                    pendingId  = null;
                    return interaction.update({
                        components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }),
                    });
                }

                return interaction.deferUpdate().catch(() => {});
            }

            // ── Main panel interactions ───────────────────────────────────────
            if (id === 'logs_prev') {
                page = Math.max(0, page - 1);
                cfg  = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                return interaction.update({ components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }) });
            }

            if (id === 'logs_next') {
                page = Math.min(LOG_PAGES.length - 1, page + 1);
                cfg  = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                return interaction.update({ components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }) });
            }

            if (id === 'logs_clear_page') {
                const updates = {};
                LOG_PAGES[page].items.forEach(i => { updates[i.id] = null; });
                await LogConfig.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { $set: updates },
                    { upsert: true }
                );
                cfg = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                return interaction.update({ components: buildPanel(message.guild, accent, page, cfg, { bannerUrl }) });
            }

            // Open select-channel view inside the same panel
            if (id.startsWith('logs_set_')) {
                const logType = id.replace('logs_set_', '');
                activeItem    = LOG_PAGES[page].items.find(i => i.id === logType);
                pendingId     = null;
                cfg           = await LogConfig.findOne({ guildId: message.guild.id }).lean() || {};
                return interaction.update({
                    components: buildSelectPanel(message.guild, accent, activeItem, cfg, { bannerUrl }),
                });
            }
        });

        collector.on('end', () => {
            LogConfig.findOne({ guildId: message.guild.id }).lean().then(finalCfg => {
                sent.edit({
                    components: buildPanel(message.guild, accent, page, finalCfg || {}, { expired: true, bannerUrl }),
                }).catch(() => {});
            });
        });
    },
};
