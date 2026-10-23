/**
 * Stores per-guild music access grants.
 * By default only bot owners can use music commands.
 * The &musicperm command lets owners explicitly grant access to other users.
 */
import mongoose from 'mongoose';

const MusicPermissionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId:  { type: String, required: true },
    grantedBy: { type: String, required: true },
    grantedAt: { type: Date, default: Date.now },
});

MusicPermissionSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.models.MusicPermission ||
    mongoose.model('MusicPermission', MusicPermissionSchema);
