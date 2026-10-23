import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ChannelType } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

const CHANNEL_TYPES = {
    [ChannelType.GuildText]:          'Text Channel',
    [ChannelType.GuildVoice]:         'Voice Channel',
    [ChannelType.GuildCategory]:      'Category',
    [ChannelType.GuildAnnouncement]:  'Announcement Channel',
    [ChannelType.GuildForum]:         'Forum Channel',
    [ChannelType.GuildStageVoice]:    'Stage Channel',
    [ChannelType.PublicThread]:       'Public Thread',
    [ChannelType.PrivateThread]:      'Private Thread',
};

export default {
    name: Events.ChannelCreate,
    async execute(channel, client) {
        if (!channel.guild) return;

        await new Promise(r => setTimeout(r, 1500));
        let createdBy = null;
        try {
            const logs  = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === channel.id && (Date.now() - entry.createdTimestamp) < 5000) {
                createdBy = entry.executor;
            }
        } catch { /* */ }

        await sendLog(client, channel.guild, 'channelCreate', (accent, theme) => {
            const star = theme.emojis?.star || '⭐';
            const type = CHANNEL_TYPES[channel.type] || 'Channel';

            return new ContainerBuilder()
                .setAccentColor(COLORS.green)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📢 __Channel Created__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${star} **Channel:** <#${channel.id}> (\`${channel.name}\`)\n` +
                            `${star} **Type:** \`${type}\`\n` +
                            (channel.parent ? `${star} **Category:** \`${channel.parent.name}\`\n` : '') +
                            `${star} **Created By:** ${createdBy ? `<@${createdBy.id}>` : '`Unknown`'}\n` +
                            `${star} **Created At:** ${ts()}`
                        ))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'))
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(channel.guild));
        });
    },
};
