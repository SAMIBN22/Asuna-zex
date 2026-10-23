/**
 * Voice XP Tracker
 * Tracks when users join/leave voice channels.
 * - Every 2 minutes a user is in voice they earn 2 voice-minutes + 2 XP.
 * - Every 10 seconds, exact elapsed seconds are flushed to voiceSeconds
 *   so total voice time can be reported down to the second, in real time.
 */
import Profile from '../models/profile.js';
import { applyRankRoles } from './rankRoleManager.js';

// key: `${userId}-${guildId}` → { joinedAt, lastAward, lastSecFlush }
const sessions = new Map();

let _client = null;
let _tickerStarted = false; // guard — prevent duplicate intervals if called more than once

Profile.backfillVoiceSeconds().catch(() => {});

async function syncRankRole(userId, guildId, leveledUp, newLevel) {
    if (!leveledUp || !_client) return;
    try {
        const guild = _client.guilds.cache.get(guildId);
        if (!guild) return;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) await applyRankRoles(member, guildId, 'voice', newLevel);
    } catch { /* never break voice tracking */ }
}

export function onJoin(userId, guildId) {
    const key = `${userId}-${guildId}`;
    if (!sessions.has(key)) {
        const now = Date.now();
        sessions.set(key, { joinedAt: now, lastAward: now, lastSecFlush: now });
    }
}

/**
 * Returns how many milliseconds a user has been continuously connected
 * to voice in this guild right now, or null if they aren't in voice.
 */
export function getLiveSessionMs(userId, guildId) {
    const key = `${userId}-${guildId}`;
    const session = sessions.get(key);
    if (!session) return null;
    return Date.now() - session.joinedAt;
}

/**
 * Returns the exact number of unflushed milliseconds since the last
 * second-precision DB flush for this user's current session, or 0 if
 * they aren't in voice. Add this to profile.voiceSeconds for a live,
 * to-the-second total.
 */
export function getUnflushedMs(userId, guildId) {
    const key = `${userId}-${guildId}`;
    const session = sessions.get(key);
    if (!session) return 0;
    return Math.max(0, Date.now() - session.lastSecFlush);
}

export function onLeave(userId, guildId) {
    const key = `${userId}-${guildId}`;
    const session = sessions.get(key);
    if (!session) return;

    const now = Date.now();

    // Flush exact remaining seconds
    const exactSeconds = Math.floor((now - session.lastSecFlush) / 1000);
    if (exactSeconds > 0) {
        Profile.addVoiceSeconds(userId, guildId, exactSeconds).catch(() => {});
    }

    // Award XP in 2-minute blocks
    const elapsed = Math.floor((now - session.lastAward) / 60_000); // minutes
    const blocks  = Math.floor(elapsed / 2);
    if (blocks > 0) {
        const minutes = blocks * 2;
        Profile.addVoiceMinutes(userId, guildId, minutes).catch(() => {});
        Profile.addVoiceXp(userId, guildId, minutes)
            .then(({ leveledUp, newLevel } = {}) => syncRankRole(userId, guildId, leveledUp, newLevel))
            .catch(() => {});
    }

    sessions.delete(key);
}

/**
 * Start the trackers. Call once from ready.js.
 * - XP ticker: every 2 minutes.
 * - Exact-seconds ticker: every 10 seconds, so &top and "My Voice Time"
 *   reflect real, precise time instead of rounded minutes.
 */
export function startVoiceTicker(client) {
    _client = client;

    // Guard — prevent duplicate intervals if called more than once (e.g. on reconnect)
    if (_tickerStarted) return;
    _tickerStarted = true;

    // XP ticker (2-minute blocks)
    setInterval(async () => {
        const now = Date.now();
        for (const [key, session] of sessions) {
            const elapsed = Math.floor((now - session.lastAward) / 60_000);
            const blocks  = Math.floor(elapsed / 2);
            if (blocks < 1) continue;

            const [userId, guildId] = key.split('-');
            const minutes = blocks * 2;
            try {
                await Profile.addVoiceMinutes(userId, guildId, minutes);
                const { leveledUp, newLevel } = await Profile.addVoiceXp(userId, guildId, minutes);
                session.lastAward = now;
                await syncRankRole(userId, guildId, leveledUp, newLevel);
            } catch { /* ignore DB errors */ }
        }
    }, 2 * 60 * 1000);

    // Exact-seconds ticker (real, to-the-second precision)
    setInterval(async () => {
        const now = Date.now();
        for (const [key, session] of sessions) {
            const seconds = Math.floor((now - session.lastSecFlush) / 1000);
            if (seconds < 1) continue;

            const [userId, guildId] = key.split('-');
            try {
                await Profile.addVoiceSeconds(userId, guildId, seconds);
                session.lastSecFlush += seconds * 1000;
            } catch { /* ignore DB errors */ }
        }
    }, 10 * 1000);
}
