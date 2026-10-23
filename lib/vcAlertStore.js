/**
 * Shared in-memory store for the VC Alert system.
 * Key: `${guildId}:${channelId}:${memberId}`
 * Value: { alertMsgId, vcMsgId, logsChannelId, channelId, joinTime }
 */
export const vcAlertMessages = new Map();
