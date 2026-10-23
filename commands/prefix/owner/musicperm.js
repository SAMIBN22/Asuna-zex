/**
 * &musicperm — Bot-owner command to manage music access.
 *
 * Usage:
 *   &musicperm grant @user      — grant music access to a user in this guild
 *   &musicperm revoke @user     — revoke music access from a user
 *   &musicperm list             — list all users with music access in this guild
 *   &musicperm grantall @user   — grant access in ALL guilds the bot is in (global)
 *   &musicperm revokeall @user  — revoke global access
 *
 * Only users listed in config.devIds may run this command.
 */
import {
    ContainerBuilder,
    SeparatorBuilder,
    MessageFlags,
} from 'discord.js';
import MusicPermission from '../../../models/musicPermission.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function isOwner(id) { return OWNER_IDS.includes(String(id)); }

function panel(color, content) {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [
            new ContainerBuilder()
                .setAccentColor(color)
                .addTextDisplayComponents(t => t.setContent(content)),
        ],
    };
}

export default {
    name: 'musicperm',
    aliases: ['mperm', 'musicaccess'],
    description: 'Manage who can use music commands (bot owner only).',
    category: 'Owner',
    usage: '&musicperm <grant|revoke|list> [@user]',
    ownerOnly: true,

    async execute(message, args, client) {
        if (!isOwner(message.author.id)) {
            return message.reply(panel(0xED4245,
                '##  Access Denied\n> Only bot owners can manage music permissions.'
            ));
        }

        const sub = (args[0] || '').toLowerCase();

        // ── &musicperm list ───────────────────────────────────────────────────
        if (sub === 'list') {
            const perms = await MusicPermission.find({ guildId: message.guild.id });

            if (!perms.length) {
                return message.reply(panel(0xA78BFA,
                    '##  Music Permissions\n> No users have been granted music access in this guild.\n' +
                    '> Only bot owners can use music commands.'
                ));
            }

            const lines = await Promise.all(perms.map(async p => {
                const user = await client.users.fetch(p.userId).catch(() => null);
                return `> **${user?.tag ?? p.userId}** \`(${p.userId})\``;
            }));

            return message.reply(panel(0xA78BFA,
                `##  Music Permissions — ${message.guild.name}\n` +
                `> ${perms.length} user(s) have music access:\n` +
                lines.join('\n')
            ));
        }

        // ── grant / revoke (require @user) ────────────────────────────────────
        if (!['grant', 'revoke', 'grantall', 'revokeall'].includes(sub)) {
            return message.reply(panel(0xFBBF24,
                '##  Music Permission Manager\n\n' +
                '**Usage:**\n' +
                '> `&musicperm grant @user` — grant music access in this guild\n' +
                '> `&musicperm revoke @user` — revoke music access in this guild\n' +
                '> `&musicperm list` — list all permitted users in this guild\n' +
                '> `&musicperm grantall @user` — grant access across all guilds\n' +
                '> `&musicperm revokeall @user` — revoke access across all guilds\n\n' +
                '-# Only bot owners can use this command.'
            ));
        }

        const target = message.mentions.users.first()
            ?? (args[1] && /^\d{15,20}$/.test(args[1])
                ? await client.users.fetch(args[1]).catch(() => null)
                : null);

        if (!target) {
            return message.reply(panel(0xED4245,
                '##  No User Specified\n> Please mention a user or provide their ID.\n> Example: `&musicperm grant @user`'
            ));
        }

        if (target.bot) {
            return message.reply(panel(0xED4245,
                '##  Invalid Target\n> You cannot grant music permissions to a bot.'
            ));
        }

        // ── grant ─────────────────────────────────────────────────────────────
        if (sub === 'grant') {
            const exists = await MusicPermission.findOne({ guildId: message.guild.id, userId: target.id });
            if (exists) {
                return message.reply(panel(0xFBBF24,
                    `##  Already Granted\n> **${target.tag}** already has music access in this guild.`
                ));
            }
            await MusicPermission.create({
                guildId: message.guild.id,
                userId: target.id,
                grantedBy: message.author.id,
            });
            return message.reply(panel(0x57F287,
                `##  Music Access Granted\n` +
                `> **${target.tag}** can now use all music commands in **${message.guild.name}**.\n` +
                `> Granted by: ${message.author.tag}`
            ));
        }

        // ── revoke ────────────────────────────────────────────────────────────
        if (sub === 'revoke') {
            const deleted = await MusicPermission.findOneAndDelete({ guildId: message.guild.id, userId: target.id });
            if (!deleted) {
                return message.reply(panel(0xFBBF24,
                    `##  Not Found\n> **${target.tag}** doesn't have music access in this guild.`
                ));
            }
            return message.reply(panel(0xED4245,
                `##  Music Access Revoked\n` +
                `> **${target.tag}** can no longer use music commands in **${message.guild.name}**.\n` +
                `> Revoked by: ${message.author.tag}`
            ));
        }

        // ── grantall (every guild the bot is in) ──────────────────────────────
        if (sub === 'grantall') {
            const guildIds = [...client.guilds.cache.keys()];
            let count = 0;
            for (const guildId of guildIds) {
                const exists = await MusicPermission.findOne({ guildId, userId: target.id });
                if (!exists) {
                    await MusicPermission.create({ guildId, userId: target.id, grantedBy: message.author.id });
                    count++;
                }
            }
            return message.reply(panel(0x57F287,
                `##  Global Music Access Granted\n` +
                `> **${target.tag}** now has music access in **${count}** guild(s) (${guildIds.length} total).\n` +
                `> Granted by: ${message.author.tag}`
            ));
        }

        // ── revokeall ─────────────────────────────────────────────────────────
        if (sub === 'revokeall') {
            const result = await MusicPermission.deleteMany({ userId: target.id });
            return message.reply(panel(0xED4245,
                `##  Global Music Access Revoked\n` +
                `> Removed **${result.deletedCount}** permission(s) for **${target.tag}** across all guilds.\n` +
                `> Revoked by: ${message.author.tag}`
            ));
        }
    },
};
