import mongoose from 'mongoose';

const InviteStatsSchema = new mongoose.Schema({
    guildId:      { type: String, required: true },
    userId:       { type: String, required: true },
    uses:         { type: Number, default: 0 },
    left:         { type: Number, default: 0 },
    banned:       { type: Number, default: 0 },
    kicked:       { type: Number, default: 0 },
    invitedUsers: { type: Map, of: Boolean, default: {} },
}, { strict: false });

InviteStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.InviteStats || mongoose.model('InviteStats', InviteStatsSchema);
