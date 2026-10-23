import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags, ChannelType } from 'discord.js';

const channelTypeNames = {
    [ChannelType.GuildText]: 'Text Channel',
    [ChannelType.GuildVoice]: 'Voice Channel',
    [ChannelType.GuildCategory]: 'Category',
    [ChannelType.GuildAnnouncement]: 'Announcement Channel',
    [ChannelType.GuildStageVoice]: 'Stage Channel',
    [ChannelType.GuildForum]: 'Forum Channel',
    [ChannelType.GuildMedia]: 'Media Channel',
    [ChannelType.PublicThread]: 'Public Thread',
    [ChannelType.PrivateThread]: 'Private Thread',
    [ChannelType.AnnouncementThread]: 'Announcement Thread',
};

export default {
    name: 'channelinfo',
    description: 'View detailed information about a channel',
    category: 'Utility',
    usage: 'channelinfo [#channel]',
    aliases: ['chaninfo', 'cinfo'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const channel = message.mentions.channels.first() || message.channel;
        const type = channelTypeNames[channel.type] || 'Unknown';
        const createdAt = `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`;
        const memberCount = channel.members?.size ?? channel.guild.memberCount;
        const topic = channel.topic ? channel.topic.slice(0, 100) : 'No topic set';
        const nsfw = channel.nsfw ? 'Yes' : 'No';
        const slowmode = channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'None';
        const position = channel.position ?? 'N/A';
        const parent = channel.parent?.name || 'None';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Channel Information__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${channel.name}\n` +
                                `> ${emojis.star || ''} **ID:** \`${channel.id}\`\n` +
                                `> ${emojis.star || ''} **Type:** ${type}\n` +
                                `> ${emojis.star || ''} **Category:** ${parent}\n` +
                                `> ${emojis.star || ''} **Position:** ${position}\n` +
                                `> ${emojis.star || ''} **Created:** ${createdAt}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Details__\n` +
                        `> ${emojis.star || ''} **Topic:** ${topic}\n` +
                        `> ${emojis.star || ''} **NSFW:** ${nsfw}\n` +
                        `> ${emojis.star || ''} **Slowmode:** ${slowmode}\n` +
                        `> ${emojis.star || ''} **Members:** ${memberCount}`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
