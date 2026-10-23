import InviterLog from '../models/inviterLog.js';

export async function getInviter(guildId, userId) {
    try {
        const doc = await InviterLog.findOne({ guildId, userId }).lean();
        return doc?.inviterId || null;
    } catch (err) {
        console.error('[InviterTracker] getInviter error:', err);
        return null;
    }
}

export async function setInviter(guildId, userId, inviterId) {
    if (!inviterId) return;
    try {
        await InviterLog.findOneAndUpdate(
            { guildId, userId },
            { guildId, userId, inviterId },
            { upsert: true }
        );
    } catch (err) {
        console.error('[InviterTracker] setInviter error:', err);
    }
}
