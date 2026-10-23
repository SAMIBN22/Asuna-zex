// هذا الملف يقرأ إعداداته من config.js — عدّل من هناك فقط
import config from './config.js';

const c = config.cooldowns;

export default {
    COOLDOWNS: {
        DEFAULT: {
            USER:   c.defaultUser,
            GUILD:  c.defaultGuild,
            GLOBAL: c.defaultGlobal,
        },
        COMMANDS: c.commands,
        EVENTS: {
            MESSAGE_CREATE:      100,
            VOICE_STATE_UPDATE:   50,
            GUILD_MEMBER_ADD:    200,
            GUILD_MEMBER_REMOVE: 200,
        },
    },
    LIMITS: {
        MAX_MESSAGES_CLEAR:    config.limits.maxMessagesClear,
        MAX_WARNINGS:          config.limits.maxWarnings,
        MAX_JAIL_DURATION:     config.limits.maxJailDuration,
        MAX_MUTE_DURATION:     config.limits.maxMuteDuration,
        MAX_BAN_REASON_LENGTH: config.limits.maxBanReasonLength,
        MAX_KICK_REASON_LENGTH:config.limits.maxKickReasonLength,
    },
    TIMEOUTS: {
        COMMAND_EXECUTION:    config.timeouts.commandExecution,
        INTERACTION_RESPONSE: config.timeouts.interactionResponse,
        MESSAGE_DELETE:       config.timeouts.messageDelete,
        EMBED_DELETE:         config.timeouts.embedDelete,
    },
    RATE_LIMITS: {
        MESSAGES_PER_MINUTE: config.rateLimits.messagesPerMinute,
        COMMANDS_PER_MINUTE: config.rateLimits.commandsPerMinute,
        API_CALLS_PER_SECOND:config.rateLimits.apiCallsPerSecond,
    },
};
