import mongoose from 'mongoose';

const ClanConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  clanId: { type: String, required: true, unique: true },
  name: { type: String, required: true, default: "none" },
  leaders: { type: [String], default: [] },
  coLeaders: { type: [String], default: [] },
  members: { type: [String], default: [] },
  roleId: { type: String, required: true, default: "none" },
  avatar: { type: String, default: null },
  banner: { type: String, default: null },
  color: { type: String, default: '#c5c500' },
  channels: {
    text: { type: String, default: null },
    voice: { type: String, default: null }
  },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  time: { type: Number, default: 0 }
});

export default mongoose.models.ClanConfig || mongoose.model('ClanConfig', ClanConfigSchema);
