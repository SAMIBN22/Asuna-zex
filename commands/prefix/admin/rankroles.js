/**
 * &rankroles — Level Role Rewards control panel.
 *
 * ── Features ─────────────────────────────────────────────────────────────────
 * • Add unlimited Voice or Text rank tiers (role + perk + estimated time).
 * • Remove one or more tiers at once.
 * • Set a "display channel" — the bot posts/updates the public rank list there
 *   automatically every time ranks change.
 * • "Post Now" button for a one-shot manual post to any channel.
 * • Public display format:  @RoleName  •  Perk Description  ~time
 *
 * ── Interaction routing ───────────────────────────────────────────────────────
 * Panel buttons live on `sent` → handled by sent.createMessageComponentCollector().
 * Ephemeral select menus live on different messages → routed via the global
 * interactionCreate event → handleRankCfgSelect().
 *
 * ── Restart resilience ───────────────────────────────────────────────────────
 * In-memory sessions (rankConfigSessions) hold the `sent` Message reference.
 * After a bot restart these are lost, but handleRankCfgSelect() auto-rebuilds
 * a minimal session by fetching the panel message using the sentId encoded in
 * every ephemeral select's custom ID.
 *
 * Pending Add-Rank flow data (track, level, perk, timeEstimate) is stored in
 * MongoDB (PendingFlow model) with a 10-minute TTL so it survives restarts.
 * findOneAndDelete() is atomic, preventing double-processing.
 *
 * Custom ID formats (all encode sentId):
 *   rankcfg_roleselect_{sentId}_{flowId}   → role picker for a new tier
 *   rankcfg_del_{sentId}                   → remove select
 *   rankcfg_pub_{sentId}                   → one-shot post channel select
 *   rankcfg_chan_{sentId}                  → set persistent display channel
 */
import {
    ContainerBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    PermissionsBitField,
    ChannelType,
} from 'discord.js';
import RankRole         from '../../../models/rankRole.js';
import RankChannelConfig from '../../../models/rankChannelConfig.js';
import PendingFlow      from '../../../models/pendingFlow.js';
import config           from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function hasAccess(member) {
    if (!member) return false;
    if (OWNER_IDS.includes(String(member.user.id))) return true;
    if (member.guild.ownerId === member.user.id) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const botMember = member.guild.members.me;
    if (botMember && member.roles.highest.position > botMember.roles.highest.position) return true;
    return false;
}

