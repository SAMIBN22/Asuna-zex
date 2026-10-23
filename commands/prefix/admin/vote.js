/**
 * &vote — Create a community vote session with contestants and a countdown timer.
 * Restricted to: Server Owner, Administrator.
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    PermissionsBitField,
} from 'discord.js';
import VoteSession from '../../../models/voteSession.js';
import {
    pendingSetups,
    hasVoteAccess,
    buildVoteSetupPanel,
    buildVotePanel,
    scheduleVoteEnd,
} from '../../../handlers/voteHandler.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

export default {
    name:        'vote',
    aliases:     ['createvote', 'startvote', 'votesession'],
    description: 'Create a community vote session with contestants and an automatic winner announcement',
    category:    'Admin',
    usage:       '&vote',
    guildOnly:   true,

    async execute(message, args, client) {
        const theme  = await client.themeManager.getTheme(message.guild.id);
        const accent = theme.color ?? 0x5865F2;

        // ── Permission check ───────────────────────────────────────────────────
        if (!OWNER_IDS.includes(message.author.id) && !hasVoteAccess(message.member)) {
            const container = new ContainerBuilder()
                .setAccentColor(accent)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  __Access Denied__\n` +
                        `> This command is restricted to **Administrators** only.`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // ── Initialise setup state ─────────────────────────────────────────────
        const setup = {
            guildId:         message.guild.id,
            contestants:     [],
            channelId:       null,
            durationMinutes: 5,
            setupMessage:    null,
        };
        pendingSetups.set(message.author.id, setup);

        const panel = buildVoteSetupPanel(setup, message.guild, theme);
        const reply = await message.reply(panel);
        setup.setupMessage = reply;

        // ── Component collector (setup buttons only) ───────────────────────────
        const filter    = i =>
            i.user.id === message.author.id &&
            i.customId.startsWith('vote_setup_');
        const collector = reply.createMessageComponentCollector({ filter, time: 600_000 });

        collector.on('collect', async i => {
            const cid = i.customId;

            // ── Add Contestant ────────────────────────────────────────────────
            if (cid === 'vote_setup_add') {
                return i.showModal(
                    new ModalBuilder()
                        .setCustomId('vote_modal_add')
                        .setTitle('Add Contestant')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('contestant_id')
                                    .setLabel('User ID or @mention')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder("Paste the user's ID or copy their @mention")
                                    .setRequired(true)
                                    .setMaxLength(30)
                            )
                        )
                );
            }

            // ── Remove Contestant ─────────────────────────────────────────────
            if (cid === 'vote_setup_remove') {
                if (setup.contestants.length === 0) {
                    return i.reply({ content: ' There are no contestants to remove.', flags: MessageFlags.Ephemeral });
                }
                return i.showModal(
                    new ModalBuilder()
                        .setCustomId('vote_modal_remove')
                        .setTitle('Remove Contestant')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('remove_index')
                                    .setLabel(`Number to remove (1–${setup.contestants.length})`)
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder(`Enter a number from 1 to ${setup.contestants.length}`)
                                    .setRequired(true)
                                    .setMaxLength(3)
                            )
                        )
                );
            }

            // ── Set Channel ───────────────────────────────────────────────────
            if (cid === 'vote_setup_channel') {
                return i.showModal(
                    new ModalBuilder()
                        .setCustomId('vote_modal_channel')
                        .setTitle('Set Vote Channel')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('channel_id')
                                    .setLabel('Channel ID or #mention')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('#general or the channel ID')
                                    .setRequired(true)
                                    .setMaxLength(40)
                            )
                        )
                );
            }

            // ── Set Duration ──────────────────────────────────────────────────
            if (cid === 'vote_setup_duration') {
                return i.showModal(
                    new ModalBuilder()
                        .setCustomId('vote_modal_duration')
                        .setTitle('Set Vote Duration')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('minutes')
                                    .setLabel('Duration in minutes (1 – 10080)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('e.g. 10')
                                    .setRequired(true)
                                    .setMaxLength(6)
                                    .setValue(String(setup.durationMinutes))
                            )
                        )
                );
            }

            // ── Cancel ────────────────────────────────────────────────────────
            if (cid === 'vote_setup_cancel') {
                pendingSetups.delete(message.author.id);
                collector.stop('cancelled');
                const container = new ContainerBuilder()
                    .setAccentColor(accent)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  __Vote Setup Cancelled__\n> No session was created.`
                        )
                    );
                return i.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            // ── Deploy ────────────────────────────────────────────────────────
            if (cid === 'vote_setup_deploy') {
                if (setup.contestants.length < 2) {
                    return i.reply({
                        content: ' You need **at least 2 contestants** before deploying.',
                        flags: MessageFlags.Ephemeral,
                    });
                }
                if (!setup.channelId) {
                    return i.reply({
                        content: ' Please **set a channel** before deploying.',
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const deployChannel = message.guild.channels.cache.get(setup.channelId);
                if (!deployChannel?.isTextBased()) {
                    return i.reply({
                        content: ' The configured channel is no longer valid. Please set it again.',
                        flags: MessageFlags.Ephemeral,
                    });
                }

                await i.deferUpdate();

                // Persist session to DB
                const endsAt  = new Date(Date.now() + setup.durationMinutes * 60_000);
                const session = await VoteSession.create({
                    guildId:         message.guild.id,
                    adminId:         message.author.id,
                    contestants:     setup.contestants.map(c => ({ ...c, votes: 0 })),
                    voterIds:        [],
                    durationMinutes: setup.durationMinutes,
                    endsAt,
                    panelChannelId:  setup.channelId,
                    ended:           false,
                });

                // Send public panel
                const panelMsg = await deployChannel.send(buildVotePanel(session));

                // Save panel message ID
                session.panelMessageId = panelMsg.id;
                await session.save();

                // Schedule end timer
                scheduleVoteEnd(session, client);

                // Clean up setup state
                pendingSetups.delete(message.author.id);
                collector.stop('deployed');

                const endTs    = Math.floor(endsAt.getTime() / 1000);
                const container = new ContainerBuilder()
                    .setAccentColor(0x57F287)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  __Vote Session Live!__\n` +
                            `> The vote is now live in ${deployChannel}.\n` +
                            `>  Ends <t:${endTs}:R> · **${setup.contestants.length}** contestants · **${setup.durationMinutes}** min`
                        )
                    );
                return reply.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'deployed' && reason !== 'cancelled') {
                pendingSetups.delete(message.author.id);
                const container = new ContainerBuilder()
                    .setAccentColor(accent)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  __Setup Timed Out__\n` +
                            `> This panel expired after 10 minutes of inactivity.\n` +
                            `> Run \`&vote\` to start a new session.`
                        )
                    );
                reply.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            }
        });
    },
};
