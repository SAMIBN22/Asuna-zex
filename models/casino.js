import mongoose from 'mongoose';

const casinoSchema = new mongoose.Schema({
    userId:     { type: String, required: true },
    guildId:    { type: String, required: true },
    wallet:     { type: Number, default: 500 },
    bank:       { type: Number, default: 0 },
    bankLimit:  { type: Number, default: 10000 },
    lastDaily:  { type: Date, default: null },
    lastWeekly: { type: Date, default: null },
    lastWork:   { type: Date, default: null },
    lastCrime:  { type: Date, default: null },
    lastFish:   { type: Date, default: null },
    lastRob:    { type: Date, default: null },
    lastBankRob:{ type: Date, default: null },
    dailyStreak:{ type: Number, default: 0 },
});

casinoSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('Casino', casinoSchema);
