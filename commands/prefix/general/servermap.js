import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
} from 'discord.js';

// ── Animated emojis ───────────────────────────────────────────────────────────
const E1 = '';
const E2 = '';

// ── Per-user session: `guildId:userId` → { bannerUrl, channels[] } ────────────
const sessions = new Map();
function getSession(guildId, userId) {
    const k = `${guildId}:${userId}`;
    if (!sessions.has(k)) sessions.set(k, { bannerUrl: null, channels: [] });
    return sessions.get(k);
}

// ── Separator helper ──────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
const divL = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);

// ── Parse channel ID from mention or raw ID ───────────────────────────────────
function parseChannelId(input) {
    const m = input.match(/^<#(\d+)>$/);
    if (m) return m[1];
    if (/^\d+$/.test(input.trim())) return input.trim();
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildPanel — single container, all controls inside
// ─────────────────────────────────────────────────────────────────────────────
function buildPanel(guild, accent, session, expired = false) {
    const chCount   = session.channels.length;
    const hasBanner = !!session.bannerUrl;
    const star      = '';
    const yes       = '';
    const no        = '';

    // ── Status block ──────────────────────────────────────────────────────────
    const statusLines =
        `> ${hasBanner ? yes : no} **Banner:** ${hasBanner ? `[Set](${session.bannerUrl})` : 'Not set'}\n` +
        `> ${chCount > 0 ? yes : no} **Channels:** ${chCount} / 20 added` +
        (chCount > 0
            ? '\n' + session.channels.map((c, i) =>
                `> ${star} \`${String(i + 1).padStart(2, '0')}.\` <#${c.channelId}>${c.emoji ? ` ${c.emoji}` : ''} — ${c.description.slice(0, 45)}${c.description.length > 45 ? '…' : ''}`
              ).join('\n')
            : '\n> -# *No channels added yet.*');

    // ── Main action select ────────────────────────────────────────────────────
    const actionSelect = new StringSelectMenuBuilder()
        .setCustomId('smap_action')
        .setDisabled(expired)
        .setPlaceholder(expired ? '  Session expired — run &servermap again' : '  Choose an action…')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Banner')
                .setValue('banner')
                .setDescription('Set or update the banner image / GIF'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Add Channel')
                .setValue('add')
                .setDescription(chCount >= 20 ? 'Limit reached (20 / 20)' : 'Add a channel entry to the map'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Preview')
                .setValue('preview')
                .setDescription(chCount === 0 ? 'Add at least one channel first' : 'Preview the server map (visible only to you)'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Post Map')
                .setValue('post')
                .setDescription(chCount === 0 ? 'Add at least one channel first' : 'Send the finished map to a channel'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Reset All')
                .setValue('reset')
                .setDescription('Clear banner and all channel entries'),
        );

    // ── Container ─────────────────────────────────────────────────────────────
    const container = new ContainerBuilder()
        .setAccentColor(accent)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`##   Server Map Builder — ${guild.name}`)
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statusLines)
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Tip: Use Preview before posting. Up to 20 channels. Banner is optional.`
            )
        )
        .addSeparatorComponents(div())
        // ── Main action select inside the container ───────────────────────────
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(actionSelect)
        );

    // ── Remove-channel select (only shown when channels exist) ────────────────
    if (chCount > 0 && !expired) {
        const removeOpts = session.channels.map((c, i) => {
            const ch   = guild.channels.cache.get(c.channelId);
            const name = ch ? `#${ch.name}` : `ID ${c.channelId}`;
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${i + 1}. ${name}`.slice(0, 100))
                .setDescription(c.description.slice(0, 50))
                .setValue(String(i));
        });

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('smap_remove_select')
                    .setPlaceholder('  Select a channel to remove…')
                    .addOptions(removeOpts)
            )
        );
    }

    return [container];
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildMap — final output container
// ─────────────────────────────────────────────────────────────────────────────
function buildMap(guild, accent, session) {
    const container = new ContainerBuilder().setAccentColor(accent);
    const year = new Date().getFullYear();

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${guild.name} — Server Map `)
    );

    if (session.bannerUrl) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(session.bannerUrl)
            )
        );
    }

    container.addSeparatorComponents(divL());

    for (const ch of session.channels) {
        const emojiPart = ch.emoji ? ` ${ch.emoji}` : '';
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${E1}  <#${ch.channelId}>${emojiPart}\n` +
                `${E2}  ${ch.description}`
            )
        );
        container.addSeparatorComponents(div());
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# © ${year} ${guild.name} ™. All rights reserved.`
        )
    );

    return [container];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Command
