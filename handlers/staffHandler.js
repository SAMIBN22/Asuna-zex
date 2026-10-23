// ─── Staff Application Handler ────────────────────────────────────────────────
// Handles staff_apply_* (buttons) and staff_select_apply (select menu) on the
// public panel, plus the modal submission that forwards the application to logs.

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../models/guildConfig.js';

// ─── Separator helpers ─────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Cooldown: one pending application per user per guild (5 min) ─────────────
const _applying = new Map(); // `${guildId}:${userId}` → true (modal open)

// ─── Entry point for button / select interactions ─────────────────────────────
export async function handleStaffApply(interaction, client) {
    const { customId, guild, user } = interaction;
    if (!guild) return;

    // Determine position index
    let posIndex = null;
    if (customId.startsWith('staff_apply_')) {
        posIndex = parseInt(customId.replace('staff_apply_', ''), 10);
    } else if (customId === 'staff_select_apply') {
        const val = interaction.values?.[0] ?? '';
        posIndex  = parseInt(val.replace('staff_pos_', ''), 10);
    }
    if (posIndex === null || isNaN(posIndex)) return;

    // Load config to get position label
    const config  = await GuildConfig.findOne({ guildId: guild.id });
    const buttons = config?.staffConfig?.buttons || [];
    const pos     = buttons[posIndex];
    const posLabel = pos?.label || `Position ${posIndex + 1}`;
    const posEmoji = pos?.emoji || '🌟';

    // Race guard – prevent double modal
    const lockKey = `${guild.id}:${user.id}`;
    if (_applying.get(lockKey)) {
        return interaction.reply({
            content:   '⏳ You already have an application form open — please complete or dismiss it first.',
            flags:     MessageFlags.Ephemeral
        }).catch(() => {});
    }
    _applying.set(lockKey, true);

    // Build the Staff Application modal (max 5 fields)
    // Discord enforces a 45-character limit on modal titles — truncate if needed.
    const rawTitle = `${posEmoji} ${posLabel} — Application`;
    const safeTitle = rawTitle.length > 45 ? rawTitle.slice(0, 42) + '...' : rawTitle;
    const modal = new ModalBuilder()
        .setCustomId(`staff_modal_${guild.id}_${posIndex}`)
        .setTitle(safeTitle)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('full_name')
                    .setLabel('Full Name')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Your name')
                    .setRequired(true)
                    .setMaxLength(80)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('age')
                    .setLabel('Age')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('18')
                    .setRequired(true)
                    .setMaxLength(3)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('experience')
                    .setLabel('Staff Team Experience')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Tell us about your relevant experience…')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('motivation')
                    .setLabel('Why do you want this position?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Why do you want to join the staff team?')
                    .setRequired(true)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('availability')
                    .setLabel('Daily Availability Hours')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('5-8 hours')
                    .setRequired(true)
                    .setMaxLength(50)
            )
        );

    try {
        await interaction.showModal(modal);
    } catch {
        _applying.delete(lockKey);
        return;
    }

    // Wait for submission
    const submitted = await interaction.awaitModalSubmit({
        filter: i => i.user.id === user.id && i.customId === `staff_modal_${guild.id}_${posIndex}`,
        time:   300_000 // 5 minutes to fill
    }).catch(() => null);

    _applying.delete(lockKey);

    if (!submitted) return; // dismissed or timed out

    // ── Extract answers ────────────────────────────────────────────────────────
    const fullName     = submitted.fields.getTextInputValue('full_name').trim();
    const age          = submitted.fields.getTextInputValue('age').trim();
    const experience   = submitted.fields.getTextInputValue('experience').trim();
    const motivation   = submitted.fields.getTextInputValue('motivation').trim();
    const availability = submitted.fields.getTextInputValue('availability').trim();

    // ── Confirm to applicant (ephemeral) ───────────────────────────────────────
    const theme      = await client.themeManager.getTheme(guild.id);
    const themeColor = Number(theme.color) || 0x5865F2;
    const thumb      = guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();

    const confirmContainer = new ContainerBuilder().setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ✅  Application Submitted!\n` +
                        `> Your application for **${posEmoji} ${posLabel}** in **${guild.name}** has been received.\n` +
                        `> Our staff team will review it and get back to you as soon as possible.\n` +
                        `> -# Thank you for your interest in joining the team! 💝`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        );

    await submitted.reply({
        flags:      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [confirmContainer]
    }).catch(() => {});

    // ── Forward to logs channel ────────────────────────────────────────────────
    const logsChId = config?.staffConfig?.logsChannelId;
    if (logsChId) {
        const logsChannel = guild.channels.cache.get(logsChId);
        if (logsChannel?.isTextBased()) {
            // Encode: staff_accept_{userId}_{posIndex}  /  staff_reject_{userId}_{posIndex}
            const acceptId = `staff_accept_${user.id}_${posIndex}`;
            const rejectId = `staff_reject_${user.id}_${posIndex}`;

            const logContainer = new ContainerBuilder().setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## 📨  New Staff Application\n` +
                                `> **Position:** ${posEmoji} ${posLabel}\n` +
                                `> **Applicant:** <@${user.id}> (\`${user.tag}\`)\n` +
                                `> **Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true }))
                        )
                )
                .addSeparatorComponents(divS())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### <:14691048134876898091:1522759251573997648>  Application Details\n` +
                        `**Full Name**\n> ${fullName}\n\n` +
                        `**Age**\n> ${age}\n\n` +
                        `**Staff Experience**\n> ${experience.replace(/\n/g, '\n> ')}\n\n` +
                        `**Why This Position?**\n> ${motivation.replace(/\n/g, '\n> ')}\n\n` +
                        `**Daily Availability**\n> ${availability}`
                    )
                )
                .addSeparatorComponents(divS())
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(acceptId)
                            .setLabel('✅  Accept')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(rejectId)
                            .setLabel('❌  Reject')
                            .setStyle(ButtonStyle.Danger)
                    )
                )
                .addSeparatorComponents(div());

            await logsChannel.send({
                flags:      MessageFlags.IsComponentsV2,
                components: [logContainer]
            }).catch(err => console.error('[StaffHandler] Failed to send log:', err));
        }
    }
}

