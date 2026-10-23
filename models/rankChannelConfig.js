/**
 * Stores the "rank display" channel per guild.
 * When a channel is configured, &rankroles automatically posts or updates
 * the public rank list there whenever ranks are added or removed.
 */
import mongoose from 'mongoose';

const RankChannelConfigSchema = new mongoose.Schema({
    guildId:    { type: String, required: true, unique: true },
    channelId:  { type: String, required: true },
    messageId:  { type: String, default: null },   // ID of the last posted rank list message
    updatedAt:  { type: Date,   default: Date.now },
});

RankChannelConfigSchema.statics.getForGuild = function (guildId) {
    return this.findOne({ guildId }).lean();
};

RankChannelConfigSchema.statics.setForGuild = function (guildId, channelId, messageId = null) {
    return this.findOneAndUpdate(
        { guildId },
        { $set: { channelId, messageId, updatedAt: new Date() } },
        { upsert: true, new: true }
    );
};

export default mongoose.models.RankChannelConfig ||
    mongoose.model('RankChannelConfig', RankChannelConfigSchema);
