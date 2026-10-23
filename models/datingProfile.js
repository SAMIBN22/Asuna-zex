import mongoose from 'mongoose';

const datingProfileSchema = new mongoose.Schema({
    userId:         { type: String, required: true },
    guildId:        { type: String, required: true },
    name:           { type: String, default: null },
    age:            { type: String, default: null },
    gender:         { type: String, default: null },   // 'Male' | 'Female' | 'Other'
    intention:      { type: String, default: null },   // 'Friendship' | 'Dating' | 'Relationship'
    bio:            { type: String, default: null },
    picture:        { type: String, default: null },   // image URL
    invitesEnabled: { type: Boolean, default: true },
}, { timestamps: true });

datingProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('DatingProfile', datingProfileSchema);
