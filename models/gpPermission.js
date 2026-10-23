import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    commands:  { type: [String], default: [] },
    expiresAt: { type: Date,   default: null },   // null = lifetime
    grantedAt: { type: Date,   default: Date.now },
});

schema.index({ guildId: 1, userId: 1 }, { unique: true });

/** Returns true if the grant is still valid (not expired). */
schema.methods.isActive = function () {
    if (!this.expiresAt) return true;
    return new Date() < this.expiresAt;
};

/**
 * Check whether a user may run `commandName` in `guildId`.
 * Also cleans up expired records silently.
 */
schema.statics.can = async function (userId, guildId, commandName) {
    const doc = await this.findOne({ userId, guildId });
    if (!doc) return false;
    if (doc.expiresAt && new Date() >= doc.expiresAt) {
        await doc.deleteOne().catch(() => {});
        return false;
    }
    return doc.commands.includes(commandName);
};

export default mongoose.model('GpPermission', schema);
