import mongoose from 'mongoose';

const marriageSchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    users:     { type: [String], required: true },
    marriedAt: { type: Date, default: Date.now },
    children: [{
        name:    { type: String, required: true },
        addedAt: { type: Date, default: Date.now }
    }]
});

marriageSchema.index({ guildId: 1, users: 1 });

marriageSchema.statics.findByUser = function (guildId, userId) {
    return this.findOne({ guildId, users: userId });
};

marriageSchema.statics.arePartners = function (guildId, userIdA, userIdB) {
    return this.findOne({ guildId, users: { $all: [userIdA, userIdB] } });
};

export default mongoose.model('Marriage', marriageSchema);
