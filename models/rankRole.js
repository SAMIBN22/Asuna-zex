import mongoose from 'mongoose';

const RankRoleSchema = new mongoose.Schema({
    guildId:       { type: String, required: true },
    track:         { type: String, enum: ['voice', 'text'], required: true },
    level:         { type: Number, required: true },
    roleId:        { type: String, required: true },
    perk:          { type: String, default: '' },
    timeEstimate:  { type: String, default: '' },   // e.g. "~2 months, 1 week"
    createdAt:     { type: Date, default: Date.now },
});

RankRoleSchema.index({ guildId: 1, track: 1, level: 1 }, { unique: true });

RankRoleSchema.statics.getForGuild = async function (guildId, track) {
    const query = { guildId };
    if (track) query.track = track;
    return this.find(query).sort({ level: -1 }).lean();
};

RankRoleSchema.statics.upsertRankRole = async function (guildId, track, level, roleId, perk = '', timeEstimate = '') {
    return this.findOneAndUpdate(
        { guildId, track, level },
        { $set: { roleId, perk, timeEstimate } },
        { upsert: true, new: true }
    );
};

const RankRole = mongoose.model('RankRole', RankRoleSchema);
export default RankRole;
