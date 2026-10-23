// ─── &setstats — Server Stats Panel Configuration ─────────────────────────────
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
} from 'discord.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const TOP_BANNER   = join(__dirname, '../../../assets/images/stats_top.png');
const BOTTOM_GIF   = join(__dirname, '../../../assets/images/stats_bottom.gif');

// ─── Separator helpers ─────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Session state ─────────────────────────────────────────────────────────────
const _temp = new Map();

function _initTemp(guildId, config) {
    if (_temp.has(guildId)) return;
    const saved = config?.serverStatsConfig || {};
    _temp.set(guildId, {
        channelId:   saved.channelId   || null,
        gifUrl:      saved.gifUrl      || null,
        decorEmojis: saved.decorEmojis || null,
        titleEmoji:  saved.titleEmoji  || null,
        enabled:     saved.enabled     ?? true,
    });
}

function _getTemp(guildId) { return _temp.get(guildId); }

async function _saveConfig(guildId, data) {
    await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { serverStatsConfig: { ...data } } },
        { upsert: true, strict: false }
    );
}

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

// ─── Config control panel ─────────────────────────────────────────────────────
function _buildConfigPanel(guildId, guild, themeColor) {
    const d = _getTemp(guildId);

    const statusIcon = d.enabled ? '' : '';
    const statusText = d.enabled ? 'Enabled — auto-posts every 24 hours' : 'Disabled';

    return new ContainerBuilder().setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`##   Server Stats Panel — Configuration`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                )
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> **Status:** ${statusIcon} ${statusText}\n` +
                `> **Post Channel:** ${d.channelId ? `<#${d.channelId}>` : '`Not configured`'}\n` +
                `> **Animated GIF:** ${d.gifUrl ? ` Set` : '`Not set`'}\n` +
                `> **Decorative Emojis:** ${d.decorEmojis ? `\`${d.decorEmojis}\`` : '`Not set`'}\n` +
                `> **Title Emoji:** ${d.titleEmoji ? `\`${d.titleEmoji}\`` : '`Not set`'}`
            )
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> Configure each setting using the buttons below.\n` +
                `> Press ** Save & Post Now** to post the panel immediately — it will then auto-post every **24 hours** to the configured channel.`
            )
        )
        .addSeparatorComponents(divS())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sst_channel').setLabel(' Set Channel').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('sst_gif').setLabel(' Set Animated GIF').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('sst_decor').setLabel(' Decorative Emojis').setStyle(ButtonStyle.Secondary),
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sst_titleemoji').setLabel(' Title Emoji').setStyle(ButtonStyle.Secondary),
                d.enabled
                    ? new ButtonBuilder().setCustomId('sst_disable').setLabel(' Disable').setStyle(ButtonStyle.Danger)
                    : new ButtonBuilder().setCustomId('sst_enable').setLabel(' Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('sst_postnow').setLabel(' Save & Post Now').setStyle(ButtonStyle.Primary),
            )
        );
}

// ─── Build the live stats panel (sent into the server channel) ─────────────────
export async function buildStatsPanel(guild, statsConfig) {
    await guild.members.fetch().catch(() => {});

    const totalMembers = guild.memberCount;

    let voiceCount = 0;
    guild.channels.cache.forEach(ch => {
        if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
            voiceCount += ch.members.size;
        }
    });

    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier  = guild.premiumTier || 0;
    const tierLabel  = boostTier > 0 ? ` — Tier ${boostTier}` : '';

    const iconURL = guild.iconURL({ dynamic: true, size: 256 })
                 || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const container = new ContainerBuilder()
        // ── Header: server name + icon ───────────────────────────────────────
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# __${guild.name}__`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(iconURL)
                )
        )
        .addSeparatorComponents(divS())
        // ── Top animated banner ──────────────────────────────────────────────
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('attachment://stats_top.png')
            )
        )
        .addSeparatorComponents(div())
        // ── Stats ────────────────────────────────────────────────────────────
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### Server Statistics\n` +
                `>  **Members** — \`${totalMembers.toLocaleString()}\` total\n` +
                `>  **In Voice** — \`${voiceCount}\` active\n` +
                `>  **Boosts** — \`${boostCount}\`${tierLabel}`
            )
        )
        .addSeparatorComponents(div())
        // ── Bottom animated GIF ──────────────────────────────────────────────
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('attachment://stats_bottom.gif')
            )
        );

    return {
        components: [container],
        files: [
            new AttachmentBuilder(TOP_BANNER,  { name: 'stats_top.png'    }),
            new AttachmentBuilder(BOTTOM_GIF,  { name: 'stats_bottom.gif' }),
        ],
    };
}

