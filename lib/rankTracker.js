/**
 * Rank time tracker — hooks into existing message + voice events.
 * Text: 1 second per qualifying message (60s cooldown per user per guild).
 * Voice: tracks join time, credits duration on leave.
 */
import RankSystemConfig             from '../models/rankSystemConfig.js';
import UserRankTime                 from '../models/userRankTime.js';
import { checkAndApplyLevelUp, sendLevelUpMessage } from './rankCore.js';

// userId:guildId → last message credit timestamp (ms)
const textCooldowns  = new Map();
// userId:guildId → voice join timestamp (ms)
const voiceJoinTimes = new Map();

const TEXT_COOLDOWN_MS = 60_000; // 1 minute between text credits

// ── Text tracking ─────────────────────────────────────────────────────────────

export async function trackTextMessage(message, client) {
    try {
        if (!message.guild || message.author.bot) return;
        const { id: userId } = message.author;
        const guildId        = message.guild.id;

        const cfg = await RankSystemConfig.getForGuild(guildId);
        if (!cfg.enabled) return;

        // Check if user has the required role (if set)
        if (cfg.rankRole) {
            const member = message.member || await message.guild.members.fetch(userId).catch(() => null);
            if (!member?.roles.cache.has(cfg.rankRole)) return;
        }

        // Cooldown — one credit per minute
        const key  = `${userId}:${guildId}`;
        const last = textCooldowns.get(key) || 0;
        if (Date.now() - last < TEXT_COOLDOWN_MS) return;
        textCooldowns.set(key, Date.now());

        // Add 1 second of text time
        await UserRankTime.addTime(userId, guildId, 1, 'text');

        // Check level up
        const result = await checkAndApplyLevelUp(guildId, userId);
        if (result) {
            await sendLevelUpMessage(client, guildId, userId, result.oldLevel, result.newLevel);
        }
    } catch (e) {
        console.error('[RankTracker] trackTextMessage error:', e.message);
    }
}

// ── Voice tracking ────────────────────────────────────────────────────────────

export function trackVoiceJoin(userId, guildId) {
    voiceJoinTimes.set(`${userId}:${guildId}`, Date.now());
}

export async function trackVoiceLeave(userId, guildId, client) {
    try {
        const key   = `${userId}:${guildId}`;
        const start = voiceJoinTimes.get(key);
        if (!start) return;
        voiceJoinTimes.delete(key);

        const seconds = Math.floor((Date.now() - start) / 1000);
        if (seconds < 5) return; // ignore very short joins

        const cfg = await RankSystemConfig.getForGuild(guildId);
        if (!cfg.enabled) return;

        await UserRankTime.addTime(userId, guildId, seconds, 'voice');

        const result = await checkAndApplyLevelUp(guildId, userId);
        if (result) {
            await sendLevelUpMessage(client, guildId, userId, result.oldLevel, result.newLevel);
        }
    } catch (e) {
        console.error('[RankTracker] trackVoiceLeave error:', e.message);
    }
}
