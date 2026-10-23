import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    roleIds: { type: [String], default: [] },
}, { _id: false });

const roleRequestConfigSchema = new mongoose.Schema({
    guildId:        { type: String, required: true, unique: true },
    panelChannelId: { type: String, default: null },
    logsChannelId:  { type: String, default: null },
    panelMessageId: { type: String, default: null },
    animatedImageUrl: { type: String, default: null },
    enabled:        { type: Boolean, default: false },
    categories: {
        limited: { type: categorySchema, default: () => ({}) },
        powers:  { type: categorySchema, default: () => ({}) },
        special: { type: categorySchema, default: () => ({}) },
        girls:   { type: categorySchema, default: () => ({}) },
        custom:  { type: categorySchema, default: () => ({}) },
    },
    updatedAt: { type: Date, default: Date.now },
});

roleRequestConfigSchema.statics.get = async function (guildId) {
    const doc = await this.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
};

export default mongoose.models.RoleRequestConfig ||
    mongoose.model('RoleRequestConfig', roleRequestConfigSchema);