// ─── Entry point for Accept / Reject decisions ────────────────────────────────
export async function handleStaffDecision(interaction, client) {
    const { customId, guild, member } = interaction;
    if (!guild) return;

    // Only admins may accept / reject
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            flags:   MessageFlags.Ephemeral,
            content: '🔒 Only administrators can accept or reject applications.'
        }).catch(() => {});
    }

    const isAccept = customId.startsWith('staff_accept_');
    const parts    = customId.replace(isAccept ? 'staff_accept_' : 'staff_reject_', '').split('_');
    const userId   = parts[0];
    const posIndex = parseInt(parts[1], 10);

    const config   = await GuildConfig.findOne({ guildId: guild.id });
    const buttons  = config?.staffConfig?.buttons || [];
    const pos      = buttons[posIndex];
    const posLabel = pos?.label  || `Position ${posIndex + 1}`;
    const posEmoji = pos?.emoji  || '🌟';
    const roleId   = pos?.roleId || null;

    const theme      = await client.themeManager.getTheme(guild.id);
    const themeColor = Number(theme.color) || 0x5865F2;

    await interaction.deferUpdate().catch(() => {});

    // ── Fetch the applicant member ─────────────────────────────────────────────
    const applicantMember = await guild.members.fetch(userId).catch(() => null);

    if (isAccept) {
        // Give role if configured
        let roleGiven = false;
        if (roleId && applicantMember) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await applicantMember.roles.add(role, `Staff application accepted — ${posLabel}`).catch(() => {});
                roleGiven = true;
            }
        }

        // DM the applicant
        if (applicantMember) {
            const dmContainer = new ContainerBuilder().setAccentColor(0x57F287)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## 🎉  Congratulations!\n` +
                                `> Your application for **${posEmoji} ${posLabel}** in **${guild.name}** has been **accepted**.\n` +
                                `> Welcome to the staff team! We're excited to have you on board.\n` +
                                `> -# A role has been assigned to you automatically.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                        )
                );
            await applicantMember.send({
                flags:      MessageFlags.IsComponentsV2,
                components: [dmContainer]
            }).catch(() => {});
        }

        // Edit the log message — show accepted state with disabled buttons
        const updatedContainer = new ContainerBuilder().setAccentColor(0x57F287)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ✅  Application Accepted\n` +
                            `> **Position:** ${posEmoji} ${posLabel}\n` +
                            `> **Applicant:** <@${userId}>\n` +
                            `> **Reviewed by:** <@${interaction.user.id}>\n` +
                            `> **Role Assigned:** ${roleGiven ? `<@&${roleId}>` : '`No role configured`'}`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(
                            applicantMember?.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL()
                        )
                    )
            )
            .addSeparatorComponents(divS())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('staff_noop_accept')
                        .setLabel('✅  Accepted')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('staff_noop_reject')
                        .setLabel('❌  Reject')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                )
            )
            .addSeparatorComponents(div());

        await interaction.message.edit({
            flags:      MessageFlags.IsComponentsV2,
            components: [updatedContainer]
        }).catch(() => {});

    } else {
        // ── Reject ─────────────────────────────────────────────────────────────

        // DM the applicant
        if (applicantMember) {
            const dmContainer = new ContainerBuilder().setAccentColor(0xED4245)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ❌  Application Update\n` +
                                `> Your application for **${posEmoji} ${posLabel}** in **${guild.name}** has not been accepted at this time.\n` +
                                `> We appreciate your interest and encourage you to apply again in the future.\n` +
                                `> -# Thank you for taking the time to apply.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                        )
                );
            await applicantMember.send({
                flags:      MessageFlags.IsComponentsV2,
                components: [dmContainer]
            }).catch(() => {});
        }

        // Edit the log message — show rejected state with disabled buttons
        const updatedContainer = new ContainerBuilder().setAccentColor(0xED4245)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ❌  Application Rejected\n` +
                            `> **Position:** ${posEmoji} ${posLabel}\n` +
                            `> **Applicant:** <@${userId}>\n` +
                            `> **Reviewed by:** <@${interaction.user.id}>`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(
                            applicantMember?.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL()
                        )
                    )
            )
            .addSeparatorComponents(divS())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('staff_noop_accept')
                        .setLabel('✅  Accept')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('staff_noop_reject')
                        .setLabel('❌  Rejected')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                )
            )
            .addSeparatorComponents(div());

        await interaction.message.edit({
            flags:      MessageFlags.IsComponentsV2,
            components: [updatedContainer]
        }).catch(() => {});
    }
}
