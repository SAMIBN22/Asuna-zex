/**
 * Music command guard utilities.
 *
 * Permission hierarchy (checked in order):
 *   1. Bot owner  (devIds in config)          → always allowed
 *   2. Music-permitted user  (MusicPermission) → allowed in this guild
 *   3. Everyone else                           → denied
 */
import MusicPermission from '../models/musicPermission.js';
import config          from '../config/config.js';
import emojis         from './musicEmojis.js';

const OWNER_IDS = (config.devIds || []).map(String);

/**
 * Checks that the Riffy music backend is available and a node is connected.
 * Returns true if ready, or sends a user-facing error and returns false.
 */
export function requireRiffy(message) {
    const riffy = message.client.riffy;
    if (!riffy) {
        message.reply(
            `${emojis.error} | The music system is currently unavailable. Please try again later.`
        ).catch(() => {});
        return false;
    }
    // Check that at least one node is connected
    const hasNode = [...(riffy.nodeMap?.values() ?? [])].some(n => n.connected);
    if (!hasNode) {
        message.reply(
            `${emojis.error} | No music nodes are connected right now. Please try again in a moment.`
        ).catch(() => {});
        return false;
    }
    return true;
}

/**
 * Returns true if the user may use music commands in this guild.
 */
export async function isMusicAllowed(userId, guildId) {
    if (OWNER_IDS.includes(String(userId))) return true;
    const doc = await MusicPermission.findOne({ guildId, userId: String(userId) });
    return !!doc;
}

/**
 * Sends a clean "Access Denied" embed and returns false.
 * Use as:  if (!await musicGuard(message)) return;
 */
export async function musicGuard(message) {
    const allowed = await isMusicAllowed(message.author.id, message.guild.id);
    if (allowed) return true;

    await message.reply({
        content:
            `${emojis.error} **Music Access Denied**\n` +
            `> You don't have permission to use music commands.\n` +
            `> Ask a bot owner to grant you access with \`&musicperm grant @you\`.`,
    }).catch(() => {});
    return false;
}

/**
 * Checks that the user is in a voice channel.
 * Returns the voice channel, or sends an error and returns null.
 */
export async function requireVoice(message) {
    const vc = message.member?.voice?.channel;
    if (!vc) {
        await message.reply(`${emojis.error} | You must be in a voice channel to use this command.`).catch(() => {});
        return null;
    }
    return vc;
}

/**
 * Gets the active player for this guild, or sends an error and returns null.
 */
export function requirePlayer(message) {
    const player = message.client.riffy?.players?.get(message.guild.id);
    if (!player) {
        message.reply(`${emojis.error} | Nothing is currently playing.`).catch(() => {});
        return null;
    }
    return player;
}
