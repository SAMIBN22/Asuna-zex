import mongoose from 'mongoose';

const TweetConfigSchema = new mongoose.Schema({
    guildId:        { type: String, required: true, unique: true },
    panelChannelId: { type: String, default: null },  // channel where the tweet panel lives
    tweetChannelId: { type: String, default: null },  // channel where generated tweets are posted
    enabled:        { type: Boolean, default: true },
    showStats:      { type: Boolean, default: true },
    showVerified:   { type: Boolean, default: true },
    createdAt:      { type: Date, default: Date.now },
    updatedAt:      { type: Date, default: Date.now },
});

TweetConfigSchema.statics.get = async function (guildId) {
    const doc = await this.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
};

export default mongoose.models.TweetConfig || mongoose.model('TweetConfig', TweetConfigSchema);
