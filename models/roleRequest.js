import mongoose from 'mongoose';

const roleRequestSchema = new mongoose.Schema({
    guildId:     { type: String, required: true, index: true },
    userId:      { type: String, required: true },
    roleId:      { type: String, required: true },
    categoryKey: { type: String, required: true },
    status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    decidedAt:   { type: Date, default: null },
    decidedBy:   { type: String, default: null },
    reason:      { type: String, default: null },
    logMessageId:   { type: String, default: null },
    logChannelId:   { type: String, default: null },
});

roleRequestSchema.index({ guildId: 1, userId: 1, roleId: 1, status: 1 });

export default mongoose.models.RoleRequest ||
    mongoose.model('RoleRequest', roleRequestSchema);
