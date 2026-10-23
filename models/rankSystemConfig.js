import mongoose from 'mongoose';

const RankSystemConfigSchema = new mongoose.Schema({
    guildId:     { type: String, required: true, unique: true },
    enabled:     { type: Boolean, default: false },
    timeAmount:  { type: Number,  default: 10 },
    timeUnit:    { type: String,  default: 'minute', enum: ['second', 'minute', 'hour', 'day'] },
    rankRole:    { type: String,  default: null },   // required role to participate
    rankChannel: { type: String,  default: null },   // channel for level-up messages
    updatedAt:   { type: Date,    default: Date.now },
});

RankSystemConfigSchema.statics.getForGuild = async function (guildId) {
    const doc = await this.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
};

export default mongoose.models.RankSystemConfig ||
    mongoose.model('RankSystemConfig', RankSystemConfigSchema);
