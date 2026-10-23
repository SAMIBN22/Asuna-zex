// ─── Shared Moderation Action Log Helper ──────────────────────────────────────
import ModLog from '../models/modLog.js';

export async function logAction(guildId, userId, moderatorId, type, reason = 'No reason provided') {
    try {
        await ModLog.create({ guildId, userId, moderatorId, type, reason });
    } catch (err) {
        console.error('[ModLog] Failed to log action:', err);
    }
}

export async function getLogs(guildId, userId, type = null) {
    const query = { guildId, userId };
    if (type) query.type = type;
    return ModLog.find(query).sort({ date: -1 });
}

export async function clearLogs(guildId, userId, type = null) {
    const query = { guildId, userId };
    if (type) query.type = type;
    const result = await ModLog.deleteMany(query);
    return result.deletedCount || 0;
}
