/**
 * voteSession.js
 * Mongoose model for the &vote giveaway/voting system.
 */
import mongoose from 'mongoose';

const contestantSchema = new mongoose.Schema({
    userId:      { type: String, required: true },
    username:    { type: String, default: 'Unknown' },
    displayName: { type: String, default: 'Unknown' },
    avatarUrl:   { type: String, default: null },
    votes:       { type: Number, default: 0 },
}, { _id: false });

const voteSessionSchema = new mongoose.Schema({
    guildId:        { type: String, required: true },
    adminId:        { type: String, required: true },
    contestants:    { type: [contestantSchema], default: [] },
    voterIds:       { type: [String],  default: [] }, // everyone who has voted
    durationMinutes:{ type: Number,  default: 5 },
    endsAt:         { type: Date,    default: null },
    panelChannelId: { type: String,  default: null },
    panelMessageId: { type: String,  default: null },
    ended:          { type: Boolean, default: false },
    winnerId:       { type: String,  default: null },
}, { timestamps: true });

const VoteSession = mongoose.models.VoteSession ||
    mongoose.model('VoteSession', voteSessionSchema);
export default VoteSession;