/** Generates a short random ID safe for Discord custom IDs (alphanumeric only). */
function newFlowId() {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * Normalises a time-estimate string so it always starts with "~".
 * e.g. "2 months, 1 week" → "~2 months, 1 week"
 */
function normaliseTime(raw) {
    if (!raw) return '';
    const t = raw.trim();
    return t.startsWith('~') ? t : `~${t}`;
}

// ── In-memory session store ───────────────────────────────────────────────────
// Key:   sentId (panel Message.id — unique per panel instance)
// Value: { sent: Message, guild: Guild }
//
// Lost on restart, but auto-rebuilt by getOrRebuildSession().
// Pending flow data is in MongoDB (not here), so restarts don't break add-rank.
export const rankConfigSessions = new Map();

// ── Resolve or reconstruct a session ─────────────────────────────────────────
async function getOrRebuildSession(sentId, interaction) {
    let session = rankConfigSessions.get(sentId);
    if (session) return session;

    // Bot restarted — fetch the original panel message to reconstruct.
    const sent = await interaction.channel.messages.fetch(sentId).catch(() => null);
    if (!sent) return null;

    session = { sent, guild: interaction.guild };
    rankConfigSessions.set(sentId, session);
    return session;
}

// ── Public rank display ───────────────────────────────────────────────────────
export async function buildPublicDisplay(guild) {
    const [voiceTiers, textTiers] = await Promise.all([
        RankRole.getForGuild(guild.id, 'voice'),
        RankRole.getForGuild(guild.id, 'text'),
    ]);

    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    if (voiceTiers.length) {
        container
            .addTextDisplayComponents(t => t.setContent('##  Voice Chat Ranks'))
            .addSeparatorComponents(new SeparatorBuilder());
        for (const tier of voiceTiers) {
            let line = `<@&${tier.roleId}>`;
            if (tier.perk) line += ` • **${tier.perk}**`;
            const time = normaliseTime(tier.timeEstimate);
            if (time)      line += `  ${time}`;
            container.addTextDisplayComponents(d => d.setContent(`> ${line}`));
        }
        container.addSeparatorComponents(new SeparatorBuilder());
    }

    if (textTiers.length) {
        container
            .addTextDisplayComponents(t => t.setContent('##  Text Ranks'))
            .addSeparatorComponents(new SeparatorBuilder());
        for (const tier of textTiers) {
            let line = `<@&${tier.roleId}>`;
            if (tier.perk) line += ` • **${tier.perk}**`;
            const time = normaliseTime(tier.timeEstimate);
            if (time)      line += `  ${time}`;
            container.addTextDisplayComponents(d => d.setContent(`> ${line}`));
        }
        container.addSeparatorComponents(new SeparatorBuilder());
    }

    if (!voiceTiers.length && !textTiers.length) {
        container.addTextDisplayComponents(t =>
            t.setContent('> `No ranks have been configured yet.`')
        );
    }

    container.addTextDisplayComponents(t =>
        t.setContent('-# Reach the required level in `&lvl` to earn each rank automatically.')
    );

    return [container];
}

// ── Auto-update the display channel ──────────────────────────────────────────
async function syncDisplayChannel(guild) {
    try {
        const cfg = await RankChannelConfig.getForGuild(guild.id);
        if (!cfg) return;

        const channel = guild.channels.cache.get(cfg.channelId)
            ?? await guild.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const payload = {
            flags: MessageFlags.IsComponentsV2,
            components: await buildPublicDisplay(guild),
            allowedMentions: { parse: [] },
        };

        if (cfg.messageId) {
            const existing = await channel.messages.fetch(cfg.messageId).catch(() => null);
            if (existing) { await existing.edit(payload).catch(() => null); return; }
        }

        const posted = await channel.send(payload).catch(() => null);
        if (posted) await RankChannelConfig.setForGuild(guild.id, channel.id, posted.id);
    } catch (err) {
        console.error('[RankRoles] syncDisplayChannel error:', err);
    }
}

// ── Control panel (private, staff-only) ──────────────────────────────────────
async function buildControlPanel(guild, expired = false) {
    const [voiceTiers, textTiers, chanCfg] = await Promise.all([
        RankRole.getForGuild(guild.id, 'voice'),
        RankRole.getForGuild(guild.id, 'text'),
        RankChannelConfig.getForGuild(guild.id),
    ]);

    const hasRanks    = voiceTiers.length > 0 || textTiers.length > 0;
    const chanDisplay = chanCfg ? `<#${chanCfg.channelId}>` : '`Not set`';

    const container = new ContainerBuilder()
        .setAccentColor(0xA78BFA)
        .addTextDisplayComponents(t => t.setContent(
            `##  __Level Role Rewards__\n` +
            `> Automatically grant a Discord role when a member reaches a **Voice** or **Text** level.\n` +
            `> Display Channel: ${chanDisplay}`
        ))
        .addSeparatorComponents(new SeparatorBuilder());

    // Voice tiers
    container.addTextDisplayComponents(t => {
        if (!voiceTiers.length) return t.setContent('###  Voice Ranks\n> `No ranks configured yet.`');
        const lines = voiceTiers.map(tier => {
            let line = `> **Level ${tier.level}** → <@&${tier.roleId}>`;
            if (tier.perk)                       line += ` — *${tier.perk}*`;
            const time = normaliseTime(tier.timeEstimate);
            if (time)                            line += `  \`${time}\``;
            return line;
        }).join('\n');
        return t.setContent(`###  Voice Ranks\n${lines}`);
    });

    container.addSeparatorComponents(new SeparatorBuilder());

    // Text tiers
    container.addTextDisplayComponents(t => {
        if (!textTiers.length) return t.setContent('###  Text Ranks\n> `No ranks configured yet.`');
        const lines = textTiers.map(tier => {
            let line = `> **Level ${tier.level}** → <@&${tier.roleId}>`;
            if (tier.perk)                       line += ` — *${tier.perk}*`;
            const time = normaliseTime(tier.timeEstimate);
            if (time)                            line += `  \`${time}\``;
            return line;
        }).join('\n');
        return t.setContent(`###  Text Ranks\n${lines}`);
    });

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rankcfg_add_voice')
                .setLabel('Add Voice Rank')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('rankcfg_add_text')
                .setLabel('Add Text Rank')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(expired),
        ))
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rankcfg_remove')
                .setLabel('Remove Rank')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(expired || !hasRanks),
            new ButtonBuilder()
                .setCustomId('rankcfg_setchan')
                .setLabel('Set Display Channel')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('rankcfg_post')
                .setLabel('Post Now')
                .setStyle(ButtonStyle.Success)
                .setDisabled(expired || !hasRanks),
        ))
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder()
                .setCustomId('rankcfg_refresh')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired),
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            '-# Only the server owner, Administrators, or roles above the bot may use this panel.'
        ));

    return [container];
}

