import mongoose from 'mongoose';

/**
 * AutoReact — stores per-user emoji auto-reaction configs.
 * When a user in this collection sends a message, the bot reacts
 * with the configured emoji automatically.
 */
const AutoReactSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId:  { type: String, required: true },
    emoji:   { type: String, required: true },
    addedBy: { type: String, default: null },
    addedAt: { type: Date,   default: Date.now },
}, { strict: false });

AutoReactSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);