// ─────────────────────────────────────────────────────────────────────────────
export default {
    name:        'servermap',
    aliases:     ['smap', 'server-map'],
    description: 'Build and post a professional server map (Manage Server only)',
    category:    'General',
    usage:       '&servermap',

    async execute(message, args, client) {
        const { guild, member, author } = message;

        const theme  = await client.themeManager.getTheme(guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const star   = '';

        // ── Permission check ──────────────────────────────────────────────────
        const hasPerms =
            member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!hasPerms) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Access Restricted\n` +
                                `> ${star} This command requires **Manage Server** or **Administrator** permission.`
                            )
                        ),
                ],
                allowedMentions: { repliedUser: false },
            });
        }

        const session = getSession(guild.id, author.id);

        // ── Send panel ────────────────────────────────────────────────────────
        const sent = await message.reply({
            flags:           MessageFlags.IsComponentsV2,
            components:      buildPanel(guild, accent, session),
            allowedMentions: { repliedUser: false },
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === author.id,
            time:   600_000,   // 10 minutes
        });

        // ── Refresh helper ────────────────────────────────────────────────────
        const refresh = (i) =>
            i.update({
                flags:      MessageFlags.IsComponentsV2,
                components: buildPanel(guild, accent, session),
            }).catch(() => {});

        // ── Collector ─────────────────────────────────────────────────────────
        collector.on('collect', async interaction => {
            const cid = interaction.customId;

            // ── Remove channel select ─────────────────────────────────────────
            if (cid === 'smap_remove_select') {
                const idx = parseInt(interaction.values[0], 10);
                if (!isNaN(idx) && idx >= 0 && idx < session.channels.length) {
                    session.channels.splice(idx, 1);
                }
                return refresh(interaction);
            }

            // ── Main action select ────────────────────────────────────────────
            if (cid === 'smap_action') {
                const action = interaction.values[0];

                // ── SET BANNER ────────────────────────────────────────────────
                if (action === 'banner') {
                    const input = new TextInputBuilder()
                        .setCustomId('banner_url')
                        .setLabel('Image or GIF URL')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://example.com/banner.gif')
                        .setRequired(true)
                        .setMaxLength(512);

                    if (session.bannerUrl) input.setValue(session.bannerUrl);

                    const modal = new ModalBuilder()
                        .setCustomId('smap_modal_banner')
                        .setTitle('Set Banner Image')
                        .addComponents(new ActionRowBuilder().addComponents(input));

                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === author.id && i.customId === 'smap_modal_banner',
                        time:   120_000,
                    }).catch(() => null);

                    if (!sub) return;
                    session.bannerUrl = sub.fields.getTextInputValue('banner_url').trim();
                    await sub.deferUpdate().catch(() => {});
                    return sub.message.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: buildPanel(guild, accent, session),
                    }).catch(() => {});
                }

                // ── ADD CHANNEL ───────────────────────────────────────────────
                if (action === 'add') {
                    if (session.channels.length >= 20) return refresh(interaction);

                    const modal = new ModalBuilder()
                        .setCustomId('smap_modal_add')
                        .setTitle('Add Channel Entry')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('ch_id')
                                    .setLabel('Channel ID or mention  (e.g. #general)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('123456789012345678  or  <#123456789012345678>')
                                    .setRequired(true)
                                    .setMaxLength(100)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('ch_emoji')
                                    .setLabel('Channel emoji  (optional)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('')
                                    .setRequired(false)
                                    .setMaxLength(32)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('ch_desc')
                                    .setLabel('Channel description  (max 120 chars)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Official channel to chat with server members!')
                                    .setRequired(true)
                                    .setMaxLength(120)
                            ),
                        );

                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === author.id && i.customId === 'smap_modal_add',
                        time:   120_000,
                    }).catch(() => null);

                    if (!sub) return;

                    const rawId = sub.fields.getTextInputValue('ch_id').trim();
                    const emoji = sub.fields.getTextInputValue('ch_emoji').trim() || null;
                    const desc  = sub.fields.getTextInputValue('ch_desc').trim();
                    const chId  = parseChannelId(rawId);

                    if (!chId) {
                        await sub.reply({
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                            components: [
                                new ContainerBuilder().setAccentColor(accent)
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   Invalid Channel\n` +
                                            `> ${star} Please enter a valid channel ID or mention.`
                                        )
                                    ),
                            ],
                        }).catch(() => {});
                        return;
                    }

                    session.channels.push({ channelId: chId, emoji, description: desc });
                    await sub.deferUpdate().catch(() => {});
                    return sub.message.edit({
                        flags:      MessageFlags.IsComponentsV2,
                        components: buildPanel(guild, accent, session),
                    }).catch(() => {});
                }

                // ── PREVIEW ───────────────────────────────────────────────────
                if (action === 'preview') {
                    if (!session.channels.length) return refresh(interaction);
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.followUp({
                        flags:      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                        components: buildMap(guild, accent, session),
                    }).catch(() => {});
                    return;
                }

                // ── POST MAP ──────────────────────────────────────────────────
                if (action === 'post') {
                    if (!session.channels.length) return refresh(interaction);

                    const modal = new ModalBuilder()
                        .setCustomId('smap_modal_post')
                        .setTitle('Post Server Map')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('post_channel_id')
                                    .setLabel('Channel ID or mention  (blank = here)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Leave blank to post in this channel')
                                    .setRequired(false)
                                    .setMaxLength(100)
                            )
                        );

                    await interaction.showModal(modal);

                    const sub = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === author.id && i.customId === 'smap_modal_post',
                        time:   60_000,
                    }).catch(() => null);

                    if (!sub) return;

                    const rawTarget = sub.fields.getTextInputValue('post_channel_id').trim();
                    const targetId  = rawTarget ? parseChannelId(rawTarget) : message.channelId;
                    const target    = guild.channels.cache.get(targetId || message.channelId);

                    if (!target?.isTextBased()) {
                        await sub.reply({
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                            components: [
                                new ContainerBuilder().setAccentColor(accent)
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   Invalid Channel\n` +
                                            `> ${star} Could not find that channel. Please try again.`
                                        )
                                    ),
                            ],
                        }).catch(() => {});
                        return;
                    }

                    await sub.deferUpdate().catch(() => {});

                    try {
                        await target.send({
                            flags:           MessageFlags.IsComponentsV2,
                            components:      buildMap(guild, accent, session),
                            allowedMentions: { parse: [] },
                        });

                        await sub.message.edit({
                            flags: MessageFlags.IsComponentsV2,
                            components: [
                                new ContainerBuilder().setAccentColor(accent)
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   Server Map Posted!\n` +
                                            `> ${star} Successfully sent to ${target}.\n` +
                                            `> ${star} Run \`&servermap\` again to build a new one.`
                                        )
                                    ),
                            ],
                        }).catch(() => {});

                        collector.stop('posted');
                    } catch (err) {
                        await sub.followUp({
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                            components: [
                                new ContainerBuilder().setAccentColor(accent)
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##   Failed to Post\n` +
                                            `> ${star} Make sure I have permission to send messages in ${target}.\n` +
                                            `> -# ${err.message}`
                                        )
                                    ),
                            ],
                        }).catch(() => {});
                    }
                    return;
                }

                // ── RESET ─────────────────────────────────────────────────────
                if (action === 'reset') {
                    session.bannerUrl = null;
                    session.channels  = [];
                    return refresh(interaction);
                }
            }
        });

        // ── On expire ─────────────────────────────────────────────────────────
        collector.on('end', (_, reason) => {
            if (reason === 'posted') return;
            sent.edit({
                flags:      MessageFlags.IsComponentsV2,
                components: buildPanel(guild, accent, session, true),
            }).catch(() => {});
        });
    },
};
