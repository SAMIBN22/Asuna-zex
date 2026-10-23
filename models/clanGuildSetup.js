import mongoose from 'mongoose';

const ClanGuildSetupSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  categoryId: { type: String, default: null },
  categoryVoiceId: { type: String, default: null },
  logChannelId: { type: String, default: null },
  roles: {
    leader: { type: String, default: null },
    coLeader: { type: String, default: null },
    manager: { type: String, default: null }
  },
  members: { type: [String], default: [] },
  prefix: { type: String, default: '&' }
}, { timestamps: true });

export default mongoose.models.ClanGuildSetup || mongoose.model('ClanGuildSetup', ClanGuildSetupSchema);
