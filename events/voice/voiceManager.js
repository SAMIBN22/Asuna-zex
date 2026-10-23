import { Events, ChannelType, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import GuildConfig from '../../models/guildConfig.js';
import { onJoin, onLeave } from '../../lib/voiceTracker.js';
import { activeLobbies, buildWelcomePanel, buildLobbyLog, getMemberGameName } from '../../lib/lobbyManager.js';
import { trackVoiceJoin, trackVoiceLeave } from '../../lib/rankTracker.js';
import { vcAlertMessages } from '../../lib/vcAlertStore.js';

const activeTempChannels = new Map();
// privateVoice: channelId → { userId, roleId, logsChannelId, roomName }
const activePrivateRooms = new Map();

const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        try {
            const guild  = newState.guild;
            const member = newState.member;
            if (!guild || !member || member.user.bot) return;

            // ── Voice XP tracking ─────────────────────────────────────────────
            const joinedVoice = !oldState.channelId && newState.channelId;
            const leftVoice   = oldState.channelId  && !newState.channelId;
            if (joinedVoice) onJoin(member.user.id, guild.id);
            if (leftVoice)   onLeave(member.user.id, guild.id);

            // ── Rank time tracking ────────────────────────────────────────────
            if (joinedVoice) trackVoiceJoin(member.user.id, guild.id);
            if (leftVoice)   trackVoiceLeave(member.user.id, guild.id, client).catch(() => {});

            if (oldState.channelId === newState.channelId) return;

            const config = await GuildConfig.findOne({ guildId: guild.id });
            if (!config) return;

            // Build a set of all protected channel IDs that should NEVER be deleted
            const pvConfig     = config.privateVoiceConfig;
            const joinChannels = pvConfig?.joinChannels || [];
            const joinIds      = new Set(joinChannels.map(c => c.id));

            // ── 1. PRIVATE VOICE ROOMS ────────────────────────────────────────
            if (pvConfig && newState.channelId && joinIds.has(newState.channelId)) {
                await this.handlePrivateRoom(member, guild, pvConfig, client);
            }

            // ── 1b. SOLO LOBBY CREATION ───────────────────────────────────────
            const lobbyConfig = config.lobbyConfig;
            if (lobbyConfig?.enabled && newState.channelId === lobbyConfig.joinChannelId) {
                await this.handleLobbyCreate(member, guild, lobbyConfig, client);
            }

            // ── 1c. LOBBY JOIN EVENT (existing lobby, not hub) ────────────────
            if (newState.channelId && activeLobbies.has(newState.channelId)) {
                const lobbyData = activeLobbies.get(newState.channelId);
                if (lobbyData.logsChannelId) {
                    const logsChannel = guild.channels.cache.get(lobbyData.logsChannelId);
                    if (logsChannel?.isTextBased()) {
                        const log = buildLobbyLog('join', member, newState.channelId, `<@${lobbyData.ownerId}>`, 0x57F287);
                        await logsChannel.send(log).catch(() => {});
                    }
                }
            }

            // ── 2. VOICE CHANNEL ALERT ────────────────────────────────────────
            const vcAlert = config.vcAlertConfig;
            if (vcAlert?.enabled && newState.channelId) {
                const alertChannels   = vcAlert.channels   || [];
                const alertCategories = vcAlert.categories || [];
                const joinedChannel   = guild.channels.cache.get(newState.channelId);
                const byChannel  = alertChannels.some(ch => ch.id === newState.channelId);
                const byCategory = joinedChannel?.parentId
                    && alertCategories.some(cat => cat.id === joinedChannel.parentId);
                if (byChannel || byCategory) {
                    await this.handleVCAlert(member, guild, newState.channelId, vcAlert, client);
                }
            }

            // ── 3. VERIFICATION SYSTEM ────────────────────────────────────────
            if (newState.channelId && newState.channelId === config.verifyVoiceChannelId) {
                await this.handleTempRoom(member, guild, config, client, 'verify');
            }

            // ── 3. NEED HELP SYSTEM ───────────────────────────────────────────
            if (newState.channelId && newState.channelId === config.templateChannelId) {
                await this.handleTempRoom(member, guild, config, client, 'help');
            }

            // ── 4. CLEANUP ────────────────────────────────────────────────────
            if (oldState.channelId) {
                const oldChannelId = oldState.channelId;

                // VC Alert — member left a monitored channel
                const vcAlertLeaveKey = `${guild.id}:${oldChannelId}:${member.id}`;
                if (vcAlertMessages.has(vcAlertLeaveKey)) {
                    await this.handleVCAlertLeave(member, guild, oldChannelId, vcAlertLeaveKey, client);
                }

                // Solo Lobby — member left a lobby channel
                if (activeLobbies.has(oldChannelId)) {
                    await this.handleLobbyLeave(member, guild, oldChannelId, client);
                    return;
                }

                // Never touch a protected join-to-create channel
                if (joinIds.has(oldChannelId)) return;

                // Private room cleanup
                if (activePrivateRooms.has(oldChannelId)) {
                    this.handlePrivateCleanup(guild, oldChannelId, client);
                    return;
                }

                // Verify / help cleanup — skip private voice category channels
                const isKnownTemp = activeTempChannels.has(oldChannelId);
                let channel = oldState.channel;
                if (!channel) {
                    channel = await guild.channels.fetch(oldChannelId).catch(() => null);
                }

                // Guard: don't clean up anything in the private voice category
                const pvCategoryId = pvConfig?.categoryId;
                if (pvCategoryId && channel?.parentId === pvCategoryId) return;

                const isInCategory = channel && (
                    (config.verifyCategoryId   && channel.parentId === config.verifyCategoryId) ||
                    (config.needHelpCategoryId && channel.parentId === config.needHelpCategoryId)
                );
                const hasEmoji = channel && (
                    channel.name.includes('ɞ﹕🔎') ||
                    channel.name.includes('ɞ﹕🆘')
                );
                if (isKnownTemp || isInCategory || hasEmoji) {
                    if (oldChannelId === config.verifyVoiceChannelId || oldChannelId === config.templateChannelId) return;
                    this.handleCleanup(guild, oldChannelId);
                }
            }
        } catch (err) {
            console.error('[VoiceMgr Event] Error:', err);
        }
    },

    // ─── Private Room Creation ─────────────────────────────────────────────────
    async handlePrivateRoom(member, guild, pvConfig, client) {
        try {
            const categoryId     = pvConfig.categoryId;
            const roleId         = pvConfig.roleId         || null;
            const nameTemplate   = pvConfig.nameTemplate   || "🎙️ {username}'s Room";
            const welcomeMessage = pvConfig.welcomeMessage || 'Welcome to your private room, {mention}!';
            const logsChannelId  = pvConfig.logsChannelId  || null;

            // Build channel name
            const roomName = nameTemplate
                .replace(/{username}/gi, member.displayName)
                .replace(/{mention}/gi, member.displayName)
                .slice(0, 100);

            // Build permission overwrites
            const overwrites = [
                { id: guild.id, deny: ['ViewChannel', 'Connect'] },
                { id: member.id, allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'ManageChannels'] },
            ];
            if (roleId) {
                overwrites.push({ id: roleId, allow: ['ViewChannel', 'Connect', 'Speak', 'Stream'] });
            }

            const tempChannel = await guild.channels.create({
                name:                 roomName,
                type:                 ChannelType.GuildVoice,
                parent:               categoryId || null,
                permissionOverwrites: overwrites,
            });

            // Move member into the room
            const moved = await member.voice.setChannel(tempChannel).catch(async err => {
                console.error(`[VoiceMgr] Failed to move user to private room: ${err.message}`);
                await tempChannel.delete().catch(() => null);
                return null;
            });
            if (moved === null) return;

            activePrivateRooms.set(tempChannel.id, {
                userId:        member.id,
                roleId,
                logsChannelId,
                roomName,
            });

            // Give role to member
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.add(role, 'Private Voice Room joined').catch(() => {});
                }
            }

            const theme      = await client.themeManager.getTheme(guild.id);
            const themeColor = Number(theme.color) || 0x5865F2;
            const thumb      = member.user.displayAvatarURL({ dynamic: true });

            // ── Welcome message in the room ────────────────────────────────────
            // Send mention as a plain message first (cannot mix content + IsComponentsV2)
            const welcomeText = welcomeMessage
                .replace(/{mention}/gi, `<@${member.id}>`)
                .replace(/{username}/gi, member.displayName);

            // Plain mention message so Discord sends a notification
            await tempChannel.send(`<@${member.id}>`).catch(() => {});

            // Then the styled welcome embed
            const welcomeContainer = new ContainerBuilder().setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## 🎙️  Private Room\n\n` +
                                `${welcomeText}\n\n` +
                                `> **Owner:** <@${member.id}>\n` +
                                `> **Room:** ${roomName}\n` +
                                `> -# This room will be deleted automatically when it is empty.`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                );

            await tempChannel.send({
                flags:      MessageFlags.IsComponentsV2,
                components: [welcomeContainer],
            }).catch(err => console.error('[VoiceMgr] Welcome message failed:', err));

            // ── Join log ───────────────────────────────────────────────────────
            if (logsChannelId) {
                const logsChannel = guild.channels.cache.get(logsChannelId);
                if (logsChannel?.isTextBased()) {
                    const logContainer = new ContainerBuilder().setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## 🟢  Private Room Opened\n` +
                                        `> **Member:** <@${member.id}> (\`${member.user.tag}\`)\n` +
                                        `> **Room:** ${roomName}\n` +
                                        `> **Channel:** <#${tempChannel.id}>\n` +
                                        `> **Role Assigned:** ${roleId ? `<@&${roleId}>` : '`None`'}\n` +
                                        `> **Opened:** <t:${Math.floor(Date.now() / 1000)}:F>`
                                    )
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                        )
                        .addSeparatorComponents(div());

                    await logsChannel.send({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [logContainer],
                    }).catch(() => {});
                }
            }

        } catch (err) {
            console.error('[VoiceMgr] Error creating private room:', err);
        }
    },

    // ─── Private Room Cleanup ──────────────────────────────────────────────────
    handlePrivateCleanup(guild, channelId, client) {
        const perform = async () => {
            try {
                const ch = await guild.channels.fetch(channelId).catch(() => null);
                if (!ch || ch.type !== ChannelType.GuildVoice || ch.members.size > 0) return;

                const roomData = activePrivateRooms.get(channelId);

                // Remove role from owner if they left completely
                if (roomData?.roleId && roomData?.userId) {
                    const guildMember = guild.members.cache.get(roomData.userId);
                    if (guildMember) {
                        await guildMember.roles.remove(roomData.roleId, 'Private Voice Room closed').catch(() => {});
                    }
                }

                // ── Leave / close log ──────────────────────────────────────────
                if (roomData?.logsChannelId) {
                    const logsChannel = guild.channels.cache.get(roomData.logsChannelId);
                    if (logsChannel?.isTextBased()) {
                        const ownerMember = guild.members.cache.get(roomData.userId);
                        const thumb = ownerMember?.displayAvatarURL({ dynamic: true }) || client.user.displayAvatarURL();

                        const theme      = await client.themeManager.getTheme(guild.id).catch(() => ({ color: 0x5865F2 }));
                        const themeColor = Number(theme.color) || 0x5865F2;

                        const logContainer = new ContainerBuilder().setAccentColor(0xED4245)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `## 🔴  Private Room Closed\n` +
                                            `> **Owner:** <@${roomData.userId}>\n` +
                                            `> **Room:** ${roomData.roomName}\n` +
                                            `> **Closed:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                                            `> -# The room was empty and has been deleted automatically.`
                                        )
                                    )
                                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                            )
                            .addSeparatorComponents(div());

                        await logsChannel.send({
                            flags:      MessageFlags.IsComponentsV2,
                            components: [logContainer],
                        }).catch(() => {});
                    }
                }

                await ch.delete('Private room empty').catch(() => null);
                activePrivateRooms.delete(channelId);

            } catch (err) {
                console.error('[VoiceMgr] Cleanup error:', err);
            }
        };

        perform();
        setTimeout(perform, 2000);
        setTimeout(perform, 6000);
    },

    // ─── Solo Lobby Creation ───────────────────────────────────────────────────
    async handleLobbyCreate(member, guild, lobbyConfig, client) {
        try {
            const categoryId    = lobbyConfig.categoryId    || null;
            const logsChannelId = lobbyConfig.logsChannelId || null;
            const settings      = await client.getSettings?.(guild.id).catch?.(() => null) || {};
            const prefix        = settings?.prefix || client.config?.prefix || '&';

            const gameName = getMemberGameName(member);
            const roomName = gameName
                ? `🎮 ${gameName} | ${member.displayName}'s Lobby`
                : `🎮 ${member.displayName}'s Lobby`;

            const tempChannel = await guild.channels.create({
                name:   roomName,
                type:   ChannelType.GuildVoice,
                parent: categoryId || null,
                permissionOverwrites: [
                    {
                        id:    member.id,
                        allow: ['ManageChannels', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'ViewChannel', 'Connect', 'Speak', 'Stream'],
                    },
                ],
            });

            // Move member into their new lobby
            const moved = await member.voice.setChannel(tempChannel).catch(async () => {
                await tempChannel.delete().catch(() => null);
                return null;
            });
            if (!moved) return;

            // Register the lobby
            activeLobbies.set(tempChannel.id, {
                guildId:       guild.id,
                ownerId:       member.id,
                kickedUsers:   new Set(),
                logsChannelId,
                welcomeMsgId:  null,
            });

            // Send welcome/control panel directly in the lobby's own voice-channel chat
            if (tempChannel?.isTextBased()) {
                const panel = buildWelcomePanel(member, tempChannel.id, prefix, gameName);
                const msg   = await tempChannel.send(panel).catch(() => null);
                if (msg) {
                    activeLobbies.get(tempChannel.id).welcomeMsgId = msg.id;
                }
            }
        } catch (err) {
            console.error('[VoiceMgr] Lobby create error:', err);
        }
    },

    // ─── Solo Lobby Leave / Cleanup ────────────────────────────────────────────
    async handleLobbyLeave(member, guild, channelId, client) {
        try {
            const lobbyData = activeLobbies.get(channelId);
            if (!lobbyData) return;

            const channel = guild.channels.cache.get(channelId);
            const remaining = channel?.members?.size ?? 0;

            // Always send the leave log first, whether or not the lobby is now empty
            if (lobbyData.logsChannelId) {
                const logsChannel = guild.channels.cache.get(lobbyData.logsChannelId);
                if (logsChannel?.isTextBased()) {
                    const isOwner = lobbyData.ownerId === member.id;
                    const type    = (isOwner && remaining > 0) ? 'ownerLeft' : 'leave';
                    const log     = buildLobbyLog(type, member, channelId, `<@${lobbyData.ownerId}>`, isOwner ? 0xFEE75C : 0xED4245);
                    await logsChannel.send(log).catch(() => {});
                }
            }

            // If channel is now empty — delete it
            if (remaining === 0) {
                activeLobbies.delete(channelId);
                if (channel) await channel.delete().catch(() => {});
            }
        } catch (err) {
            console.error('[VoiceMgr] Lobby leave error:', err);
        }
    },

    // ─── Voice Channel Alert ───────────────────────────────────────────────────
    async handleVCAlert(member, guild, channelId, vcAlert, client) {
        try {
            const roles          = vcAlert.roles          || [];
            const logsChannelId  = vcAlert.logsChannelId  || null;
            const welcomeMessage = vcAlert.welcomeMessage  || '';

            const theme      = await client.themeManager.getTheme(guild.id);
            const themeColor = Number(theme.color) || 0x5865F2;
            const thumb      = member.user.displayAvatarURL({ dynamic: true });
            const joinTime   = Math.floor(Date.now() / 1000);
            const trackKey   = `${guild.id}:${channelId}:${member.id}`;

            // ── Highest coloured role (skip @everyone) ─────────────────────────
            const topRole = member.roles.cache
                .filter(r => r.id !== guild.id && r.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .first();

            const roleDisplay = topRole ? `<@&${topRole.id}>` : '`No role`';

            // ═══ 1. WELCOME MESSAGE IN THE VOICE CHANNEL CHAT ═══════════════════
            const voiceChannel = guild.channels.cache.get(channelId);
            let vcMsgId        = null;
            let vcMentionMsgId = null;

            if (voiceChannel?.isTextBased()) {
                const welcomeText = welcomeMessage
                    ? welcomeMessage
                        .replace(/{mention}/gi, `<@${member.id}>`)
                        .replace(/{username}/gi, member.displayName)
                    : `Welcome, **${member.displayName}**! Staff have been notified.`;

                const vcContainer = new ContainerBuilder().setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## 👋  Welcome!\n` +
                                    `> **Name:** ${member.displayName}\n` +
                                    `> **Joined:** <t:${joinTime}:R>\n\n` +
                                    `${welcomeText}`
                                )
                            )
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                    )
                    .addSeparatorComponents(div());

                // Send the plain mention first (for ping), then the styled card
                // Track BOTH message IDs so they are deleted when the member leaves
                const mentionMsg = await voiceChannel.send(`<@${member.id}>`).catch(() => null);
                const vcMsg      = await voiceChannel.send({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [vcContainer],
                }).catch(() => null);

                vcMsgId         = vcMsg?.id     || null;
                vcMentionMsgId  = mentionMsg?.id || null;
            }

            // ═══ 2. JOIN NOTIFICATION IN LOGS CHANNEL (stays permanently) ═══════
            if (logsChannelId) {
                const logsChannel = guild.channels.cache.get(logsChannelId);
                if (logsChannel?.isTextBased()) {
                    // Ping staff roles first (plain text for notification)
                    const roleMentions = roles.map(r => `<@&${r.id}>`).join(' ');
                    if (roleMentions) await logsChannel.send(roleMentions).catch(() => {});

                    const vcUrl    = `https://discord.com/channels/${guild.id}/${channelId}`;
                    const joinLog  = new ContainerBuilder().setAccentColor(0x57F287)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## 🟢  Member Joined Voice Channel\n` +
                                        `> **Name:** ${member.displayName}\n` +
                                        `> **Role:** ${roleDisplay}\n` +
                                        `> **Channel:** <#${channelId}>\n` +
                                        `> **Joined:** <t:${joinTime}:F>`
                                    )
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                        )
                        .addSeparatorComponents(divS())
                        .addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setLabel('VC Alert')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(vcUrl)
                            )
                        )
                        .addSeparatorComponents(div());

                    await logsChannel.send({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [joinLog],
                    }).catch(() => {});
                }
            }

            // Track both VC messages so they are deleted on leave
            vcAlertMessages.set(trackKey, {
                vcMsgId,
                vcMentionMsgId,
                logsChannelId,
                channelId,
                joinTime,
            });
        } catch (err) {
            console.error('[VoiceMgr] VC Alert error:', err);
        }
    },

    // ─── VC Alert Leave ────────────────────────────────────────────────────────
    async handleVCAlertLeave(member, guild, channelId, trackKey, client) {
        try {
            const data = vcAlertMessages.get(trackKey);
            if (!data) return;
            vcAlertMessages.delete(trackKey);

            // ── 1. Delete BOTH the mention and the welcome card from the VC ──────
            const voiceChannel = guild.channels.cache.get(channelId);
            if (voiceChannel?.isTextBased()) {
                if (data.vcMentionMsgId) {
                    await voiceChannel.messages.delete(data.vcMentionMsgId).catch(() => {});
                }
                if (data.vcMsgId) {
                    await voiceChannel.messages.delete(data.vcMsgId).catch(() => {});
                }
            }

            // ── 2. Send a NEW leave notification in the logs channel ──────────
            if (data.logsChannelId) {
                const logsChannel = guild.channels.cache.get(data.logsChannelId);
                if (logsChannel?.isTextBased()) {
                    const theme      = await client.themeManager.getTheme(guild.id).catch(() => ({ color: 0x5865F2 }));
                    const themeColor = Number(theme.color) || 0x5865F2;
                    const thumb      = member.user.displayAvatarURL({ dynamic: true });
                    const now        = Math.floor(Date.now() / 1000);
                    const duration   = now - (data.joinTime || now);
                    const mins       = Math.floor(duration / 60);
                    const secs       = duration % 60;
                    const timeStr    = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                    const leaveLog = new ContainerBuilder().setAccentColor(0xED4245)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## 🔴  Member Left Voice Channel\n` +
                                        `> **Name:** ${member.displayName}\n` +
                                        `> **Channel:** <#${channelId}>\n` +
                                        `> **Left:** <t:${now}:F>\n` +
                                        `> **Duration:** \`${timeStr}\``
                                    )
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
                        )
                        .addSeparatorComponents(div());

                    await logsChannel.send({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [leaveLog],
                    }).catch(() => {});
                }
            }
        } catch (err) {
            console.error('[VoiceMgr] VC Alert leave error:', err);
        }
    },

    // ─── Verify / Help Temp Room Creation ─────────────────────────────────────
    async handleTempRoom(member, guild, config, client, type) {
        try {
            const hubChannelId = type === 'verify' ? config.verifyVoiceChannelId : config.templateChannelId;
            const hubChannel   = await guild.channels.fetch(hubChannelId).catch(() => null);
            if (!hubChannel) return;

            const categoryId   = hubChannel.parentId;
            const roomName     = type === 'verify' ? `ɞ﹕🔎 ${member.user.username}'s vc` : `ɞ﹕🆘 ${member.user.username}'s help`;
            const logChannelId = type === 'verify' ? config.verifyLogChannelId : config.needHelpLogsChannelId;
            const staffRoles   = type === 'verify' ? config.verificatorsRoleIds : config.helperRoleIds;

            const tempChannel = await guild.channels.create({
                name: roomName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                bitrate: hubChannel.bitrate,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel', 'Connect'] },
                    { id: member.id, allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD'] }
                ]
            });

            if (staffRoles && staffRoles.length > 0) {
                for (const roleId of staffRoles) {
                    await tempChannel.permissionOverwrites.create(roleId, {
                        ViewChannel: true, Connect: true, Speak: true, Stream: true, MoveMembers: true
                    }).catch(() => {});
                }
            }

            await member.voice.setChannel(tempChannel).catch(err => {
                console.error(`[VoiceMgr] Failed to move user: ${err.message}`);
                tempChannel.delete().catch(() => null);
                return;
            });

            activeTempChannels.set(tempChannel.id, { type, userId: member.id });

            try {
                const theme         = await client.themeManager.getTheme(guild.id);
                const themeColor    = client.themeManager.getRGBColor(theme.color);
                const emojis        = theme.emojis || {};
                const title         = type === 'verify' ? 'Welcome to Verification' : 'Welcome to Support';
                const icon          = type === 'verify' ? (emojis.title || '🔒') : (emojis.title || '🆘');
                const staffMentions = staffRoles?.length > 0 ? staffRoles.map(id => `<@&${id}>`).join(' ') : '';

                if (staffMentions || member.id) {
                    await tempChannel.send(`${staffMentions} <@${member.id}>`).catch(() => {});
                }

                const userEmbed = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${icon} __${title}__\n\n` +
                                    `> ${emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__User:__** <@${member.id}>\n` +
                                    `> ${emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__Staff:__** ${staffMentions || '`No staff roles configured`'}\n\n` +
                                    `> ${emojis.title || '☁️'} <@${member.id}> *Wait until a staff joins your room shortly.*\n` +
                                    `> ${emojis.title || '🔒'} **${type === 'verify' ? 'Verificator' : 'Helper'} show up here!**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                await tempChannel.send({
                    components: [userEmbed],
                    flags:      MessageFlags.IsComponentsV2
                });
            } catch (err) {
                console.error('[VoiceMgr] Failed to send welcome messages:', err);
            }
        } catch (error) {
            console.error('[VoiceMgr] Error creating room:', error);
        }
    },

    // ─── Verify / Help Cleanup ─────────────────────────────────────────────────
    handleCleanup(guild, channelId) {
        const performCleanup = async () => {
            try {
                const updatedChannel = await guild.channels.fetch(channelId).catch(() => null);
                if (updatedChannel && updatedChannel.type === ChannelType.GuildVoice && updatedChannel.members.size === 0) {
                    const config = await GuildConfig.findOne({ guildId: guild.id });
                    if (config && (channelId === config.verifyVoiceChannelId || channelId === config.templateChannelId)) return;
                    await updatedChannel.delete('Room empty').catch(() => null);
                    activeTempChannels.delete(channelId);
                }
            } catch {}
        };

        performCleanup();
        setTimeout(performCleanup, 1500);
        setTimeout(performCleanup, 5000);
    }
};
