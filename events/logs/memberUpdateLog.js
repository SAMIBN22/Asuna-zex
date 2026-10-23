import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember, client) {
        if (!newMember.guild) return;
        const guild = newMember.guild;
        const user  = newMember.user;
        const star  = '⭐';

        // ── Timeout ────────────────────────────────────────────────────────────
        const oldTimeout = oldMember.communicationDisabledUntil;
        const newTimeout = newMember.communicationDisabledUntil;

        if (String(oldTimeout) !== String(newTimeout) && newTimeout) {
            await new Promise(r => setTimeout(r, 1500));
            let moderator = null;
            let reason    = 'No reason provided';
            try {
                const logs  = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
                const entry = logs.entries.first();
                if (entry && entry.target?.id === user.id && (Date.now() - entry.createdTimestamp) < 5000) {
                    moderator = entry.executor;
                    reason    = entry.reason || reason;
                }
            } catch { /* */ }

            await sendLog(client, guild, 'memberTimeout', (accent, theme) => {
                const until = Math.floor(newTimeout.getTime() / 1000);
                return new ContainerBuilder()
                    .setAccentColor(COLORS.yellow)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⏱️ __Member Timed Out__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${newMember} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Timed Out By:** ${moderator ? `<@${moderator.id}>` : '`Unknown`'}\n` +
                                `${star} **Expires:** <t:${until}:F> (<t:${until}:R>)\n` +
                                `${star} **Reason:** \`${reason}\``
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }

        // ── Role added ─────────────────────────────────────────────────────────
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== guild.id);
        if (addedRoles.size > 0) {
            await new Promise(r => setTimeout(r, 800));
            let moderator = null;
            try {
                const logs  = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
                const entry = logs.entries.first();
                if (entry && entry.target?.id === user.id && (Date.now() - entry.createdTimestamp) < 5000) {
                    moderator = entry.executor;
                }
            } catch { /* */ }

            await sendLog(client, guild, 'roleAdd', (accent, theme) => {
                return new ContainerBuilder()
                    .setAccentColor(COLORS.green)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎖️ __Role Added__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${newMember} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Role${addedRoles.size > 1 ? 's' : ''} Added:** ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}\n` +
                                `${star} **By:** ${moderator ? `<@${moderator.id}>` : '`Unknown`'}\n` +
                                `${star} **At:** ${ts()}`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }

        // ── Role removed ───────────────────────────────────────────────────────
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== guild.id);
        if (removedRoles.size > 0) {
            let moderator = null;
            try {
                const logs  = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
                const entry = logs.entries.first();
                if (entry && entry.target?.id === user.id && (Date.now() - entry.createdTimestamp) < 5000) {
                    moderator = entry.executor;
                }
            } catch { /* */ }

            await sendLog(client, guild, 'roleRemove', (accent, theme) => {
                return new ContainerBuilder()
                    .setAccentColor(COLORS.orange)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎗️ __Role Removed__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${newMember} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Role${removedRoles.size > 1 ? 's' : ''} Removed:** ${removedRoles.map(r => `<@&${r.id}>`).join(', ')}\n` +
                                `${star} **By:** ${moderator ? `<@${moderator.id}>` : '`Unknown`'}\n` +
                                `${star} **At:** ${ts()}`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }

        // ── Nickname changed ───────────────────────────────────────────────────
        if (oldMember.nickname !== newMember.nickname) {
            await sendLog(client, guild, 'nickChange', (accent, theme) => {
                const oldNick = oldMember.nickname || `\`${user.username}\``;
                const newNick = newMember.nickname || `\`${user.username}\``;
                return new ContainerBuilder()
                    .setAccentColor(COLORS.blue)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📝 __Nickname Changed__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${newMember} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Before:** ${oldNick}\n` +
                                `${star} **After:** ${newNick}\n` +
                                `${star} **At:** ${ts()}`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }
    },
};
