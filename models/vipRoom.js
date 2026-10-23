import mongoose from 'mongoose';

const VipRoomSchema = new mongoose.Schema({
    guildId:        { type: String, required: true },
    ownerId:        { type: String, required: true },
    voiceChannelId: { type: String, required: true, unique: true },
    textChannelId:  { type: String, default: null },
    roleId:         { type: String, default: null },
    roomName:       { type: String, default: 'VIP Room' },
    locked:         { type: Boolean, default: false },
    hidden:         { type: Boolean, default: false },
    managers:       { type: [String], default: [] },
    mutedUsers:     { type: [String], default: [] },
    createdAt:      { type: Date, default: Date.now },
}, { strict: false });

export default mongoose.models.VipRoom || mongoose.model('VipRoom', VipRoomSchema);
