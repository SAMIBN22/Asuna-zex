import mongoose from 'mongoose';

const LogConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },

    // ── Member Events ─────────────────────────────────────────────────
    memberJoin:    { type: String, default: null },
    memberLeave:   { type: String, default: null },
    memberBan:     { type: String, default: null },
    memberUnban:   { type: String, default: null },
    memberTimeout: { type: String, default: null },

    // ── Message Events ────────────────────────────────────────────────
    messageDel:  { type: String, default: null },
    messageEdit: { type: String, default: null },

    // ── Member Update Events ──────────────────────────────────────────
    roleAdd:    { type: String, default: null },
    roleRemove: { type: String, default: null },
    nickChange: { type: String, default: null },

    // ── Server Structure Events ───────────────────────────────────────
    channelCreate: { type: String, default: null },
    channelDelete: { type: String, default: null },
    roleCreate:    { type: String, default: null },
    roleDelete:    { type: String, default: null },

    // ── Voice Events ──────────────────────────────────────────────────
    voiceJoin:  { type: String, default: null },
    voiceLeave: { type: String, default: null },
    voiceMove:  { type: String, default: null },

    // ── Server Events ─────────────────────────────────────────────────
    serverUpdate:  { type: String, default: null },
    inviteCreate:  { type: String, default: null },
    inviteDelete:  { type: String, default: null },

}, { timestamps: true });

export default mongoose.models.LogConfig || mongoose.model('LogConfig', LogConfigSchema);
