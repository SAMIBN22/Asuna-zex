import mongoose from 'mongoose';

/**
 * StaffTask — stores tasks logged by staff members via &task.
 * Each document is one logged task entry.
 */
const StaffTaskSchema = new mongoose.Schema({
    guildId:     { type: String, required: true },
    userId:      { type: String, required: true },   // who logged it
    description: { type: String, required: true },
    category:    { type: String, default: 'General' },
    createdAt:   { type: Date,   default: Date.now  },
});

StaffTaskSchema.index({ guildId: 1, createdAt: -1 });
StaffTaskSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

export default mongoose.models.StaffTask ||
    mongoose.model('StaffTask', StaffTaskSchema);
