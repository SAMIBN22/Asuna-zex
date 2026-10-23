import { Events, InteractionType, TextDisplayBuilder, ContainerBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { handleTicketInteraction, handleTicketClose } from '../../handlers/ticketHandler.js';
import { handleStaffApply, handleStaffDecision } from '../../handlers/staffHandler.js';
import { activeLobbies } from '../../lib/lobbyManager.js';
import { handleShopBuy, handleBgSelect } from '../../handlers/shopHandler.js';
import { handleGpInteraction, handleRevokeModal } from '../../handlers/gpHandler.js';
import { handleTweetInteraction }                       from '../../handlers/tweetHandler.js';
import { handleRoleRequestInteraction }                 from '../../handlers/roleRequestHandler.js';
import { handleVoteCast, handleVoteSetupModal }         from '../../handlers/voteHandler.js';
import { handleVipSetupButton, handleVipCreateModal }   from '../../handlers/vipRoomHandler.js';
import { handleRankCfgSelect }                          from '../../commands/prefix/admin/rankroles.js';
import { vcAlertMessages }                              from '../../lib/vcAlertStore.js';
import { handleDatingInteraction, handleDatingModal }   from '../../handlers/datingHandler.js';
import { handleBuilderInteraction, handleBuilderModal } from '../../handlers/builderHandler.js';
import { handleTaysse2Interaction }                      from '../../handlers/taysse2Handler.js';
import config                                             from '../../config/config.js';
import {
    handleOwnerBroadcastInteraction,
    handleOwnerBroadcastModal,
} from '../../functions/ownerBroadcast.js';
import {
    handleSupportSelect,
    handleSupportModal,
} from '../../commands/prefix/utility/support.js';
// handleSelfRolesInteraction is imported dynamically below to support hot-reload

const _divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

async function getThemeWithFallback(userId, guildId, client) {
    const theme = await client.themeManager.getTheme(guildId);
    return theme;
}

function buildErrorContainer(theme, title, description, userAvatar) {
    const avatar = userAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${theme.emojis.title || '☁️'} __${title}__`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(description)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(avatar)
                        .setDescription('User Avatar')
                )
        );

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    };
}

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // Essential check for bot reload stability: prevent duplicate listeners from handling same interaction
        if (interaction.replied || interaction.deferred) return;
        const botName = client.user?.globalName || client.user?.username || 'Discord Bot';
        try {
            if (interaction.type === InteractionType.ApplicationCommand) {
                const command = client.slashCommands.get(interaction.commandName);

                if (!command) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Command Not Found",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Hey there, I don't recognize that command*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Command: \`${interaction.commandName}\` doesn't exist*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Use \`${client.config.prefix}help\` to see all available commands*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Maybe you made a typo?*`,
                        interaction.user.displayAvatarURL());

                    return await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }

                if (!command.execute) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Command Error",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *The command \`${interaction.commandName}\` encountered an error*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Don't worry, I've logged this issue*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Try again in a moment or contact support*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Sometimes even bots have bad days*`,
                        interaction.user.displayAvatarURL());

                    return await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }

                if (command.permissions && !interaction.member.permissions.has(command.permissions)) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Permission Denied",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *You don't have permission to use this command*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Required permissions: \`${command.permissions.join(', ')}\`*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Contact an administrator for help*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *${botName} respects server rules*`,
                        interaction.user.displayAvatarURL());

                    return await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }

                if (command.guildOnly && !interaction.guild) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Guild Only Command",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *This command can only be used in servers*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Join a server to use this command*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *${botName} works best in communities*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Try again in a server channel*`,
                        interaction.user.displayAvatarURL());

                    return await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }

                if (command.ownerOnly && !client.config.devIds?.includes(interaction.user.id)) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Owner Only Command",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *This command is restricted to bot owners*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Only the bot developers can use this*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *${botName} keeps secrets safe*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Contact support if you need help*`,
                        interaction.user.displayAvatarURL());

                    return await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }

                const cooldown = client.cooldowns?.checkCooldown('user', interaction.user.id, interaction.commandName);
                if (cooldown?.onCooldown) {
                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    return interaction.react(theme.emojis.reload || '⏰');
                }

                const startTime = Date.now();
                try {
                    await command.execute(interaction, client);
                    const responseTime = Date.now() - startTime;

                    if (client.cooldowns && command.cooldown) {
                        client.cooldowns.setCooldown('user', interaction.user.id, interaction.commandName, command.cooldown);
                    }
                } catch (error) {
                    const responseTime = Date.now() - startTime;

                    if (!client.webhookLogger) {
                        client.webhookLogger = new WebhookLogger(client);
                    }

                    try {
                        await client.webhookLogger.logError('Slash Command Error', error, interaction.guild?.id || null, {
                            command: interaction.commandName,
                            userId: interaction.user.id,
                            guildName: interaction.guild?.name || 'DM',
                            channelId: interaction.channel?.id || 'DM',
                            interactionId: interaction.id,
                            interactionType: 'ApplicationCommand',
                            responseTime: responseTime
                        });
                    } catch (alertError) {
                        console.error('Failed to send interaction error alert:', alertError);
                    }

                    const theme = await getThemeWithFallback(interaction.user.id, interaction.guild?.id, client);
                    const errorContainer = buildErrorContainer(theme, "Oops! Something Went Wrong",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *The command \`${interaction.commandName}\` encountered an error*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Don't worry, I've logged this issue*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Try again in a moment or contact support*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Sometimes even bots have bad days*`,
                        interaction.user.displayAvatarURL());

                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            ...errorContainer,
                            ephemeral: true
                        });
                    } else if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            ...errorContainer,
                            ephemeral: true
                        });
                    }
                }
            }
            else if (interaction.type === InteractionType.MessageComponent) {
                const cid = interaction.customId;

                // ── Persistent support panel ─────────────────────────────────
                if (cid === 'support_select') {
                    return await handleSupportSelect(interaction);
                }

                // ── Bot-owner broadcast panel ───────────────────────────────
                if (cid?.startsWith('owner_broadcast_')) {
                    return await handleOwnerBroadcastInteraction(interaction, client);
                }

                // ── Ticket panel — open a ticket ──────────────────────────────
                if (cid?.startsWith('ticket_open_') || cid === 'ticket_select_open') {
                    return await handleTicketInteraction(interaction, client);
                }

                // ── Ticket panel — close a ticket ─────────────────────────────
                if (cid?.startsWith('ticket_close_')) {
                    return await handleTicketClose(interaction, client);
                }

                // ── Staff panel — open application ─────────────────────────────
                if (cid?.startsWith('staff_apply_') || cid === 'staff_select_apply') {
                    return await handleStaffApply(interaction, client);
                }

                // ── Staff panel — accept / reject decision ──────────────────────
                if (cid?.startsWith('staff_accept_') || cid?.startsWith('staff_reject_')) {
                    return await handleStaffDecision(interaction, client);
                }

                // ── VIP Room — setup save / cancel ────────────────────────────
                if (cid?.startsWith('vip_setup_save_') || cid?.startsWith('vip_setup_cancel_')) {
                    return await handleVipSetupButton(interaction, client);
                }

                // ── Solo Lobby — limit buttons ────────────────────────────────
                if (cid?.startsWith('lobby_limit_')) {
                    const parts     = cid.split('_');              // lobby_limit_4_channelId
                    const limitVal  = parseInt(parts[2], 10) || 0;
                    const channelId = parts.slice(3).join('_');    // in case channelId has underscores

                    const lobbyData = activeLobbies.get(channelId);

                    if (!lobbyData) {
                        return interaction.reply({ content: '> This lobby no longer exists.', flags: 64 });
                    }
                    if (lobbyData.ownerId !== interaction.user.id) {
                        return interaction.reply({ content: '> Only the lobby owner can change the limit.', flags: 64 });
                    }

                    const voiceChannel = interaction.guild?.channels.cache.get(channelId);
                    if (voiceChannel) await voiceChannel.setUserLimit(limitVal).catch(() => {});

                    const display = limitVal === 0 ? 'Unlimited' : `${limitVal} players`;
                    return interaction.reply({ content: `> <a:15161073033491252751:1522709165607354518> Lobby limit set to **${display}**.`, flags: 64 });
                }

                // ── Shop — buy background ─────────────────────────────────
                if (cid?.startsWith('shop_buy_')) {
                    return await handleShopBuy(interaction, client);
                }

                // ── Profile — select active background ────────────────────
                if (cid?.startsWith('bg_select_')) {
                    return await handleBgSelect(interaction, client);
                }

                // ── GP control panel — appearance & permissions ───────────
                if (cid?.startsWith('gp_panel_')       ||
                    cid?.startsWith('gp_cat_select_')   ||
                    cid?.startsWith('gp_cmd_select_')   ||
                    cid?.startsWith('gp_page_prev_')    ||
                    cid?.startsWith('gp_page_next_')    ||
                    cid?.startsWith('gp_cmd_continue_') ||
                    cid?.startsWith('gp_cmd_backcat_')  ||
                    cid?.startsWith('gp_dur_')          ||
                    cid?.startsWith('gp_revoke_sel_')) {
                    return await handleGpInteraction(interaction, client);
                }

                // ── Tweet system ─────────────────────────────────────────
                if (cid?.startsWith('tweet_setup_') || cid?.startsWith('tweet_panel_') ||
                    cid?.startsWith('tweet_manage_')) {
                    return await handleTweetInteraction(interaction, client);
                }

                // ── Role Request System — public panel + logs ─────────────
                if (cid === 'rr_panel_cat' || cid === 'rr_panel_role' ||
                    cid?.startsWith('rr_rolesel_') || cid?.startsWith('rr_ok_') ||
                    cid?.startsWith('rr_no_')) {
                    return await handleRoleRequestInteraction(interaction, client);
                }

                // ── Rank Role Config — ephemeral select menus ─────────────
                // These interactions come from ephemeral replies sent by the
                // &rankroles panel, so they never reach sent's collector.
                // Each custom ID encodes the panel sentId so handleRankCfgSelect()
                // can look up the right session and refresh the correct panel.
                //   rankcfg_roleselect_{sentId}_{flowId}
                //   rankcfg_del_{sentId}
                //   rankcfg_pub_{sentId}
                if (cid?.startsWith('rankcfg_roleselect_') ||
                    cid?.startsWith('rankcfg_del_') ||
                    cid?.startsWith('rankcfg_pub_') ||
                    cid?.startsWith('rankcfg_chan_')) {
                    return await handleRankCfgSelect(interaction, client);
                }

                // ── VC Alert — Send Message to VC button ──────────────────────
                if (cid?.startsWith('vca_msg_')) {
                    // Format: vca_msg_{guildId}_{channelId}_{memberId}
                    const parts    = cid.split('_');   // ['vca','msg',guildId,channelId,memberId]
                    const guildId  = parts[2];
                    const chanId   = parts[3];
                    const memberId = parts[4];

                    // Check there is still an active alert for this member
                    const trackKey = `${guildId}:${chanId}:${memberId}`;
                    if (!vcAlertMessages.has(trackKey)) {
                        return interaction.reply({
                            flags:      MessageFlags.Ephemeral,
                            content:    '> ⚠️  This member has already left the voice channel.',
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`vca_msg_modal_${guildId}_${chanId}_${memberId}`)
                        .setTitle('Send Message to Voice Channel')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('vca_vc_text')
                                    .setLabel('Message')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder('Type your message here — it will appear in the voice channel chat.')
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            )
                        );

                    return interaction.showModal(modal);
                }

                // Handle button interactions, select menus, etc.
                if (client.panelManager) {
                    await client.panelManager.handlePanelInteraction(interaction);
                }

                // ── Container Builder ─────────────────────────────────────
                if (cid?.startsWith('bldr_')) {
                    return await handleBuilderInteraction(interaction, client);
                }

                // ── 𝐀𝐬𝐮𝐧𝐚Cord Dating panel ────────────────────────────────
                if (cid?.startsWith('dating_')) {
                    return await handleDatingInteraction(interaction, client);
                }

                // ── Smart Automation (taysse2) panel ──────────────────────
                if (cid?.startsWith('taysse2_')) {
                    return await handleTaysse2Interaction(interaction, client);
                }

                // Handle self roles interactions (dynamic import for hot-reload support)
                if (
                    cid?.startsWith('selfroles_category') ||
                    cid?.startsWith('selfroles_role_select_') ||
                    cid?.startsWith('selfrole_')
                ) {
                    const { handleSelfRolesInteraction } = await import(`../../handlers/selfRolesHandler.js?t=${Date.now()}`);
                    await handleSelfRolesInteraction(interaction, client);
                }
            }
            else if (interaction.type === InteractionType.ModalSubmit) {
                const mcid = interaction.customId;

                // ── Persistent support forms ─────────────────────────────────
                if (mcid?.startsWith('support_bug_') || mcid?.startsWith('support_premium_')) {
                    return await handleSupportModal(interaction, client);
                }

                // ── Bot-owner broadcast feedback and compose modals ─────────
                if (mcid?.startsWith('owner_broadcast_')) {
                    return await handleOwnerBroadcastModal(interaction, client);
                }

                // ── GP modals ─────────────────────────────────────────────
                if (mcid === 'gp_modal_avatar' || mcid === 'gp_modal_banner' ||
                    mcid === 'gp_modal_nick'   || mcid === 'gp_modal_grant'  ||
                    mcid === 'gp_modal_dur') {
                    return await handleGpInteraction(interaction, client);
                }
                if (mcid === 'gp_modal_revoke') {
                    return await handleRevokeModal(interaction, client);
                }

                // ── Tweet modals ──────────────────────────────────────────
                if (mcid === 'tweet_modal_configure' || mcid === 'tweet_modal_dark' || mcid === 'tweet_modal_light') {
                    return await handleTweetInteraction(interaction, client);
                }

                // ── Role Request modals ───────────────────────────────────
                if (mcid === 'rr_modal_channels' || mcid === 'rr_modal_image' ||
                    mcid?.startsWith('rr_no_reason_')) {
                    return await handleRoleRequestInteraction(interaction, client);
                }

                // ── VIP Room — create modal ────────────────────────────────
                if (mcid === 'vip_create_modal') {
                    return await handleVipCreateModal(interaction, client);
                }

                // ── Container Builder modals ──────────────────────────────
                if (mcid?.startsWith('bldr_modal_')) {
                    return await handleBuilderModal(interaction, client);
                }

                // ── 𝐀𝐬𝐮𝐧𝐚Cord Dating modals ───────────────────────────────
                if (mcid === 'dating_profile_modal' || mcid === 'dating_picture_modal' ||
                    mcid === 'dating_thread_modal_dark' || mcid === 'dating_thread_modal_light') {
                    return await handleDatingModal(interaction, client);
                }

                // ── Smart Automation (taysse2) modals ────────────────────
                if (mcid?.startsWith('taysse2_modal_')) {
                    return await handleTaysse2Interaction(interaction, client);
                }

                // ── VC Alert — staff message modal ────────────────────────
                if (mcid?.startsWith('vca_msg_modal_')) {
                    // Format: vca_msg_modal_{guildId}_{channelId}_{memberId}
                    const parts    = mcid.split('_');  // ['vca','msg','modal',guildId,channelId,memberId]
                    const guildId  = parts[3];
                    const chanId   = parts[4];
                    const memberId = parts[5];
                    const trackKey = `${guildId}:${chanId}:${memberId}`;

                    const tracked = vcAlertMessages.get(trackKey);
                    if (!tracked) {
                        return interaction.reply({
                            flags:   MessageFlags.Ephemeral,
                            content: '> ⚠️  This member has already left the voice channel. Your message was not sent.',
                        });
                    }

                    const text         = interaction.fields.getTextInputValue('vca_vc_text').trim();
                    const guild        = interaction.guild;
                    const voiceChannel = guild?.channels.cache.get(chanId);

                    if (!voiceChannel?.isTextBased()) {
                        return interaction.reply({
                            flags:   MessageFlags.Ephemeral,
                            content: '> ⚠️  Could not find the voice channel. The message was not sent.',
                        });
                    }

                    // Fetch the member to display their avatar + name
                    const targetMember = await guild.members.fetch(memberId).catch(() => null);
                    const avatarUrl    = targetMember
                        ? targetMember.user.displayAvatarURL({ dynamic: true })
                        : 'https://cdn.discordapp.com/embed/avatars/0.png';
                    const displayName  = targetMember?.displayName || `<@${memberId}>`;

                    const theme      = await client.themeManager.getTheme(guildId).catch(() => ({ color: 0x5865F2 }));
                    const themeColor = Number(theme.color) || 0x5865F2;

                    // Build the styled message shown in the VC chat
                    const vcContainer = new ContainerBuilder().setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## 📨  Staff Message\n` +
                                        `> **To:** ${displayName}\n` +
                                        `> **From:** ${interaction.member?.displayName || interaction.user.username}`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(avatarUrl)
                                )
                        )
                        .addSeparatorComponents(_divS())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${text}`)
                        )
                        .addSeparatorComponents(_divS());

                    const vcMsg = await voiceChannel.send({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [vcContainer],
                    }).catch(() => null);

                    // Store the VC message ID so it can be deleted when the member leaves
                    if (vcMsg) {
                        tracked.vcMsgId = vcMsg.id;
                        vcAlertMessages.set(trackKey, tracked);
                    }

                    // Acknowledge the modal — ephemeral confirmation to the staff member
                    return interaction.reply({
                        flags:   MessageFlags.Ephemeral,
                        content: `> ✅  Your message was sent to <#${chanId}>.`,
                    });
                }

                // Handle modal submissions
                if (client.panelManager) {
                    await client.panelManager.handlePanelInteraction(interaction);
                }
            }
            else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                const command = client.slashCommands.get(interaction.commandName);

                if (command && command.autocomplete) {
                    try {
                        await command.autocomplete(interaction, client);
                    } catch (error) {
                        if (!client.webhookLogger) {
                            client.webhookLogger = new WebhookLogger(client);
                        }

                        try {
                            await client.webhookLogger.logError('Autocomplete Error', error, interaction.guild?.id || null, {
                                command: interaction.commandName,
                                userId: interaction.user.id,
                                guildName: interaction.guild?.name || 'DM',
                                channelId: interaction.channel?.id || 'DM',
                                interactionId: interaction.id,
                                interactionType: 'ApplicationCommandAutocomplete'
                            });
                        } catch (alertError) {
                            console.error('Failed to send autocomplete error alert:', alertError);
                        }
                    }
                }
            }

        } catch (error) {
            if (!client.webhookLogger) {
                client.webhookLogger = new WebhookLogger(client);
            }

            try {
                await client.webhookLogger.logError('Interaction Error', error, interaction.guild?.id || null, {
                    userId: interaction.user?.id || 'Unknown',
                    guildName: interaction.guild?.name || 'DM',
                    channelId: interaction.channel?.id || 'DM',
                    interactionId: interaction.id,
                    interactionType: interaction.type
                });
            } catch (alertError) {
                console.error('Failed to send interaction error alert:', alertError);
            }

            try {
                const theme = await getThemeWithFallback(interaction.user?.id, interaction.guild?.id, client);

                if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                    const errorContainer = buildErrorContainer(theme, "Unexpected Error",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *An unexpected error occurred*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *The dev has been alerted and will fix it soon*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *${botName} is working on it*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Try again in a moment*`,
                        interaction.user?.displayAvatarURL());

                    await interaction.reply({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                } else if (interaction.replied || interaction.deferred) {
                    const errorContainer = buildErrorContainer(theme, "Unexpected Error",
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *An unexpected error occurred*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *The dev has been alerted and will fix it soon*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *${botName} is working on it*\n` +
                        `${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} *Try again in a moment*`,
                        interaction.user?.displayAvatarURL());

                    await interaction.followUp({
                        ...errorContainer,
                        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                    });
                }
            } catch (followUpError) {
                if (!followUpError.message?.includes('already been acknowledged')) {
                    console.error('Error sending error message:', followUpError);
                }
            }
        }
    }
};
