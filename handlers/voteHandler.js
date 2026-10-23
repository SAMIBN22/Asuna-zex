/**
 * voteHandler.js
 * Handles all interactions for the &vote system:
 *   vote_modal_*   → setup modals submitted by the admin (global IC)
 *   vote_cast_*    → vote buttons clicked by members (global IC)
 *
 * Also exports helpers used by the vote.js command.
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
    MessageFlags,
    PermissionsBitField,
} from 'discord.js';
import VoteSession from '../models/voteSession.js';
import config      from '../config/config.js';

const OWNER_IDS   = (config.devIds || []).map(String);
const activeTimers = new Map(); // sessionId -> timeoutId

// ── In-progress setup state (per admin userId, in-memory) ────────────────────
// Shape: { guildId, contestants[{userId,username,displayName,avatarUrl}],
//          channelId, durationMinutes, setupMessage }
export const pendingSetups = new Map();

// ── Permission check ──────────────────────────────────────────────────────────
export function hasVoteAccess(member) {
    if (!member) return false;
    if (OWNER_IDS.includes(String(member.user.id))) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// ── Build admin setup panel ───────────────────────────────────────────────────
export function buildVoteSetupPanel(setup, guild, theme) {
    const accent = theme?.color ?? 0x5865F2;

    const contestantLines = setup.contestants.length === 0
        ? '> *No contestants yet — click **Add Contestant** to begin.*'
        : setup.contestants
              .map((c, i) => `> **${i + 1}.** ${c.displayName} (@${c.username})`)
              .join('\n');

    const channelText  = setup.channelId ? `<#${setup.channelId}>` : '`Not set`';
    const durationText = `${setup.durationMinutes} minute${setup.durationMinutes !== 1 ? 's' : ''}`;

    const container = new ContainerBuilder()
        .setAccentColor(accent)
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `## <a:efef:1528077605688049664> __Vote Session Setup__\n` +
                `> Configure contestants, channel, and duration for **${guild.name}**.`
            ))
            .setThumbnailAccessory(th => th.setURL(
                guild.iconURL({ extension: 'png', size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `**<:14691048134876898091:1522759251573997648> Contestants (${setup.contestants.length}/20):**\n${contestantLines}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `📢 **Channel:** ${channelText}\n` +
            `⏱️ **Duration:** ${durationText}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('vote_setup_add').setLabel('Add Contestant').setEmoji('👓').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vote_setup_remove').setLabel('Remove').setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('vote_setup_channel').setLabel('Set Channel').setEmoji('📢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vote_setup_duration').setLabel('Duration').setEmoji('⏱️').setStyle(ButtonStyle.Secondary),
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('vote_setup_deploy').setLabel('Deploy').setEmoji('🚀').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('vote_setup_cancel').setLabel('Cancel').setEmoji('✖️').setStyle(ButtonStyle.Danger),
        ));

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

// ── Build public vote panel ───────────────────────────────────────────────────
export function buildVotePanel(session) {
    const endTs      = Math.floor(session.endsAt.getTime() / 1000);
    const totalVotes = session.contestants.reduce((s, c) => s + c.votes, 0);

    const container = new ContainerBuilder()
        .setAccentColor(0xFF4DAC)
        .addTextDisplayComponents(t => t.setContent(
            `## <a:efef:1528077605688049664> __Community Vote__\n` +
            `> Cast your vote below — each member gets **one vote**.\n` +
            `> 📊 **${totalVotes}** vote${totalVotes !== 1 ? 's' : ''} cast so far`
        ))
        .addSeparatorComponents(new SeparatorBuilder());

    session.contestants.forEach((c, i) => {
        container
            .addSectionComponents(s => s
                .addTextDisplayComponents(t => t.setContent(
                    `**${i + 1}. ${c.displayName}**\n` +
                    `> @${c.username}  ·  👓 **${c.votes}** vote${c.votes !== 1 ? 's' : ''}`
                ))
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId(`vote_cast_${session._id}_${c.userId}`)
                        .setLabel('Vote')
                        .setEmoji('👓')
                        .setStyle(ButtonStyle.Primary)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder());
    });

    container.addTextDisplayComponents(t => t.setContent(
        `⏰ Voting ends <t:${endTs}:R>\n` +
        `💡 *One vote per person · Contestants cannot vote*`
    ));

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

// ── Build winner announcement ─────────────────────────────────────────────────
function buildWinnerAnnouncement(winner, session) {
    const totalVotes = session.contestants.reduce((s, c) => s + c.votes, 0);
    const endTs      = Math.floor(Date.now() / 1000);

    const container = new ContainerBuilder()
        .setAccentColor(0xFFD700)
        .addTextDisplayComponents(t => t.setContent(
            `## 🏆 __Voting Has Ended!__\n` +
            `> The community has spoken — here is your winner!`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `# 🎉 ${winner.displayName}\n` +
                `> @${winner.username}\n` +
                `> 👓 **${winner.votes}** vote${winner.votes !== 1 ? 's' : ''} received\n` +
                `> 📊 Out of **${totalVotes}** total vote${totalVotes !== 1 ? 's' : ''}\n` +
                `> ✅ Results finalized <t:${endTs}:R>`
            ))
            .setThumbnailAccessory(th => th.setURL(
                winner.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `> Thank you to all **${session.voterIds.length}** member${session.voterIds.length !== 1 ? 's' : ''}` +
            ` who participated! 🎊`
        ));

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

// ── End a vote session ────────────────────────────────────────────────────────
async function endVoteSession(session, client) {
    try {
        // Re-fetch fresh data in case votes came in after the session object was cached
        const fresh = await VoteSession.findById(session._id);
        if (!fresh || fresh.ended) return;

        await VoteSession.updateOne({ _id: fresh._id }, { ended: true });
        activeTimers.delete(fresh._id.toString());

        // Find winner (highest votes; ties go to earlier contestant)
        const winner = fresh.contestants.reduce(
            (best, c) => c.votes > best.votes ? c : best,
            fresh.contestants[0]
        );
        if (!winner) return;

        const channel = client.channels.cache.get(fresh.panelChannelId) ||
            await client.channels.fetch(fresh.panelChannelId).catch(() => null);
        if (!channel) return;

        // Delete panel message
        try {
            const panelMsg = await channel.messages.fetch(fresh.panelMessageId);
            await panelMsg.delete();
        } catch { /* already deleted or not found */ }

        // Post winner announcement
        await channel.send(buildWinnerAnnouncement(winner, fresh));
    } catch (err) {
        console.error('[VoteHandler] Error ending session:', err);
    }
}

