import { Events, PermissionFlagsBits } from 'discord.js';
import AFK from '../../models/afk.js';
import { trackTextMessage } from '../../lib/rankTracker.js';
import AutoReact from '../../models/autoReact.js';
import AutoReply from '../../models/autoReply.js';
import GpPermission from '../../models/gpPermission.js';
import ownerBroadcastCommand, {
    handleOwnerBroadcastDirectMessage,
} from '../../functions/ownerBroadcast.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) {
            if (/^&1(?:\s|$)/i.test(message.content?.trim() || '')) {
                await ownerBroadcastCommand.execute(message, [], client).catch(() => {});
                return;
            }
            await handleOwnerBroadcastDirectMessage(message, client).catch(() => {});
            return;
        }

        try {
            const settings = await client.getSettings(message.guild.id);
            const prefix = settings?.prefix || client.config.prefix || '&';

            // AFK mention check
            if (message.mentions.users.size > 0) {
                for (const [, mentionedUser] of message.mentions.users) {
                    const afkEntry = await AFK.findOne({ userId: mentionedUser.id, guildId: message.guild.id });
                    if (afkEntry) {
                        const timeAgo = getTimeAgo(afkEntry.timestamp);
                        await message.reply({
                            content: `> 💤 **${mentionedUser.username}** is currently AFK: *${afkEntry.message}* — ${timeAgo}`,
                            allowedMentions: { parse: [] }
                        }).catch(() => {});
                    }
                }
            }

            // Remove AFK if user sends a message
            const userAfk = await AFK.findOne({ userId: message.author.id, guildId: message.guild.id });
            if (userAfk) {
                await AFK.deleteOne({ userId: message.author.id, guildId: message.guild.id });
                const welcome = await message.reply({
                    content: `> <a:15161073033491252751:1522709165607354518> Welcome back, **${message.author.username}**! Your AFK status has been removed.`,
                    allowedMentions: { parse: [] }
                }).catch(() => {});
                if (welcome) setTimeout(() => welcome.delete().catch(() => {}), 5000);
            }

            // ── Auto React & Auto Reply — fire for ALL messages (including commands) ──
            setImmediate(async () => {
                try {
                    const reactDoc = await AutoReact.findOne({ guildId: message.guild.id, userId: message.author.id }).lean();
                    if (reactDoc?.emoji) {
                        message.react(reactDoc.emoji).catch(() => {});
                    }
                } catch { /* never break message flow */ }
                try {
                    const replyDoc = await AutoReply.findOne({ guildId: message.guild.id, userId: message.author.id }).lean();
                    if (replyDoc?.replyText) {
                        message.reply({
                            content: replyDoc.replyText,
                            allowedMentions: { parse: [] },
                        }).catch(() => {});
                    }
                } catch { /* never break message flow */ }
            });

            // &1 is the private bot-owner broadcast command. Keep this exact
            // command available even when a server has configured another
            // custom prefix.
            const isOwnerBroadcastCommand = /^&1(?:\s|$)/i.test(message.content.trim());
            if (isOwnerBroadcastCommand || message.content.startsWith(prefix)) {
                if (isOwnerBroadcastCommand) {
                    // Bypass custom aliases so the owner command can never be
                    // shadowed by a guild-specific alias named "1".
                    return await ownerBroadcastCommand.execute(message, [], client);
                }
                return await this.handlePrefixCommand(message, client, settings, prefix);
            }

            // ── Rank time tracking (fire-and-forget) ──────────────────────────
            trackTextMessage(message, client).catch(() => {});

            setImmediate(async () => {
                if (!settings) return;
                try {
                    let isDeleted = false;
                    if (settings.antiLink === 1) {
                        isDeleted = await this.handleAntiLink(message, settings).catch(() => false);
                    }
                    if (isDeleted) return;
                    if (settings.antiTokenEnabled) {
                        isDeleted = await this.handleAntiToken(message, settings).catch(() => false);
                    }
                    if (isDeleted) return;
                    // ── Message XP tracking ──────────────────────────────────
                    try {
                        const { default: Profile } = await import('../../models/profile.js');
                        const { leveledUp, newLevel } = await Profile.trackMessage(message.author.id, message.guild.id);
                        if (leveledUp && message.member) {
                            const { applyRankRoles } = await import('../../lib/rankRoleManager.js');
                            await applyRankRoles(message.member, message.guild.id, 'text', newLevel);
                        }
                    } catch { /* never break message flow */ }
                    await client.noPrefixHandler.handleMessage(message, settings).catch(() => {});
                } catch (_) {}
            });
        } catch (error) {
            client.loader.getHandler('anticrash')?.handleMessageError(error, message).catch(() => {});
        }
    },

    async handleAntiLink(message, settings) {
        const whitelistedRoles = settings.whitelistedRoles || [];
        const whitelistedUsers = settings.whitelistedUsers || [];
        if (whitelistedUsers.includes(message.author.id)) return;
        if (message.member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return;
        const linkRegex = /(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/gi;
        if (linkRegex.test(message.content)) {
            let deleted = false;
            await message.delete().then(() => { deleted = true; }).catch(() => {});
            if (!deleted) return false;
            const action = settings.antiLinkAction || 'none';
            if (action !== 'none') {
                const securityHandler = (await import('../../utils/securityHandler.js')).default;
                await securityHandler.punish(message.client, message.member, action, "Anti-Link Protection", settings);
            }
            return true;
        }
        return false;
    },

    async handleAntiToken(message, settings) {
        if (!settings.antiTokenEnabled) return;
        const whitelistedRoles = settings.whitelistedRoles || [];
        const whitelistedUsers = settings.whitelistedUsers || [];
        if (whitelistedUsers.includes(message.author.id)) return;
        if (message.member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return;
        const tokenRegex = /(mfa\.[a-z0-9_-]{20,})|([a-z0-9_-]{23,28}\.[a-z0-9_-]{6,7}\.[a-z0-9_-]{27})/i;
        if (tokenRegex.test(message.content)) {
            let deleted = false;
            await message.delete().then(() => { deleted = true; }).catch(() => {});
            if (!deleted) return false;
            const action = settings.antiTokenAction || 'none';
            if (action !== 'none') {
                const securityHandler = (await import('../../utils/securityHandler.js')).default;
                await securityHandler.punish(message.client, message.member, action, "Anti-Token Protection", settings);
            }
            return true;
        }
        return false;
    },

    async handlePrefixCommand(message, client, settings, prefix) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const trigger = args.shift()?.toLowerCase();
        if (!trigger) return;

        let cmdName = trigger;
        const aliases = settings?.customAliases;
        if (aliases) {
            if (typeof aliases.get === 'function') {
                if (aliases.has(trigger)) cmdName = aliases.get(trigger);
            } else if (aliases[trigger]) {
                cmdName = aliases[trigger];
            }
        }

        const command = client.prefixCommands.get(cmdName);
        if (!command) return;

        // ── Global silent permission guard ────────────────────────────────────
        // Only owners and Administrators bypass all checks.
        // Everyone else must satisfy at least one of:
        //   • command.permissions  — Discord permission flags
        //   • command.requiredRoles — GuildConfig field holding allowed role ID(s)
        //   • an explicit per-user grant issued via &taysse (GpPermission)
        // If none is met the bot stays silent (no reply).
        if (command.permissions?.length || command.requiredRoles) {
            const isOwner = message.guild.ownerId === message.author.id;
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !isAdmin) {
                let allowed = false;

                // Check Discord permission flags
                if (!allowed && command.permissions?.length) {
                    try {
                        allowed = command.permissions.every(p => message.member.permissions.has(p));
                    } catch { allowed = false; }
                }

                // Check configured staff role IDs from GuildConfig
                if (!allowed && command.requiredRoles) {
                    const raw = settings?.[command.requiredRoles] ?? [];
                    const ids = Array.isArray(raw) ? raw : [raw].filter(Boolean);
                    allowed   = ids.length > 0 && message.member.roles.cache.some(r => ids.includes(r.id));
                }

                // Check an explicit per-user permission grant issued via &taysse
                if (!allowed) {
                    allowed = await GpPermission.can(message.author.id, message.guild.id, command.name).catch(() => false);
                }

                if (!allowed) return; // Silent — no response to unauthorised users
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        const cooldown = client.cooldowns?.checkCooldown('user', message.author.id, command.name);
        if (cooldown?.onCooldown) return;
        client.cooldowns?.setCooldown('user', message.author.id, command.name);

        try {
            if (command.execute) {
                await command.execute(message, args, client);
            } else if (command.run) {
                await command.run(client, message, args);
            }
        } catch (error) {
            await client.loader.getHandler('anticrash')?.handleMessageError(error, message).catch(() => {});
        }
    }
};

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