// ─── Post stats to the configured channel ─────────────────────────────────────
export async function postStatsPanel(guild, statsConfig, client) {
    try {
        if (!statsConfig?.channelId) return null;
        const channel = guild.channels.cache.get(statsConfig.channelId);
        if (!channel?.isTextBased()) return null;

        const { components, files } = await buildStatsPanel(guild, statsConfig);

        return await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components,
            files,
        });
    } catch (err) {
        console.error('[setstats] Failed to post stats panel:', err);
        return null;
    }
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setstats',
    aliases: ['serverstats', 'statspanel', 'statssetup'],
    description: 'Configure and post the Server Stats panel',
    usage: '&setstats',
    category: 'Stats',

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
                ],
            });
        }

        const guildId    = message.guild.id;
        const config     = await GuildConfig.findOne({ guildId });
        const theme      = await themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x5865F2;
        const guild      = message.guild;

        _initTemp(guildId, config);

        const sent = await message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [_buildConfigPanel(guildId, guild, themeColor)],
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('sst_'),
            time:   600_000,
        });

        collector.on('collect', async interaction => {
            try {
                const id   = interaction.customId;
                const data = _getTemp(guildId);

                // ── Toggle enable / disable ───────────────────────────────────
                if (id === 'sst_enable' || id === 'sst_disable') {
                    data.enabled = id === 'sst_enable';
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                }

                // ── Set Channel ───────────────────────────────────────────────
                if (id === 'sst_channel') {
                    const modal = new ModalBuilder()
                        .setCustomId('sst_m_channel')
                        .setTitle('Set Stats Channel')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('channel_input')
                                    .setLabel('Channel ID or Name')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('e.g. 1234567890123456789 or general')
                                    .setRequired(true)
                                    .setValue(data.channelId || '')
                            )
                        );
                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.customId === 'sst_m_channel' && i.user.id === message.author.id,
                        time:   120_000,
                    }).catch(() => null);
                    if (!sub) return;

                    await sub.deferUpdate().catch(() => {});

                    const input = sub.fields.getTextInputValue('channel_input').trim();
                    const ch = guild.channels.cache.get(input) ||
                               guild.channels.cache.find(c =>
                                   c.name.toLowerCase() === input.toLowerCase() && c.isTextBased()
                               );
                    if (ch) data.channelId = ch.id;

                    await sent.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                    return;
                }

                // ── Set Animated GIF ──────────────────────────────────────────
                if (id === 'sst_gif') {
                    const modal = new ModalBuilder()
                        .setCustomId('sst_m_gif')
                        .setTitle('Set Animated GIF')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('gif_input')
                                    .setLabel('Animated GIF URL (shown as thumbnail)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('https://cdn.discordapp.com/...  (direct .gif link)')
                                    .setRequired(false)
                                    .setValue(data.gifUrl || '')
                            )
                        );
                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.customId === 'sst_m_gif' && i.user.id === message.author.id,
                        time:   120_000,
                    }).catch(() => null);
                    if (!sub) return;

                    await sub.deferUpdate().catch(() => {});

                    const input = sub.fields.getTextInputValue('gif_input').trim();
                    data.gifUrl = input || null;

                    await sent.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                    return;
                }

                // ── Set Decorative Emojis ─────────────────────────────────────
                if (id === 'sst_decor') {
                    const modal = new ModalBuilder()
                        .setCustomId('sst_m_decor')
                        .setTitle('Set Decorative Emojis')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('decor_input')
                                    .setLabel('Emojis shown below the stats frame')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('e.g.     (multiple emojis allowed)')
                                    .setRequired(false)
                                    .setValue(data.decorEmojis || '')
                            )
                        );
                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.customId === 'sst_m_decor' && i.user.id === message.author.id,
                        time:   120_000,
                    }).catch(() => null);
                    if (!sub) return;

                    await sub.deferUpdate().catch(() => {});

                    const input = sub.fields.getTextInputValue('decor_input').trim();
                    data.decorEmojis = input || null;

                    await sent.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                    return;
                }

                // ── Set Title Emoji ───────────────────────────────────────────
                if (id === 'sst_titleemoji') {
                    const modal = new ModalBuilder()
                        .setCustomId('sst_m_titleemoji')
                        .setTitle('Set Title Emoji')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('emoji_input')
                                    .setLabel('Emoji displayed before the server name')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('e.g.  or  — one emoji')
                                    .setRequired(false)
                                    .setValue(data.titleEmoji || '')
                            )
                        );
                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.customId === 'sst_m_titleemoji' && i.user.id === message.author.id,
                        time:   120_000,
                    }).catch(() => null);
                    if (!sub) return;

                    await sub.deferUpdate().catch(() => {});

                    const input = sub.fields.getTextInputValue('emoji_input').trim();
                    data.titleEmoji = input || null;

                    await sent.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                    return;
                }

                // ── Save & Post Now ───────────────────────────────────────────
                if (id === 'sst_postnow') {
                    if (!data.channelId) {
                        return interaction.update({
                            flags:      MessageFlags.IsComponentsV2,
                            components: [
                                new ContainerBuilder().setAccentColor(0xED4245)
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   No Channel Configured\n` +
                                            `> Please set a channel first using the ** Set Channel** button.`
                                        )
                                    )
                                    .addActionRowComponents(
                                        new ActionRowBuilder().addComponents(
                                            new ButtonBuilder()
                                                .setCustomId('sst_back')
                                                .setLabel('← Back')
                                                .setStyle(ButtonStyle.Secondary)
                                        )
                                    )
                            ],
                        });
                    }

                    data.lastPostedAt = new Date();
                    await _saveConfig(guildId, data);
                    await postStatsPanel(guild, data, client);

                    collector.stop('done');
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(0x57F287)
                                .addSectionComponents(
                                    new SectionBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(
                                                `##   Stats Panel Posted!\n` +
                                                `> The server stats panel has been posted in <#${data.channelId}>.\n` +
                                                `> It will automatically re-post every **24 hours** to that channel.`
                                            )
                                        )
                                        .setThumbnailAccessory(
                                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL())
                                        )
                                )
                        ],
                    });
                }

                // ── Back ──────────────────────────────────────────────────────
                if (id === 'sst_back') {
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [_buildConfigPanel(guildId, guild, themeColor)],
                    });
                }

            } catch (err) {
                console.error('[setstats] Collector error:', err);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'done') {
                sent.edit({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0x5865F2)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   Session Expired\n` +
                                    `> The configuration session has timed out.\n` +
                                    `> Run \`&setstats\` again to continue.`
                                )
                            )
                    ],
                }).catch(() => {});
            }
        });
    },
};