// ── Schedule a session end ────────────────────────────────────────────────────
export function scheduleVoteEnd(session, client) {
    const delay = session.endsAt.getTime() - Date.now();
    if (delay <= 0) { endVoteSession(session, client); return; }
    const timer = setTimeout(() => endVoteSession(session, client), delay);
    activeTimers.set(session._id.toString(), timer);
}

// ── Restore scheduler on bot ready ───────────────────────────────────────────
export async function initVoteScheduler(client) {
    try {
        const now    = new Date();
        const active  = await VoteSession.find({ ended: false, endsAt: { $gt: now } });
        const expired = await VoteSession.find({ ended: false, endsAt: { $lte: now } });
        for (const s of active)  scheduleVoteEnd(s, client);
        for (const s of expired) endVoteSession(s, client);
        if (active.length + expired.length > 0) {
            console.log(`[VoteScheduler] Restored ${active.length} active, processed ${expired.length} expired.`);
        }
    } catch (err) {
        console.error('[VoteScheduler] Init error:', err);
    }
}

// ── Handle vote_modal_* (global IC → here) ────────────────────────────────────
export async function handleVoteSetupModal(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const setup = pendingSetups.get(interaction.user.id);
    if (!setup) {
        return interaction.editReply({ content: '❌ Your setup session has expired. Run `&vote` again.' });
    }

    const guild  = interaction.guild;
    const theme  = await client.themeManager.getTheme(guild.id);
    const cid    = interaction.customId;

    // ── Add contestant ────────────────────────────────────────────────────────
    if (cid === 'vote_modal_add') {
        if (setup.contestants.length >= 20) {
            return interaction.editReply({ content: '❌ Maximum of 20 contestants allowed.' });
        }
        const raw    = interaction.fields.getTextInputValue('contestant_id').trim();
        const userId = raw.replace(/[<@!>]/g, '');

        let member;
        try { member = await guild.members.fetch(userId); }
        catch { return interaction.editReply({ content: `❌ Could not find user \`${raw}\` in this server.` }); }

        if (setup.contestants.some(c => c.userId === member.user.id)) {
            return interaction.editReply({ content: `❌ **${member.displayName}** is already in the list.` });
        }

        setup.contestants.push({
            userId:      member.user.id,
            username:    member.user.username,
            displayName: member.displayName,
            avatarUrl:   member.user.displayAvatarURL({ size: 256, extension: 'png', forceStatic: true }),
        });

        if (setup.setupMessage) await setup.setupMessage.edit(buildVoteSetupPanel(setup, guild, theme)).catch(() => {});
        return interaction.editReply({ content: `✅ Added **${member.displayName}** to the contestant list.` });
    }

    // ── Remove contestant ─────────────────────────────────────────────────────
    if (cid === 'vote_modal_remove') {
        if (setup.contestants.length === 0) {
            return interaction.editReply({ content: '❌ There are no contestants to remove.' });
        }
        const raw = interaction.fields.getTextInputValue('remove_index').trim();
        const idx = parseInt(raw, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= setup.contestants.length) {
            return interaction.editReply({ content: `❌ Enter a number between 1 and ${setup.contestants.length}.` });
        }
        const removed = setup.contestants.splice(idx, 1)[0];
        if (setup.setupMessage) await setup.setupMessage.edit(buildVoteSetupPanel(setup, guild, theme)).catch(() => {});
        return interaction.editReply({ content: `✅ Removed **${removed.displayName}** from the list.` });
    }

    // ── Set channel ───────────────────────────────────────────────────────────
    if (cid === 'vote_modal_channel') {
        const raw  = interaction.fields.getTextInputValue('channel_id').trim();
        const chId = raw.replace(/[<#>]/g, '');
        const ch   = guild.channels.cache.get(chId);
        if (!ch || !ch.isTextBased()) {
            return interaction.editReply({ content: `❌ Could not find a text channel from \`${raw}\`.` });
        }
        setup.channelId = ch.id;
        if (setup.setupMessage) await setup.setupMessage.edit(buildVoteSetupPanel(setup, guild, theme)).catch(() => {});
        return interaction.editReply({ content: `✅ Vote panel will be posted in ${ch}.` });
    }

    // ── Set duration ──────────────────────────────────────────────────────────
    if (cid === 'vote_modal_duration') {
        const raw  = interaction.fields.getTextInputValue('minutes').trim();
        const mins = parseInt(raw, 10);
        if (isNaN(mins) || mins < 1 || mins > 10080) {
            return interaction.editReply({ content: '❌ Enter a number of minutes between 1 and 10080.' });
        }
        setup.durationMinutes = mins;
        if (setup.setupMessage) await setup.setupMessage.edit(buildVoteSetupPanel(setup, guild, theme)).catch(() => {});
        return interaction.editReply({ content: `✅ Duration set to **${mins} minute${mins !== 1 ? 's' : ''}**.` });
    }

    return interaction.editReply({ content: '❌ Unknown modal.' });
}

// ── Handle vote_cast_* (global IC → here) ─────────────────────────────────────
export async function handleVoteCast(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // customId: vote_cast_{sessionId}_{contestantUserId}
    // sessionId = 24-char ObjectId hex; userId = numeric snowflake — no underscores in either
    const parts        = interaction.customId.split('_');
    const sessionId    = parts[2];
    const contestantId = parts[3];
    const voterId      = interaction.user.id;

    const session = await VoteSession.findById(sessionId).catch(() => null);

    if (!session || session.ended) {
        return interaction.editReply({ content: '🔒 This vote session has already ended.' });
    }
    if (session.endsAt < new Date()) {
        return interaction.editReply({ content: '⏰ Voting time has expired for this session.' });
    }

    // Contestants cannot vote
    if (session.contestants.some(c => c.userId === voterId)) {
        return interaction.editReply({ content: '🚫 Contestants are not allowed to vote in their own session.' });
    }

    // One vote per person
    if (session.voterIds.includes(voterId)) {
        return interaction.editReply({ content: '✋ You have already voted in this session. Only one vote per person is allowed.' });
    }

    // Find the target contestant
    const contestantIdx = session.contestants.findIndex(c => c.userId === contestantId);
    if (contestantIdx === -1) {
        return interaction.editReply({ content: '❌ That contestant no longer exists in this session.' });
    }

    // Record vote atomically via DB update
    await VoteSession.updateOne(
        { _id: session._id },
        {
            $inc: { [`contestants.${contestantIdx}.votes`]: 1 },
            $push: { voterIds: voterId },
        }
    );

    // Refresh session for panel rebuild
    const fresh = await VoteSession.findById(sessionId);

    // Update the panel message
    try {
        const channel = client.channels.cache.get(fresh.panelChannelId) ||
            await client.channels.fetch(fresh.panelChannelId).catch(() => null);
        if (channel && fresh.panelMessageId) {
            const panelMsg = await channel.messages.fetch(fresh.panelMessageId);
            await panelMsg.edit(buildVotePanel(fresh));
        }
    } catch { /* ignore panel update failures */ }

    const target = fresh.contestants[contestantIdx];
    return interaction.editReply({
        content: `✅ Your vote for **${target.displayName}** has been recorded! Good luck to them 🎉`,
    });
}
