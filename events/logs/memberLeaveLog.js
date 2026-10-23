import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, tsR, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        if (!member.guild) return;

        // Check audit log to distinguish kick vs voluntary leave
        await new Promise(r => setTimeout(r, 1500));
        let wasKicked   = false;
        let kickedBy    = null;
        let kickReason  = null;

        try {
            const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === member.id && (Date.now() - entry.createdTimestamp) < 5000) {
                wasKicked  = true;
                kickedBy   = entry.executor;
                kickReason = entry.reason || 'No reason provided';
            }
        } catch { /* audit log permission missing */ }

        const logType = wasKicked ? null : 'memberLeave';
        if (!wasKicked) {
            await sendLog(client, member.guild, 'memberLeave', (accent, theme) => {
                const star = theme.emojis?.star || '⭐';
                const roles = member.roles.cache.filter(r => r.id !== member.guild.id);

                return new ContainerBuilder()
                    .setAccentColor(COLORS.orange)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `# 📤 __Member Left__`
                    ))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** \`${member.user.tag}\`\n` +
                                `${star} **User ID:** \`${member.id}\`\n` +
                                `${star} **Left At:** ${ts()}\n` +
                                `${star} **Joined At:** ${member.joinedTimestamp ? tsR(member.joinedTimestamp) : '`Unknown`'}\n` +
                                `${star} **Roles:** \`${roles.size}\`` +
                                (roles.size > 0 ? `\n${star} **Had:** ${roles.map(r => `<@&${r.id}>`).slice(0, 5).join(', ')}${roles.size > 5 ? ` +${roles.size - 5} more` : ''}` : '')
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(
                                    member.user.displayAvatarURL({ extension: 'png', size: 256 })
                                )
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(member.guild));
            });
        }

        // Also log kicks if memberLeave channel is set (kick is a subset of leave)
        if (wasKicked) {
            await sendLog(client, member.guild, 'memberLeave', (accent, theme) => {
                const star = theme.emojis?.star || '⭐';
                return new ContainerBuilder()
                    .setAccentColor(COLORS.red)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `# 👢 __Member Kicked__`
                    ))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** \`${member.user.tag}\`\n` +
                                `${star} **User ID:** \`${member.id}\`\n` +
                                `${star} **Kicked By:** ${kickedBy ? `<@${kickedBy.id}> (\`${kickedBy.tag}\`)` : '`Unknown`'}\n` +
                                `${star} **Reason:** \`${kickReason}\`\n` +
                                `${star} **Kicked At:** ${ts()}`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(
                                    member.user.displayAvatarURL({ extension: 'png', size: 256 })
                                )
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(member.guild));
            });
        }
    },
};
