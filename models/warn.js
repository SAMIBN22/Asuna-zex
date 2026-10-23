import mongoose from 'mongoose';

const WarnSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    type: { type: String, enum: ['first', 'second', 'last'], required: true },
    date: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});

export default mongoose.models.Warn || mongoose.model('Warn', WarnSchema);
