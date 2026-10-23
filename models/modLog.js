import mongoose from 'mongoose';

const ModLogSchema = new mongoose.Schema({
    guildId:      { type: String, required: true },
    userId:       { type: String, required: true },
    moderatorId:  { type: String, required: true },
    type:         { type: String, required: true }, // mute, unmute, kick, ban, move, note, etc.
    reason:       { type: String, default: 'No reason provided' },
    date:         { type: Date, default: Date.now },
}, { strict: false });

ModLogSchema.index({ guildId: 1, userId: 1 });

export default mongoose.models.ModLog || mongoose.model('ModLog', ModLogSchema);
