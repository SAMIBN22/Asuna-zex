import mongoose from 'mongoose';

const UserRankTimeSchema = new mongoose.Schema({
    userId:    { type: String, required: true },
    guildId:   { type: String, required: true },
    level:     { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },   // seconds
    textTime:  { type: Number, default: 0 },   // seconds from messages
    voiceTime: { type: Number, default: 0 },   // seconds from voice
    updatedAt: { type: Date,   default: Date.now },
});

UserRankTimeSchema.index({ userId: 1, guildId: 1 }, { unique: true });

UserRankTimeSchema.statics.get = async function (userId, guildId) {
    const doc = await this.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { userId, guildId } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    return doc;
};

UserRankTimeSchema.statics.addTime = async function (userId, guildId, seconds, type = 'text') {
    const inc = { totalTime: seconds };
    if (type === 'text')  inc.textTime  = seconds;
    if (type === 'voice') inc.voiceTime = seconds;

    return this.findOneAndUpdate(
        { userId, guildId },
        { $inc: inc, $set: { updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' },
    );
};

export default mongoose.models.UserRankTime ||
    mongoose.model('UserRankTime', UserRankTimeSchema);
