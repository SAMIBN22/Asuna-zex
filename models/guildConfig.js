
import mongoose from 'mongoose';

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '&' },

    // Jail System Settings
    jailVCCategoryId: { type: String, default: null },
    jailLogsChannelId: { type: String, default: null },
    jailVCId: { type: String, default: null },
    jailerRoleId: { type: [String], default: [] },
    jailRoleId: { type: String, default: null },
    antiJailRoleId: { type: String, default: null },

    // Warn System Settings
    firstWarnRoleId: { type: String, default: null },
    secondWarnRoleId: { type: String, default: null },
    lastWarnRoleId: { type: String, default: null },
    warnerRoleIds: { type: [String], default: [] },
    warnLogsChannelId: { type: String, default: null },

    // Verification System Settings
    verifyVoiceChannelId: { type: String, default: null },
    verifyCategoryId: { type: String, default: null },
    verifyLogChannelId: { type: String, default: null },
    verifiedRoleId: { type: String, default: null },
    unverifiedRoleId: { type: String, default: null },
    verificatorsRoleIds: { type: [String], default: [] },
    femaleRoleId: { type: String, default: null },

    // Need Help System Settings
    templateChannelId: { type: String, default: null },
    helperRoleIds: { type: [String], default: [] },
    needHelpCategoryId: { type: String, default: null },
    needHelpLogsChannelId: { type: String, default: null },

    // Anti-Token Settings
    antiTokenEnabled: { type: Boolean, default: false },
    antiTokenAction: { type: String, default: 'delete' },
    antiTokenLogsChannel: { type: String, default: null },

    // Security Whitelist (Universal)
    whitelistedRoles: { type: [String], default: [] },
    whitelistedUsers: { type: [String], default: [] },

    // Security Module Settings
    antiLink: { type: Number, default: 0 },
    antiLinkAction: { type: String, default: 'none' },
    antiLinkReason: { type: String, default: null },

    antiBot: { type: Number, default: 0 },
    antiBotAction: { type: String, default: 'kick' },
    antiBotReason: { type: String, default: null },

    antiWebhook: { type: Number, default: 0 },
    antiWebhookAction: { type: String, default: 'none' },
    antiWebhookReason: { type: String, default: null },

    antiRaidEnabled: { type: Boolean, default: false },
    antiRaidLimit: { type: Number, default: 5 },
    antiRaidAction: { type: String, default: 'kick' },
    antiRaidReason: { type: String, default: null },

    antiBanEnabled: { type: Boolean, default: false },
    antiBanLimit: { type: Number, default: 3 },
    antiBanAction: { type: String, default: 'ban' },
    antiBanReason: { type: String, default: null },

    antiKickEnabled: { type: Boolean, default: false },
    antiKickLimit: { type: Number, default: 3 },
    antiKickAction: { type: String, default: 'ban' },
    antiKickReason: { type: String, default: null },

    antiMuteEnabled: { type: Boolean, default: false },
    antiMuteLimit: { type: Number, default: 5 },
    antiMuteAction: { type: String, default: 'kick' },
    antiMuteReason: { type: String, default: null },

    antiMoveEnabled: { type: Boolean, default: false },
    antiMoveLimit: { type: Number, default: 5 },
    antiMoveAction: { type: String, default: 'kick' },
    antiMoveReason: { type: String, default: null },

    // Advanced Anti-Nuke Settings
    antiChannelCreateEnabled: { type: Boolean, default: false },
    antiChannelCreateLimit: { type: Number, default: 3 },
    antiChannelCreateAction: { type: String, default: 'ban' },
    antiChannelCreateReason: { type: String, default: null },

    antiChannelDeleteEnabled: { type: Boolean, default: false },
    antiChannelDeleteLimit: { type: Number, default: 3 },
    antiChannelDeleteAction: { type: String, default: 'ban' },
    antiChannelDeleteReason: { type: String, default: null },

    antiChannelUpdateEnabled: { type: Boolean, default: false },
    antiChannelUpdateLimit: { type: Number, default: 5 },
    antiChannelUpdateAction: { type: String, default: 'ban' },
    antiChannelUpdateReason: { type: String, default: null },

    antiRoleCreateEnabled: { type: Boolean, default: false },
    antiRoleCreateLimit: { type: Number, default: 3 },
    antiRoleCreateAction: { type: String, default: 'ban' },
    antiRoleCreateReason: { type: String, default: null },

    antiRoleDeleteEnabled: { type: Boolean, default: false },
    antiRoleDeleteLimit: { type: Number, default: 3 },
    antiRoleDeleteAction: { type: String, default: 'ban' },
    antiRoleDeleteReason: { type: String, default: null },

    antiRoleUpdateEnabled: { type: Boolean, default: false },
    antiRoleUpdateLimit: { type: Number, default: 5 },
    antiRoleUpdateAction: { type: String, default: 'ban' },
    antiRoleUpdateReason: { type: String, default: null },

    antiGuildUpdateEnabled: { type: Boolean, default: false },
    antiGuildUpdateLimit: { type: Number, default: 3 },
    antiGuildUpdateAction: { type: String, default: 'ban' },
    antiGuildUpdateReason: { type: String, default: null },

    antiRolePermsUpdateEnabled: { type: Boolean, default: false },
    antiRolePermsUpdateLimit: { type: Number, default: 5 },
    antiRolePermsUpdateAction: { type: String, default: 'ban' },
    antiRolePermsUpdateReason: { type: String, default: null },

    // Move Command Blacklist
    moveBlacklist: { type: [String], default: [] },

    // Bot Join-On-Ready Voice Channel
    botJoinVoiceChannelId: { type: String, default: null },

    // Premium Settings
    premiumCategory: { type: String, default: null },

    // Theme Settings
    theme: { type: String, default: 'grey' },

    // No Prefix Settings
    noPrefixEnabled: { type: Boolean, default: true },
    noPrefixCommands: { type: [String], default: [] },

    // Custom Aliases
    customAliases: { type: Map, of: String, default: {} },

    // Auto-Nick Settings
    joinedTag: { type: String, default: null },
    joinedTagEnabled: { type: Boolean, default: false },
    autonickEnabled: { type: Boolean, default: false },
    autonickFormat: { type: String, default: null },

    // Sus and Warn Records
    suspendedUsers: { type: [String], default: [] },
    warns: { type: Map, of: Number, default: {} }, // userId -> count

    // Custom Permit Users (Bot Management)
    customPermitUsers: { type: [String], default: [] },

    // Max Warn System
    maxWarnLimit: { type: Number, default: 0 },
    maxWarnAction: { type: String, default: 'kick' },

    // Daily Moderation Limits
    dailyKickLimit: { type: Number, default: 0 },
    dailyBanLimit: { type: Number, default: 0 },
    dailyTimeoutLimit: { type: Number, default: 0 },

    // Welcome Card Settings
    welcomeCardBackground: { type: String, default: null },

    // VIP Room System Settings
    vipRoomConfig: {
        enabled: { type: Boolean, default: false },
        joinChannelId: { type: String, default: null },
        voiceCategoryId: { type: String, default: null },
        chatCategoryId: { type: String, default: null },
    },

    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

export default mongoose.models.GuildConfig || mongoose.model('GuildConfig', GuildConfigSchema);