// ── Global select-menu handler (called from interactionCreate) ────────────────
export async function handleRankCfgSelect(interaction) {
    const cid = interaction.customId;

    let sentId, flowId;
    if (cid.startsWith('rankcfg_roleselect_')) {
        const rest  = cid.slice('rankcfg_roleselect_'.length);
        const under = rest.indexOf('_');
        sentId  = rest.slice(0, under);
        flowId  = rest.slice(under + 1);
    } else if (cid.startsWith('rankcfg_del_')) {
        sentId = cid.slice('rankcfg_del_'.length);
    } else if (cid.startsWith('rankcfg_pub_')) {
        sentId = cid.slice('rankcfg_pub_'.length);
    } else if (cid.startsWith('rankcfg_chan_')) {
        sentId = cid.slice('rankcfg_chan_'.length);
    }

    const session = await getOrRebuildSession(sentId, interaction);
    if (!session) {
        return interaction.reply({
            content:
                ' **Session Expired**\n' +
                '> This panel is no longer active. Please run `&rankroles` again to open a new one.',
            flags: MessageFlags.Ephemeral,
        }).catch(() => {});
    }

    const { sent, guild } = session;

    try {

        // ── Role selected for a new tier ──────────────────────────────────────
        if (cid.startsWith('rankcfg_roleselect_')) {
            // Atomically claim the pending flow from MongoDB.
            // Works even after a bot restart because data is persisted.
            const pending = await PendingFlow.findOneAndDelete({ flowId });

            if (!pending) {
                return interaction.reply({
                    content:
                        ' **Flow Expired**\n' +
                        '> This role-selection has expired (10-minute timeout).\n' +
                        '> Please click **Add Voice Rank** or **Add Text Rank** on the panel to start over.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }

            const { track, level, perk, timeEstimate } = pending;
            const roleId = interaction.values[0];

            await RankRole.upsertRankRole(guild.id, track, level, roleId, perk, timeEstimate);

            const time = normaliseTime(timeEstimate);
            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(t => t.setContent(
                            `##  Rank Saved\n` +
                            `> **${track === 'voice' ? 'Voice' : 'Text'} Level ${level}** now grants <@&${roleId}>` +
                            `${perk ? `\n> Perk: *${perk}*`   : ''}` +
                            `${time ? `\n> Time: \`${time}\`` : ''}`
                        )),
                ],
            }).catch(() => {});

            await Promise.all([
                sent.edit({ flags: MessageFlags.IsComponentsV2, components: await buildControlPanel(guild) }).catch(() => {}),
                syncDisplayChannel(guild),
            ]);
            return;
        }

        // ── Remove selected ranks ─────────────────────────────────────────────
        if (cid.startsWith('rankcfg_del_')) {
            await RankRole.deleteMany({ guildId: guild.id, _id: { $in: interaction.values } });

            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(t => t.setContent(
                            `##  Removed\n> ${interaction.values.length} rank(s) deleted successfully.`
                        )),
                ],
            }).catch(() => {});

            await Promise.all([
                sent.edit({ flags: MessageFlags.IsComponentsV2, components: await buildControlPanel(guild) }).catch(() => {}),
                syncDisplayChannel(guild),
            ]);
            return;
        }

        // ── One-shot post to any channel ──────────────────────────────────────
        if (cid.startsWith('rankcfg_pub_')) {
            const channel = guild.channels.cache.get(interaction.values[0])
                ?? await guild.channels.fetch(interaction.values[0]).catch(() => null);

            if (!channel || !channel.isTextBased()) {
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0xED4245)
                            .addTextDisplayComponents(t => t.setContent('##  Error\n> Channel not found. Please try again.')),
                    ],
                }).catch(() => {});
            }

            const posted = await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: await buildPublicDisplay(guild),
                allowedMentions: { parse: [] },
            }).catch(() => null);

            if (!posted) {
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0xED4245)
                            .addTextDisplayComponents(t => t.setContent(
                                `##  Failed to Post\n> I don't have permission to send messages in <#${channel.id}>.\n> Please check my channel permissions and try again.`
                            )),
                    ],
                }).catch(() => {});
            }

            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0x57F287)
                        .addTextDisplayComponents(t => t.setContent(
                            `##  Posted\n> The rank list has been posted in <#${channel.id}>.`
                        )),
                ],
            }).catch(() => {});
            return;
        }

        // ── Set persistent display channel ────────────────────────────────────
        if (cid.startsWith('rankcfg_chan_')) {
            const channel = guild.channels.cache.get(interaction.values[0])
                ?? await guild.channels.fetch(interaction.values[0]).catch(() => null);

            if (!channel || !channel.isTextBased()) {
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0xED4245)
                            .addTextDisplayComponents(t => t.setContent('##  Error\n> Channel not found. Please try again.')),
                    ],
                }).catch(() => {});
            }

            const posted = await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: await buildPublicDisplay(guild),
                allowedMentions: { parse: [] },
            }).catch(() => null);

            if (!posted) {
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0xED4245)
                            .addTextDisplayComponents(t => t.setContent(
                                `##  Failed to Post\n> I don't have permission to send messages in <#${channel.id}>.\n> Please check my channel permissions and try again.`
                            )),
                    ],
                }).catch(() => {});
            }

            await RankChannelConfig.setForGuild(guild.id, channel.id, posted.id);

            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0x57F287)
                        .addTextDisplayComponents(t => t.setContent(
                            `##  Display Channel Set\n> The rank list will be posted and **automatically updated** in <#${channel.id}> whenever ranks change.`
                        )),
                ],
            }).catch(() => {});

            await sent.edit({
                flags: MessageFlags.IsComponentsV2,
                components: await buildControlPanel(guild),
            }).catch(() => {});
            return;
        }

    } catch (err) {
        console.error('[RankRoles] handleRankCfgSelect error:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content:
                    ' **An error occurred** while processing your selection.\n' +
                    '> Please try again. If the issue persists, run `&rankroles` to open a fresh panel.',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

export default {
    name: 'rankroles',
    aliases: ['levelroles', 'rankconfig', 'ranksetup'],
    description: 'Open the Level Role Rewards control panel (staff only).',
    category: 'Admin',
    usage: '&rankroles',

    async execute(message, args, client) {
        if (!hasAccess(message.member)) {
            return message.reply({
                content: ' Only the server owner, Administrators, or roles above the bot can use this command.',
            }).catch(() => {});
        }

        const guild = message.guild;
        const sent  = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: await buildControlPanel(guild),
            allowedMentions: { parse: [] },
        });

        const sentId = sent.id;
        rankConfigSessions.set(sentId, { sent, guild });

        const collector = sent.createMessageComponentCollector({
            filter: i => hasAccess(i.member),
            time: 15 * 60 * 1000,
        });

        collector.on('collect', async (interaction) => {
            const cid = interaction.customId;

            // ── Add Voice / Text Rank ─────────────────────────────────────────
            if (cid === 'rankcfg_add_voice' || cid === 'rankcfg_add_text') {
                const track = cid === 'rankcfg_add_voice' ? 'voice' : 'text';
                const label = track === 'voice' ? 'Voice' : 'Text';

                const modal = new ModalBuilder()
                    .setCustomId(`rankcfg_modal_${track}`)
                    .setTitle(`Add ${label} Rank`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('level')
                                .setLabel('Required Level')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('e.g. 10')
                                .setRequired(true)
                                .setMaxLength(6)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('perk')
                                .setLabel('Perk Description (optional)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('e.g. Get @Mute Power')
                                .setRequired(false)
                                .setMaxLength(100)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('timeEstimate')
                                .setLabel('Estimated Time to Reach (optional)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('e.g. ~2 months, 1 week')
                                .setRequired(false)
                                .setMaxLength(60)
                        ),
                    );

                await interaction.showModal(modal);

                const modalRes = await interaction.awaitModalSubmit({
                    filter: i =>
                        i.user.id === interaction.user.id &&
                        i.customId === `rankcfg_modal_${track}`,
                    time: 120_000,
                }).catch(() => null);

                if (!modalRes) return;

                const levelRaw     = modalRes.fields.getTextInputValue('level').trim();
                const perk         = modalRes.fields.getTextInputValue('perk')?.trim()         || '';
                const timeEstimate = modalRes.fields.getTextInputValue('timeEstimate')?.trim() || '';
                const level        = parseInt(levelRaw, 10);

                if (!Number.isInteger(level) || level < 1) {
                    return modalRes.reply({
                        content: ' Please enter a valid whole number for the level (minimum 1).',
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }

                // Persist flow data in MongoDB so it survives bot restarts.
                const flowId = newFlowId();
                await PendingFlow.create({ flowId, track, level, perk, timeEstimate });

                const time = normaliseTime(timeEstimate);
                let preview = `**Level ${level}** — ${label} Rank`;
                if (perk) preview += `\n> Perk: *${perk}*`;
                if (time) preview += `\n> Time: \`${time}\``;

                await modalRes.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(track === 'voice' ? 0x22D3EE : 0xA78BFA)
                            .addTextDisplayComponents(t => t.setContent(
                                `## ${track === 'voice' ? '' : ''} Select Role\n` +
                                `${preview}\n\n` +
                                `> Choose the role that will be **automatically granted** when a member reaches this level.`
                            ))
                            .addActionRowComponents(r => r.addComponents(
                                new RoleSelectMenuBuilder()
                                    .setCustomId(`rankcfg_roleselect_${sentId}_${flowId}`)
                                    .setPlaceholder(`Select the role for Level ${level}`)
                                    .setMinValues(1)
                                    .setMaxValues(1)
                            )),
                    ],
                }).catch(() => {});
                return;
            }

            // ── Remove Rank ───────────────────────────────────────────────────
            if (cid === 'rankcfg_remove') {
                const [voiceTiers, textTiers] = await Promise.all([
                    RankRole.getForGuild(guild.id, 'voice'),
                    RankRole.getForGuild(guild.id, 'text'),
                ]);
                const all = [...voiceTiers, ...textTiers];

                if (!all.length) {
                    return interaction.reply({
                        content: ' There are no ranks configured yet.',
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`rankcfg_del_${sentId}`)
                    .setPlaceholder('Select one or more ranks to remove')
                    .setMinValues(1)
                    .setMaxValues(Math.min(25, all.length));

                for (const tier of all) {
                    const role = guild.roles.cache.get(tier.roleId);
                    let label = `${tier.track === 'voice' ? '' : ''} Level ${tier.level} • @${role?.name ?? 'deleted-role'}`;
                    if (tier.perk) label += ` — ${tier.perk}`;
                    if (label.length > 100) label = label.slice(0, 97) + '…';
                    menu.addOptions({ label, value: String(tier._id) });
                }

                await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xED4245)
                            .addTextDisplayComponents(t => t.setContent(
                                '##  Remove Rank\n> Select one or more ranks to permanently delete.'
                            ))
                            .addActionRowComponents(r => r.addComponents(menu)),
                    ],
                }).catch(() => {});
                return;
            }

            // ── Set persistent display channel ────────────────────────────────
            if (cid === 'rankcfg_setchan') {
                await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFBBF24)
                            .addTextDisplayComponents(t => t.setContent(
                                '##  Set Display Channel\n' +
                                '> Choose the channel where the public rank list will be posted.\n' +
                                '> The list will be **automatically updated** there whenever ranks change.'
                            ))
                            .addActionRowComponents(r => r.addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`rankcfg_chan_${sentId}`)
                                    .setPlaceholder('Select a text channel')
                                    .setChannelTypes(ChannelType.GuildText)
                                    .setMinValues(1)
                                    .setMaxValues(1)
                            )),
                    ],
                }).catch(() => {});
                return;
            }

            // ── One-shot post (manual) ────────────────────────────────────────
            if (cid === 'rankcfg_post') {
                await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x57F287)
                            .addTextDisplayComponents(t => t.setContent(
                                '##  Post Rank List\n> Select a channel to post the rank list in (one-time).'
                            ))
                            .addActionRowComponents(r => r.addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`rankcfg_pub_${sentId}`)
                                    .setPlaceholder('Select a text channel')
                                    .setChannelTypes(ChannelType.GuildText)
                                    .setMinValues(1)
                                    .setMaxValues(1)
                            )),
                    ],
                }).catch(() => {});
                return;
            }

            // ── Refresh ────────────────────────────────────────────────────────
            if (cid === 'rankcfg_refresh') {
                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: await buildControlPanel(guild),
                }).catch(() => {});
                return;
            }
        });

        collector.on('end', async () => {
            rankConfigSessions.delete(sentId);
            sent.edit({
                flags: MessageFlags.IsComponentsV2,
                components: await buildControlPanel(guild, true),
            }).catch(() => {});
        });
    },
};
