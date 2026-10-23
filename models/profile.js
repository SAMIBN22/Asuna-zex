import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
    userId:       { type: String, required: true },
    guildId:      { type: String, required: true },
    credits:          { type: Number,  default: 0 },
    infiniteCredits:  { type: Boolean, default: false },
    rep:          { type: Number, default: 0 },
    level:        { type: Number, default: 1 },
    xp:           { type: Number, default: 0 },
    totalXp:      { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    voiceSeconds: { type: Number, default: 0 },
    voiceXp:      { type: Number, default: 0 },
    voiceLevel:   { type: Number, default: 1 },
    voiceTotalXp: { type: Number, default: 0 },
    textXp:       { type: Number, default: 0 },
    textLevel:    { type: Number, default: 1 },
    textTotalXp:  { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    lastMessage:  { type: Date,   default: null },
    lastXp:       { type: Date,   default: null },
    backgrounds:  { type: [String], default: [] },   // purchased background URLs
    activeBg:     { type: String,  default: null },  // currently active background URL
    createdAt:    { type: Date,   default: Date.now },
    updatedAt:    { type: Date,   default: Date.now },
});

ProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

ProfileSchema.statics.getProfile = async function (userId, guildId) {
    const profile = await this.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return profile;
};

ProfileSchema.statics.getRank = async function (userId, guildId) {
    const userProfile = await this.findOne({ userId, guildId });
    if (!userProfile) return 1;
    const above = await this.countDocuments({ guildId, totalXp: { $gt: userProfile.totalXp } });
    return above + 1;
};

ProfileSchema.statics.getRequiredXp = function (level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

ProfileSchema.statics.addXp = async function (userId, guildId, amount) {
    const profile = await this.getProfile(userId, guildId);
    profile.xp      += amount;
    profile.totalXp += amount;
    const required = this.getRequiredXp(profile.level);
    if (profile.xp >= required) {
        profile.xp   -= required;
        profile.level += 1;
    }
    profile.updatedAt = new Date();
    await profile.save();
    return profile;
};

ProfileSchema.statics.addVoiceMinutes = async function (userId, guildId, minutes) {
    const xpGain = minutes * 1;
    await this.findOneAndUpdate(
        { userId, guildId },
        {
            $inc: { voiceMinutes: minutes, xp: xpGain, totalXp: xpGain },
            $set: { updatedAt: new Date() }
        },
        { upsert: true }
    );
    // Handle level-up separately
    const profile = await this.findOne({ userId, guildId });
    if (profile) {
        const required = this.getRequiredXp(profile.level);
        if (profile.xp >= required) {
            profile.xp   -= required;
            profile.level += 1;
            await profile.save();
        }
    }
};

ProfileSchema.statics.addVoiceSeconds = async function (userId, guildId, seconds) {
    if (seconds <= 0) return;
    await this.findOneAndUpdate(
        { userId, guildId },
        {
            $inc: { voiceSeconds: seconds },
            $set: { updatedAt: new Date() }
        },
        { upsert: true }
    );
};

// Linear leveling used for the dual Voice/Text experience system (&lvl):
// each level requires level * 1000 XP, matching a simple, predictable curve.
ProfileSchema.statics.getRequiredTrackXp = function (level) {
    return level * 1000;
};

ProfileSchema.statics.addVoiceXp = async function (userId, guildId, amount) {
    if (amount <= 0) return { leveledUp: false, newLevel: null };
    await this.findOneAndUpdate(
        { userId, guildId },
        { $inc: { voiceXp: amount, voiceTotalXp: amount }, $set: { updatedAt: new Date() } },
        { upsert: true }
    );
    const profile = await this.findOne({ userId, guildId });
    if (!profile) return { leveledUp: false, newLevel: null };
    let required = this.getRequiredTrackXp(profile.voiceLevel);
    let leveledUp = false;
    while (profile.voiceXp >= required) {
        profile.voiceXp -= required;
        profile.voiceLevel += 1;
        required = this.getRequiredTrackXp(profile.voiceLevel);
        leveledUp = true;
    }
    if (leveledUp) await profile.save();
    return { leveledUp, newLevel: profile.voiceLevel };
};

ProfileSchema.statics.addTextXp = async function (userId, guildId, amount) {
    if (amount <= 0) return { leveledUp: false, newLevel: null };
    await this.findOneAndUpdate(
        { userId, guildId },
        { $inc: { textXp: amount, textTotalXp: amount }, $set: { updatedAt: new Date() } },
        { upsert: true }
    );
    const profile = await this.findOne({ userId, guildId });
    if (!profile) return { leveledUp: false, newLevel: null };
    let required = this.getRequiredTrackXp(profile.textLevel);
    let leveledUp = false;
    while (profile.textXp >= required) {
        profile.textXp -= required;
        profile.textLevel += 1;
        required = this.getRequiredTrackXp(profile.textLevel);
        leveledUp = true;
    }
    if (leveledUp) await profile.save();
    return { leveledUp, newLevel: profile.textLevel };
};

ProfileSchema.statics.getVoiceRank = async function (userId, guildId) {
    const userProfile = await this.findOne({ userId, guildId });
    if (!userProfile) return 1;
    const above = await this.countDocuments({ guildId, voiceTotalXp: { $gt: userProfile.voiceTotalXp } });
    return above + 1;
};

ProfileSchema.statics.getTextRank = async function (userId, guildId) {
    const userProfile = await this.findOne({ userId, guildId });
    if (!userProfile) return 1;
    const above = await this.countDocuments({ guildId, textTotalXp: { $gt: userProfile.textTotalXp } });
    return above + 1;
};

ProfileSchema.statics.backfillVoiceSeconds = async function () {
    try {
        await this.updateMany(
            { $or: [{ voiceSeconds: { $exists: false } }, { voiceSeconds: 0 }], voiceMinutes: { $gt: 0 } },
            [{ $set: { voiceSeconds: { $multiply: ['$voiceMinutes', 60] } } }]
        );
    } catch { /* ignore migration errors */ }
};

ProfileSchema.statics.trackMessage = async function (userId, guildId) {
    const cooldownMs = 60_000;
    const profile = await this.getProfile(userId, guildId);
    const now     = Date.now();
    const last    = profile.lastXp ? profile.lastXp.getTime() : 0;

    profile.messageCount += 1;
    let textGain = 0;
    if (now - last >= cooldownMs) {
        const gain = Math.floor(Math.random() * 5) + 3;
        textGain = gain;
        profile.xp      += gain;
        profile.totalXp += gain;
        profile.lastXp  = new Date(now);
        const required = this.getRequiredXp(profile.level);
        if (profile.xp >= required) {
            profile.xp   -= required;
            profile.level += 1;
        }
    }
    profile.updatedAt = new Date();
    await profile.save();

    // Independent Text Experience track (used by &lvl)
    let textResult = { leveledUp: false, newLevel: null };
    if (textGain > 0) {
        textResult = await this.addTextXp(userId, guildId, textGain);
    }
    return textResult;
};

const Profile = mongoose.model('Profile', ProfileSchema);
export default Profile;
