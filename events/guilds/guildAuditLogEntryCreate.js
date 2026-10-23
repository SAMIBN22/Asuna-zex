import { Events, AuditLogEvent } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { checkAntiNukeLimit } from '../../utils/antiNuke.js';

export default {
    name: Events.GuildAuditLogEntryCreate,
    async execute(auditLogEntry, guild, client) {
        if (!guild || !auditLogEntry) {
            return;
        }

        const { action, executorId, targetId, changes, targetType } = auditLogEntry;
        
        if (!executorId || executorId === client.user.id) {
            return;
        }

        try {
            const settings = await client.getSettings(guild.id);
            if (!settings) return;

            const executor = await client.users.fetch(executorId).catch(() => null);
            if (!executor || executor.bot) return;

            // Anti-Ban Enforcement
            if (action === AuditLogEvent.MemberBanAdd && settings.antiBanEnabled) {
                const target = await client.users.fetch(targetId).catch(() => null);
                const wasPunished = await checkAntiNukeLimit(client, guild, executor, settings, 'Ban');
                
                if (wasPunished && target) {
                    await guild.members.unban(target.id, "Anti-Ban Protection Reversal").catch(() => null);
                }
            }

            // Anti-Kick Enforcement
            if (action === AuditLogEvent.MemberKick && settings.antiKickEnabled) {
                await checkAntiNukeLimit(client, guild, executor, settings, 'Kick');
            }

            // Anti-Mute (Timeout) Enforcement
            if (action === AuditLogEvent.MemberUpdate && settings.antiMuteEnabled) {
                const change = changes?.find(c => c.key === 'communication_disabled_until' || c.key === 'mute');
                
                // Mute can be a voice channel mute (`mute` key with `new: true`) 
                // OR a timeout (`communication_disabled_until` key with a valid date string)
                if (change && ((change.key === 'mute' && change.new === true) || (change.key === 'communication_disabled_until' && change.new))) {
                    const member = await guild.members.fetch(targetId).catch(() => null);
                    const wasPunished = await checkAntiNukeLimit(client, guild, executor, settings, 'Mute');
                    
                    if (wasPunished && member) {
                        if (change.key === 'mute') {
                             await member.voice.setMute(false, "Anti-Mute Protection Reversal").catch(() => null);
                        } else {
                             await member.timeout(null, "Anti-Mute Protection Reversal").catch(() => null);
                        }
                    }
                }
            }

            // Anti-Move/Disconnect Enforcement
            if ((action === AuditLogEvent.MemberMove || action === AuditLogEvent.MemberDisconnect) && settings.antiMoveEnabled) {
                await checkAntiNukeLimit(client, guild, executor, settings, 'Move');
            }

        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Audit Log Security Error', error, guild.id);
        }
    }
};
