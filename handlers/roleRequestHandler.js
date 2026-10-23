/**
 * roleRequestHandler.js
 * Handles public panel interactions and approval/rejection flows for the Role Request System.
 *
 * Routed from interactionCreate.js for:
 *   rr_panel_cat        — category dropdown on public panel
 *   rr_panel_role       — role dropdown (second step)
 *   rr_rolesel_*        — admin role selection menus in setup
 *   rr_ok_*             — approve button in logs
 *   rr_no_*             — reject button in logs (opens modal)
 *   rr_no_reason_*      — reject modal submit
 *   rr_modal_channels   — modal submit: set channels
 *   rr_modal_image      — modal submit: set image URL
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
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import RoleRequestConfig from '../models/roleRequestConfig.js';
import RoleRequest       from '../models/roleRequest.js';

// ── Category definitions ──────────────────────────────────────────────────────

export const CATEGORIES = {
    limited: {
        key:         'limited',
        label:       'Limited',
        emoji:       '<:ffgg:1539151861905358918>',
        description: 'Exclusive and may have limited slots and special access.',
    },
    powers: {
        key:         'powers',
        label:       'Powers',
        emoji:       '<a:vrhrd:1539152006713843822>',
        description: 'Gain access to special abilities on the server.',
    },
    special: {
        key:         'special',
        label:       'Special Roles',
        emoji:       '<a:gbrhrh:1539153107835949076>',
        description: 'Stand out with unique, cosmetic, or honorary titles.',
    },
    girls: {
        key:         'girls',
        label:       'Girls Roles',
        emoji:       '<a:regerhtr:1539153475970015293>',
        description: 'Special roles for girls.',
    },
    custom: {
        key:         'custom',
        label:       'Custom Features',
        emoji:       '<:hthjtrj:1539153565962993715>',
        description: 'Change visual cosmetics, disable experience gain, and hide from the leaderboard.',
    },
};

const CAT_ORDER = ['limited', 'powers', 'special', 'girls', 'custom'];
const TITLE_EMOJI = '<:fezrgresh:1539153687648272404>';

// ── Build the public panel ────────────────────────────────────────────────────

export function buildPublicPanel(guild, cfg) {
    const imageUrl = cfg.animatedImageUrl ||
                     guild.bannerURL({ extension: 'gif', size: 512, dynamic: true }) ||
                     guild.iconURL({ extension: 'png', size: 512 });

    const catLines = CAT_ORDER.map(k => {
        const def = CATEGORIES[k];
        return `${def.emoji} **${def.label}**\n${def.description}`;
    }).join('\n\n');

    const container = new ContainerBuilder()
        .setAccentColor([29, 155, 240]);

    if (imageUrl) {
        container.addMediaGalleryComponents(g =>
            g.addItems(item => item.setURL(imageUrl).setDescription(`${guild.name} Roles`))
        );
    }

    container
        .addTextDisplayComponents(t => t.setContent(
            `${TITLE_EMOJI} **You're eligible to request exclusive roles from the following categories:**`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(catLines))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(r => r.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('rr_panel_cat')
                .setPlaceholder('Select a category to request a role')
                .addOptions(
                    CAT_ORDER.map(k => {
                        const def = CATEGORIES[k];
                        return new StringSelectMenuOptionBuilder()
                            .setValue(k)
                            .setLabel(def.label)
                            .setDescription(def.description.slice(0, 100));
                    })
                )
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `-# Developed with passion by Cipher — 密码者  ·  Proudly serving: **${guild.name}** ●`
        ));

    return container;
}

// ── Log card builder ──────────────────────────────────────────────────────────

export function buildLogCard(user, role, catDef, req, guild, disabled = false, decision = null) {
    const container = new ContainerBuilder()
        .setAccentColor(role.color ? [
            (role.color >> 16) & 255,
            (role.color >> 8)  & 255,
            role.color         & 255,
        ] : [29, 155, 240])
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `## ${catDef.emoji} Role Request — **${catDef.label}**`
            ))
            .setThumbnailAccessory(th => th.setURL(
                user.displayAvatarURL({ extension: 'png', size: 128 })
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `**User:** <@${user.id}> (\`${user.username}\`)\n` +
            `**User ID:** \`${user.id}\`\n` +
            `**Role Requested:** ${role} (${role.name})\n` +
            `**Category:** ${catDef.emoji} ${catDef.label}\n` +
            `**Requested:** <t:${Math.floor(new Date(req.requestedAt).getTime() / 1000)}:R>`
        ));

    if (decision) {
        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(t => t.setContent(
                decision.approved
                    ? `✅ **Approved** by <@${decision.decidedBy}> <t:${Math.floor(Date.now() / 1000)}:R>`
                    : `❌ **Rejected** by <@${decision.decidedBy}> <t:${Math.floor(Date.now() / 1000)}:R>` +
                      (decision.reason ? `\n**Reason:** ${decision.reason}` : '')
            ));
        container.addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rr_decided_noop')
                .setLabel(decision.approved ? '✅ Approved' : '❌ Rejected')
                .setStyle(decision.approved ? ButtonStyle.Success : ButtonStyle.Danger)
                .setDisabled(true)
        ));
    } else {
        container.addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId(`rr_ok_${req._id}`)
                .setLabel('✅  Approve')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`rr_no_${req._id}`)
                .setLabel('❌  Reject')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
        ));
    }

    return container;
}

// ── Main router ───────────────────────────────────────────────────────────────

export async function handleRoleRequestInteraction(interaction, client) {
    const cid   = interaction.customId;
    const guild = interaction.guild;
    if (!guild) return;

    // ── Public panel: category select ─────────────────────────────────────────
    if (cid === 'rr_panel_cat') return handleCategorySelect(interaction, client);

    // ── Public panel: role select ─────────────────────────────────────────────
    if (cid === 'rr_panel_role') return handleRoleSelect(interaction, client);

    // ── Setup: admin role select menu responses ────────────────────────────────
    if (cid.startsWith('rr_rolesel_')) return handleAdminRoleSelect(interaction, client);

    // ── Setup: modal submit — channels ────────────────────────────────────────
    if (cid === 'rr_modal_channels') return handleModalChannels(interaction);

    // ── Setup: modal submit — image URL ──────────────────────────────────────
    if (cid === 'rr_modal_image') return handleModalImage(interaction);

    // ── Logs: approve ─────────────────────────────────────────────────────────
    if (cid.startsWith('rr_ok_')) return handleApprove(interaction, client, cid.slice(6));

    // ── Logs: reject (show reason modal) ──────────────────────────────────────
    if (cid.startsWith('rr_no_') && !cid.startsWith('rr_no_reason_'))
        return handleRejectModal(interaction, cid.slice(6));

    // ── Logs: reject modal submit ────────────────────────────────────────────
    if (cid.startsWith('rr_no_reason_')) return handleRejectSubmit(interaction, client, cid.slice(13));
}

// ── Category select handler ───────────────────────────────────────────────────

async function handleCategorySelect(interaction, client) {
    const catKey = interaction.values[0];
    const catDef = CATEGORIES[catKey];
    if (!catDef) return interaction.reply({ content: '> Unknown category.', ephemeral: true });

    const cfg   = await RoleRequestConfig.get(interaction.guild.id);
    if (!cfg.enabled) return interaction.reply({ content: `> ❌ The role request system is currently **disabled**.`, ephemeral: true });

    const roleIds = cfg.categories[catKey]?.roleIds || [];
    if (!roleIds.length) return interaction.reply({ content: `> ❌ No roles are configured for the **${catDef.label}** category yet.`, ephemeral: true });

    // Filter to only roles that still exist in the guild
    const options = [];
    for (const id of roleIds) {
        const role = interaction.guild.roles.cache.get(id) || await interaction.guild.roles.fetch(id).catch(() => null);
        if (role) {
            options.push(new StringSelectMenuOptionBuilder()
                .setValue(`${catKey}:${id}`)
                .setLabel(role.name)
                .setDescription(`Request the ${role.name} role`)
            );
        }
    }

    if (!options.length) return interaction.reply({ content: `> ❌ No valid roles found in the **${catDef.label}** category.`, ephemeral: true });

    await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
            new ContainerBuilder()
                .setAccentColor([29, 155, 240])
                .addTextDisplayComponents(t => t.setContent(
                    `${catDef.emoji} **${catDef.label}**\nChoose the role you'd like to request below.`
                ))
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(r => r.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('rr_panel_role')
                        .setPlaceholder(`Select a ${catDef.label} role…`)
                        .addOptions(options)
                ))
        ],
    });
}

// ── Role select handler ───────────────────────────────────────────────────────

async function handleRoleSelect(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const [catKey, roleId] = interaction.values[0].split(':');
    const catDef = CATEGORIES[catKey];
    const guild  = interaction.guild;

    const cfg = await RoleRequestConfig.get(guild.id);
    if (!cfg.enabled) return interaction.editReply({ content: `> ❌ The role request system is currently disabled.` });
    if (!cfg.logsChannelId)  return interaction.editReply({ content: `> ❌ Logs channel not configured yet. Please contact an administrator.` });

    // Check role exists
    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) return interaction.editReply({ content: `> ❌ This role no longer exists. Please contact an administrator.` });

    const member = interaction.member;

    // Already has role?
    if (member.roles.cache.has(roleId)) {
        return interaction.editReply({ content: `> ❌ You already have the **${role.name}** role!` });
    }

    // Already pending?
    const existing = await RoleRequest.findOne({ guildId: guild.id, userId: interaction.user.id, roleId, status: 'pending' });
    if (existing) {
        return interaction.editReply({ content: `> ⏳ You already have a **pending request** for the **${role.name}** role. Please wait for staff to review it.` });
    }

    // Create request
    const req = await RoleRequest.create({
        guildId:     guild.id,
        userId:      interaction.user.id,
        roleId,
        categoryKey: catKey,
    });

    // Post to logs
    const logsCh = guild.channels.cache.get(cfg.logsChannelId) ||
                   await guild.channels.fetch(cfg.logsChannelId).catch(() => null);
    if (logsCh?.isTextBased()) {
        const card = buildLogCard(interaction.user, role, catDef, req, guild);
        const logMsg = await logsCh.send({
            flags:           MessageFlags.IsComponentsV2,
            components:      [card],
            allowedMentions: { parse: [] },
        }).catch(() => null);

        if (logMsg) {
            req.logMessageId  = logMsg.id;
            req.logChannelId  = logsCh.id;
            await req.save();
        }
    }

    await interaction.editReply({
        content:
            `> ✅ **Your request has been submitted!**\n` +
            `> ${catDef.emoji} Role: **${role.name}**\n` +
            `> ⏳ Staff will review your request. You'll be notified within **30 minutes**.`,
    });
}

// ── Admin role select ─────────────────────────────────────────────────────────

async function handleAdminRoleSelect(interaction, client) {
    const catKey = interaction.customId.replace('rr_rolesel_', '');
    const catDef = CATEGORIES[catKey];
    if (!catDef) return interaction.update({ content: '> Unknown category.', components: [] });

    const roleIds = interaction.values; // array of role IDs
    const cfg = await RoleRequestConfig.get(interaction.guild.id);
    cfg.categories[catKey].roleIds = roleIds;
    cfg.updatedAt = new Date();
    await cfg.save();

    // Resolve role names for confirmation
    const names = [];
    for (const id of roleIds) {
        const role = interaction.guild.roles.cache.get(id) || await interaction.guild.roles.fetch(id).catch(() => null);
        if (role) names.push(role.name);
    }

    await interaction.update({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
            new ContainerBuilder()
                .setAccentColor([29, 155, 240])
                .addTextDisplayComponents(t => t.setContent(
                    `✅ **${catDef.label}** — ${roleIds.length} role(s) saved.\n` +
                    (names.length ? names.map(n => `• **${n}**`).join('\n') : '') +
                    `\n\n-# Click **Refresh Status** on the setup panel to see updated counts.`
                ))
        ],
    });
}

// ── Modal: configure channels ─────────────────────────────────────────────────

async function handleModalChannels(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const rawPanel = interaction.fields.getTextInputValue('rr_panel_ch').trim();
    const rawLogs  = interaction.fields.getTextInputValue('rr_logs_ch').trim();

    const parseId = raw => { const m = raw.match(/^<#(\d+)>$/) || raw.match(/^(\d{17,20})$/); return m?.[1] ?? null; };
    const panelId = parseId(rawPanel);
    const logsId  = parseId(rawLogs);

    if (!panelId || !logsId) return interaction.editReply({ content: '> ❌ Invalid channel. Use a mention (`#channel`) or a numeric ID.' });

    const panelCh = interaction.guild.channels.cache.get(panelId) || await interaction.guild.channels.fetch(panelId).catch(() => null);
    const logsCh  = interaction.guild.channels.cache.get(logsId)  || await interaction.guild.channels.fetch(logsId).catch(() => null);
    if (!panelCh?.isTextBased()) return interaction.editReply({ content: `> ❌ Panel channel \`${panelId}\` not found or is not a text channel.` });
    if (!logsCh?.isTextBased())  return interaction.editReply({ content: `> ❌ Logs channel \`${logsId}\` not found or is not a text channel.` });

    const cfg = await RoleRequestConfig.get(interaction.guild.id);
    cfg.panelChannelId = panelId;
    cfg.logsChannelId  = logsId;
    cfg.updatedAt = new Date();
    await cfg.save();

    await interaction.editReply({
        content:
            `> ✅ **Channels configured!**\n` +
            `> 📌 Panel Channel: <#${panelId}>\n` +
            `> <:14691048134876898091:1522759251573997648> Logs Channel: <#${logsId}>\n` +
            `> -# Click **Refresh** on the setup panel to update the status.`,
    });
}

// ── Modal: set image URL ──────────────────────────────────────────────────────

async function handleModalImage(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const url = interaction.fields.getTextInputValue('rr_image_url').trim();

    const cfg = await RoleRequestConfig.get(interaction.guild.id);
    cfg.animatedImageUrl = url || null;
    cfg.updatedAt = new Date();
    await cfg.save();

    await interaction.editReply({
        content: url
            ? `> ✅ Panel image set!\n> -# It will appear on the next panel deploy.`
            : `> ✅ Panel image cleared — will use guild banner/icon instead.`,
    });
}

// ── Approve handler ───────────────────────────────────────────────────────────

async function handleApprove(interaction, client, reqId) {
    await interaction.deferUpdate();
    const guild = interaction.guild;
    const req   = await RoleRequest.findById(reqId);
    if (!req || req.guildId !== guild.id) return;
    if (req.status !== 'pending') {
        return interaction.followUp({ content: '> ⚠️ This request has already been decided.', ephemeral: true });
    }

    // Give role
    const member = await guild.members.fetch(req.userId).catch(() => null);
    const role   = guild.roles.cache.get(req.roleId) || await guild.roles.fetch(req.roleId).catch(() => null);
    if (!member || !role) {
        // Mark as failed
        req.status     = 'rejected';
        req.decidedAt  = new Date();
        req.decidedBy  = interaction.user.id;
        req.reason     = 'User or role no longer found.';
        await req.save();
        return interaction.followUp({ content: '> ❌ Could not find the member or role in this server.', ephemeral: true });
    }

    await member.roles.add(role).catch(() => null);

    // Update DB
    req.status    = 'approved';
    req.decidedAt = new Date();
    req.decidedBy = interaction.user.id;
    await req.save();

    // Edit log message
    const catDef = CATEGORIES[req.categoryKey] || { emoji: '<a:15278182396090124351:1528064846267158558>', label: req.categoryKey };
    const reqUser = await client.users.fetch(req.userId).catch(() => null);
    if (reqUser) {
        const updatedCard = buildLogCard(reqUser, role, catDef, req, guild, true, {
            approved:  true,
            decidedBy: interaction.user.id,
        });
        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [updatedCard] });
    }

    // DM user
    if (reqUser) {
        reqUser.send({
            content:
                `🎉 **Congratulations, ${reqUser.username}!**\n` +
                `> Your role request for **${role.name}** in **${guild.name}** has been **approved**!\n` +
                `> You have been granted the role. Enjoy! 🎊`,
        }).catch(() => null);
    }
}

// ── Reject: open modal ────────────────────────────────────────────────────────

async function handleRejectModal(interaction, reqId) {
    const req = await RoleRequest.findById(reqId);
    if (!req || req.guildId !== interaction.guild.id) return interaction.deferUpdate();
    if (req.status !== 'pending') {
        return interaction.reply({ content: '> ⚠️ This request has already been decided.', ephemeral: true });
    }

    const modal = new ModalBuilder()
        .setCustomId(`rr_no_reason_${reqId}`)
        .setTitle('❌  Reject Role Request');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('rr_reason')
                .setLabel('Reason for rejection (optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter a reason to send to the user, or leave blank.')
                .setRequired(false)
                .setMaxLength(500)
        )
    );
    await interaction.showModal(modal);
}

// ── Reject: modal submit ──────────────────────────────────────────────────────

async function handleRejectSubmit(interaction, client, reqId) {
    await interaction.deferUpdate();
    const guild  = interaction.guild;
    const req    = await RoleRequest.findById(reqId);
    if (!req || req.guildId !== guild.id) return;
    if (req.status !== 'pending') {
        return interaction.followUp({ content: '> ⚠️ This request has already been decided.', ephemeral: true });
    }

    const reason = interaction.fields.getTextInputValue('rr_reason')?.trim() || null;
    req.status    = 'rejected';
    req.decidedAt = new Date();
    req.decidedBy = interaction.user.id;
    req.reason    = reason;
    await req.save();

    // Edit log message
    const role    = guild.roles.cache.get(req.roleId) || await guild.roles.fetch(req.roleId).catch(() => null);
    const reqUser = await client.users.fetch(req.userId).catch(() => null);
    const catDef  = CATEGORIES[req.categoryKey] || { emoji: '<a:15278182396090124351:1528064846267158558>', label: req.categoryKey };

    if (reqUser && role) {
        const updatedCard = buildLogCard(reqUser, role, catDef, req, guild, true, {
            approved:  false,
            decidedBy: interaction.user.id,
            reason,
        });
        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [updatedCard] });
    }

    // DM user
    if (reqUser) {
        const roleName = role?.name || `Role ID: ${req.roleId}`;
        reqUser.send({
            content:
                `❌ **Role Request Update — ${reqUser.username}**\n` +
                `> Your request for **${roleName}** in **${guild.name}** has been **declined**.\n` +
                (reason ? `> **Reason:** ${reason}\n` : '') +
                `> -# You may request a different role or try again later.`,
        }).catch(() => null);
    }
}
