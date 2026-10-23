// ─── Ticket Handler ───────────────────────────────────────────────────────────
// Handles ticket_open_* (buttons) and ticket_select_open (select menu) clicks
// on the public ticket panel. Creates a private ticket channel for the user.

import {
    PermissionsBitField,
    ChannelType,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import GuildConfig from '../models/guildConfig.js';

// ─── In-memory state ──────────────────────────────────────────────────────────
// Prevents double-opening while a channel is being created
const _creating = new Map();   // guildId → Set<userId>

// Cooldown after closing: userId@guildId → timestamp when they may open again
const _cooldowns = new Map();  // `${guildId}:${userId}` → Date.now() + 120_000

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const LEGACY_BRANDING_PATTERN = /Asuna|明日奈|aid-app|gg#7440/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the existing open ticket channel for this user in this guild, or null */
function _findOpenTicket(guild, userId) {
    return guild.channels.cache.find(ch =>
        ch.isTextBased() &&
        ch.topic?.includes(`(${userId})`) &&
        ch.name?.startsWith('ticket-')
    ) ?? null;
}

/** Returns remaining cooldown in ms, or 0 if none */
function _getCooldown(guildId, userId) {
    const key       = `${guildId}:${userId}`;
    const expiresAt = _cooldowns.get(key);
    if (!expiresAt) return 0;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { _cooldowns.delete(key); return 0; }
    return remaining;
}

/** Sets a 2-minute cooldown for this user */
function _setCooldown(guildId, userId) {
    _cooldowns.set(`${guildId}:${userId}`, Date.now() + COOLDOWN_MS);
}

// ─── Open ticket ──────────────────────────────────────────────────────────────
export async function handleTicketInteraction(interaction, client) {
    const { customId, guild, user } = interaction;
    if (!guild) return;

    const guildId = guild.id;

    // ── Which category? ────────────────────────────────────────────────────────
    let categoryKey = null;
    if (customId.startsWith('ticket_open_')) {
        categoryKey = customId.replace('ticket_open_', '');
    } else if (customId === 'ticket_select_open') {
        categoryKey = interaction.values?.[0] ?? null;
    }
    if (!categoryKey) return;

    // ── Cooldown check ─────────────────────────────────────────────────────────
    const remaining = _getCooldown(guildId, user.id);
    if (remaining > 0) {
        const secs = Math.ceil(remaining / 1000);
        const mins = Math.floor(secs / 60);
        const s    = secs % 60;
        const timeStr = mins > 0 ? `${mins}m ${s}s` : `${secs}s`;
        return interaction.reply({
            content: `⏳ Please wait **${timeStr}** before opening a new ticket.`,
            ephemeral: true
        }).catch(() => {});
    }

    // ── Already has an open ticket? ────────────────────────────────────────────
    const openTicket = _findOpenTicket(guild, user.id);
    if (openTicket) {
        return interaction.reply({
            content: `<a:edfef:1528076477114093699> You already have an open ticket: <#${openTicket.id}>\nPlease close it before opening a new one.`,
            ephemeral: true
        }).catch(() => {});
    }

    // ── Prevent double-creation (race guard) ───────────────────────────────────
    if (!_creating.has(guildId)) _creating.set(guildId, new Set());
    const guildCreating = _creating.get(guildId);
    if (guildCreating.has(user.id)) {
        return interaction.reply({
            content: '⏳ Your ticket is already being created, please wait…',
            ephemeral: true
        }).catch(() => {});
    }
    guildCreating.add(user.id);

    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // ── Load config ────────────────────────────────────────────────────────
        const config = await GuildConfig.findOne({ guildId });
        if (!config?.ticketChannelId) {
            return interaction.editReply('❌ Ticket system is not fully configured. Contact an administrator.').catch(() => {});
        }

        const categories   = config.ticketCategories || [];
        const adminRoleIds = config.ticketAdminRoleIds || [];
        const logsChId     = config.ticketLogsChannelId;
        // ── Find the matching category ─────────────────────────────────────────
        const cat = categories.find(c =>
            c.name.toLowerCase().replace(/\s+/g, '_').slice(0, 100) === categoryKey
        );

        const catLabel      = cat?.name        || categoryKey;
        const catEmojiId    = cat?.emojiId     || null;
        const catEmojiName  = cat?.emojiName   || null;
        const catConditions = cat?.conditions  || null;

        // ── Discord category where ticket channels will be created ────────────
        const parentCategoryId = config.ticketCategoryId || null;

        // ── Channel name ───────────────────────────────────────────────────────
        const safeLabel  = catLabel.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
        const safeUser   = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || user.id.slice(-4);
        const ticketName = `ticket-${safeLabel}-${safeUser}`;

        // ── Permission overwrites ──────────────────────────────────────────────
        const VIEW_SEND = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
        ];

        const permissionOverwrites = [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: VIEW_SEND }
        ];

        for (const roleId of adminRoleIds) {
            if (guild.roles.cache.has(roleId)) {
                permissionOverwrites.push({
                    id:    roleId,
                    allow: [...VIEW_SEND, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageChannels]
                });
            }
        }

        // ── Create ticket channel ──────────────────────────────────────────────
        const ticketChannel = await guild.channels.create({
            name:                ticketName,
            type:                ChannelType.GuildText,
            parent:              parentCategoryId,
            permissionOverwrites,
            topic:               `🎫 Ticket — ${catLabel} | Opened by ${user.tag} (${user.id})`
        });

        // ── Theme ──────────────────────────────────────────────────────────────
        const theme      = await client.themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x2b2d31;
        const thumb      = theme.images?.thumbnail || client.user.displayAvatarURL();

        const emojiStr      = catEmojiId && catEmojiName ? `<:${catEmojiName}:${catEmojiId}> ` : '';
        const adminMentions = adminRoleIds.map(r => `<@&${r}>`).join(' ') || '';

        // ── Welcome message in ticket channel ──────────────────────────────────
        const welcomeContainer = new ContainerBuilder().setAccentColor(themeColor);

        welcomeContainer
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 🎫 __Ticket — ${emojiStr}${catLabel}__\n\n` +
                            `> **Opened by:** <@${user.id}>\n` +
                            `> **Category:** ${catLabel}\n` +
                            (adminMentions ? `> **Support Team:** ${adminMentions}\n` : '') +
                            (catConditions
                                ? `\n> <:14691048134876898091:1522759251573997648> **Requirements:**\n> ${catConditions.replace(/\n/g, '\n> ')}`
                                : '')
                        )
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> -# Please describe your issue and a staff member will assist you shortly.`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${ticketChannel.id}`)
                        .setLabel('🔒 Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                )
            )
            // Mention ping at the bottom (no content field allowed with V2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    [`<@${user.id}>`, adminMentions].filter(Boolean).join(' ')
                )
            );

        await ticketChannel.send({
            flags:           MessageFlags.IsComponentsV2,
            components:      [welcomeContainer],
            allowedMentions: { users: [user.id], roles: adminRoleIds }
        });

        // ── Confirm to user (ephemeral) ────────────────────────────────────────
        const confirmContainer = new ContainerBuilder().setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ✅ __Ticket Created__\n` +
                            `> Your ticket has been opened in <#${ticketChannel.id}>`
                        )
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
            );

        await interaction.editReply({
            flags:      MessageFlags.IsComponentsV2,
            components: [confirmContainer]
        }).catch(() => {});

        // ── Log ────────────────────────────────────────────────────────────────
        if (logsChId) {
            const logsChannel = guild.channels.cache.get(logsChId);
            if (logsChannel?.isTextBased()) {
                await logsChannel.send({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## <:14691048134876898091:1522759251573997648> __New Ticket Opened__\n` +
                                    `> **User:** <@${user.id}> (\`${user.tag}\`)\n` +
                                    `> **Category:** ${catLabel}\n` +
                                    `> **Channel:** <#${ticketChannel.id}>\n` +
                                    `> **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                                )
                            )
                    ]
                }).catch(() => {});
            }
        }

    } catch (err) {
        console.error('[TicketHandler] Error creating ticket:', err);
        await interaction.editReply('❌ Failed to create your ticket. Please contact an administrator.').catch(() => {});
    } finally {
        _creating.get(guildId)?.delete(user.id);
    }
}

// ─── Close ticket ─────────────────────────────────────────────────────────────
export async function handleTicketClose(interaction, client) {
    const { customId, guild, member, user } = interaction;
    const channelId = customId.replace('ticket_close_', '');

    if (interaction.channelId !== channelId) return;

    const config       = await GuildConfig.findOne({ guildId: guild.id });
    const adminRoleIds = config?.ticketAdminRoleIds || [];

    const isAdmin  = member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
                     member.roles.cache.some(r => adminRoleIds.includes(r.id));

    // Extract opener ID from channel topic
    const topic        = interaction.channel?.topic || '';
    const openerMatch  = topic.match(/\((\d+)\)$/);
    const openerId     = openerMatch?.[1] ?? null;
    const isOpener     = openerId === user.id;

    if (!isAdmin && !isOpener) {
        return interaction.reply({
            content:   '❌ Only staff or the ticket opener can close this ticket.',
            ephemeral: true
        }).catch(() => {});
    }

    await interaction.reply({
        content:   '🔒 Ticket is being closed… it will be deleted in **5 seconds**.',
        ephemeral: true
    }).catch(() => {});

    // ── Apply 2-minute cooldown to the opener ──────────────────────────────────
    if (openerId) {
        _setCooldown(guild.id, openerId);

        // Try to DM the opener with the cooldown notice
        try {
            const opener = await client.users.fetch(openerId).catch(() => null);
            if (opener) {
                await opener.send(
                    `🔒 Your ticket in **${guild.name}** has been closed.\n` +
                    `⏳ You can open a new ticket in **2 minutes**.`
                ).catch(() => {}); // DMs may be disabled — ignore
            }
        } catch {}
    }

    // ── Log the close ──────────────────────────────────────────────────────────
    const logsChId = config?.ticketLogsChannelId;
    if (logsChId) {
        const logsChannel = guild.channels.cache.get(logsChId);
        if (logsChannel?.isTextBased()) {
            const theme      = await client.themeManager.getTheme(guild.id);
            const themeColor = Number(theme.color) || 0x2b2d31;

            await logsChannel.send({
                flags:      MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## 🔒 __Ticket Closed__\n` +
                                `> **Closed by:** <@${user.id}> (\`${user.tag}\`)\n` +
                                (openerId && openerId !== user.id ? `> **Opener:** <@${openerId}>\n` : '') +
                                `> **Channel:** \`${interaction.channel.name}\`\n` +
                                `> **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                        )
                ]
            }).catch(() => {});
        }
    }

    // ── Delete channel after 5 seconds ────────────────────────────────────────
    setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
}

/**
 * Repairs existing ticket channels that still contain a bot-authored message
 * from the previous branding. User-authored messages are never modified.
 */
export async function cleanupLegacyTicketMessages(client) {
    let repaired = 0;

    for (const guild of client.guilds.cache.values()) {
        const ticketChannels = guild.channels.cache.filter(channel =>
            channel.isTextBased() && channel.name?.startsWith('ticket-')
        );

        for (const channel of ticketChannels.values()) {
            const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
            if (!messages) continue;

            const legacyMessages = messages.filter(message => {
                if (message.author?.id !== client.user.id) return false;
                const serialized = JSON.stringify(message.toJSON?.() ?? message);
                return LEGACY_BRANDING_PATTERN.test(serialized);
            });

            if (!legacyMessages.size) continue;

            for (const message of legacyMessages.values()) {
                await message.delete().catch(() => {});
            }

            const theme = await client.themeManager.getTheme(guild.id).catch(() => null);
            const themeColor = Number(theme?.color) || 0x2b2d31;
            const brandName = client.user?.globalName || client.user?.username || 'Discord Bot';
            const replacement = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🎫 ${brandName} Support Ticket\n\n` +
                        `> **Welcome.** Please describe your request clearly and a support team member will assist you shortly.`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket_close_${channel.id}`)
                            .setLabel('🔒 Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                    )
                );

            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [replacement]
            }).catch(() => {});

            repaired++;
        }
    }

    if (repaired > 0) {
        console.log(`[TicketBranding] Repaired ${repaired} existing ticket channel(s).`);
    }
}
