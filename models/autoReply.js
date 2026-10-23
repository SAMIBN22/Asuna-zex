import mongoose from 'mongoose';

/**
 * AutoReply — stores per-user auto-reply configs.
 * When a user in this collection sends a message, the bot automatically
 * replies with the configured text.
 */
const AutoReplySchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    replyText: { type: String, required: true },
    addedBy:   { type: String, default: null },
    addedAt:   { type: Date,   default: Date.now },
}, { strict: false });

AutoReplySchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.AutoReply || mongoose.model('AutoReply', AutoReplySchema);
