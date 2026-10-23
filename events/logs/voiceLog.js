import { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

// Track when members joined a voice channel to calculate time spent
const voiceJoinTimes = new Map();

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        if (!newState.guild) return;
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guild = newState.guild;
        const user  = member.user;
        const star  = '⭐';

        // ── Voice Join ─────────────────────────────────────────────────────────
        if (!oldState.channelId && newState.channelId) {
            voiceJoinTimes.set(`${guild.id}_${user.id}`, Date.now());

            await sendLog(client, guild, 'voiceJoin', (accent, theme) => {
                return new ContainerBuilder()
                    .setAccentColor(COLORS.green)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎙️ __Voice Joined__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${member} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Channel:** <#${newState.channelId}> (\`${newState.channel?.name || 'Unknown'}\`)\n` +
                                `${star} **Joined At:** ${ts()}`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }

        // ── Voice Leave ────────────────────────────────────────────────────────
        else if (oldState.channelId && !newState.channelId) {
            const joinedAt  = voiceJoinTimes.get(`${guild.id}_${user.id}`);
            voiceJoinTimes.delete(`${guild.id}_${user.id}`);
            const durationMs = joinedAt ? Date.now() - joinedAt : null;
            const duration   = durationMs ? formatDuration(durationMs) : null;

            await sendLog(client, guild, 'voiceLeave', (accent, theme) => {
                return new ContainerBuilder()
                    .setAccentColor(COLORS.orange)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔇 __Voice Left__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${member} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **Channel:** <#${oldState.channelId}> (\`${oldState.channel?.name || 'Unknown'}\`)\n` +
                                `${star} **Left At:** ${ts()}` +
                                (duration ? `\n${star} **Time Spent:** \`${duration}\`` : '')
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(div(true))
                    .addTextDisplayComponents(footer(guild));
            });
        }

        // ── Voice Move ─────────────────────────────────────────────────────────
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await sendLog(client, guild, 'voiceMove', (accent, theme) => {
                return new ContainerBuilder()
                    .setAccentColor(COLORS.blue)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔄 __Voice Moved__`))
                    .addSeparatorComponents(div(true))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${star} **Member:** ${member} (\`${user.username}\`)\n` +
                                `${star} **User ID:** \`${user.id}\`\n` +
                                `${star} **From:** <#${oldState.channelId}> (\`${oldState.channel?.name || 'Unknown'}\`)\n` +
                                `${star} **To:** <#${newState.channelId}> (\`${newState.channel?.name || 'Unknown'}\`)\n` +
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

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60)  return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
}
