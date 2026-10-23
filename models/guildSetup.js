
import mongoose from 'mongoose';

const GuildSetupSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    type: { type: String, default: 'prime-room' }, // 'prime-room', 'jail-record', etc.

    // For Prime Rooms
    name: { type: String, default: null },
    ownerId: { type: String, default: null },
    roleId: { type: String, default: null },
    channelId: { type: String, default: null },
    managers: { type: [String], default: [] },
    allowedUsers: { type: [String], default: [] },
    rejectedUsers: { type: [String], default: [] },

    // For Jail Records
    userId: { type: String, default: null },
    savedRoles: { type: [String], default: [] },
    jailedBy: { type: String, default: null },
    reason: { type: String, default: null },
    isActive: { type: Boolean, default: false },
    jailedAt: { type: Date, default: Date.now },

    createdAt: { type: Date, default: Date.now }
}, { strict: false, autoIndex: false });

export default mongoose.models.GuildSetup || mongoose.model('GuildSetup', GuildSetupSchema);
