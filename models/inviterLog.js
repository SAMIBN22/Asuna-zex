import mongoose from 'mongoose';

const InviterLogSchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    inviterId: { type: String, default: null },
}, { strict: false });

InviterLogSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.InviterLog || mongoose.model('InviterLog', InviterLogSchema);
