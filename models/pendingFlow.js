/**
 * Stores pending Add-Rank flow data while waiting for the role select.
 * Keyed by flowId (encoded in the role-select custom ID).
 * TTL index auto-deletes entries after 10 minutes.
 *
 * Using MongoDB instead of in-memory ensures the data survives bot restarts,
 * so a user who fills the modal just before a restart can still select the role.
 */
import mongoose from 'mongoose';

const PendingFlowSchema = new mongoose.Schema({
    flowId:       { type: String, required: true, unique: true },
    track:        { type: String, enum: ['voice', 'text'], required: true },
    level:        { type: Number, required: true },
    perk:         { type: String, default: '' },
    timeEstimate: { type: String, default: '' },
    expiresAt:    { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
});

// MongoDB TTL: automatically removes documents when expiresAt is reached.
PendingFlowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingFlow ||
    mongoose.model('PendingFlow', PendingFlowSchema);
