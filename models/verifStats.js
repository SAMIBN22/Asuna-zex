import mongoose from 'mongoose';

const VerifStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId:  { type: String, required: true },
    count:   { type: Number, default: 0 },
});

VerifStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.VerifStats || mongoose.model('VerifStats', VerifStatsSchema);
