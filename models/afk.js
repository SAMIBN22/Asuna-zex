import mongoose from 'mongoose';

const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    message: { type: String, default: 'AFK' },
    timestamp: { type: Date, default: Date.now }
});

afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('AFK', afkSchema);
