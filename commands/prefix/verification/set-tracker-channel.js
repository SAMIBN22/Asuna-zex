import { ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionsBitField } from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

function sendV2(channel, lines) {
    const c = new ContainerBuilder().setAccentColor(0x7C3AED);
    lines.forEach((l, i) => {
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(l));
        if (i < lines.length - 1) c.addSeparatorComponents(new SeparatorBuilder());
    });
    return channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

export default {
    name: 'set-tracker-channel',
    aliases: ['settrackerch', 'tracker-channel'],
    description: 'Set the channel where join tracker messages are sent.',
    category: 'Verification',
    usage: '&set-tracker-channel #channel',

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return sendV2(message.channel, ['#  Permission Denied', 'You need `Administrator` permission.']);

        const channel = message.mentions.channels.first()
                     || message.guild.channels.cache.get(args?.[0]);
        if (!channel || channel.type !== ChannelType.GuildText)
            return sendV2(message.channel, ['#  Invalid Channel', 'Please mention a valid **text channel**.\n\nUsage: `&set-tracker-channel #channel`']);

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $set: { trackerChannel: channel.id } },
            { upsert: true }
        );

        return sendV2(message.channel, [
            '#  Tracker Channel Set',
            `Join tracker messages will be sent in <#${channel.id}>`,
            `Requested by ${message.author.tag}`,
        ]);
    }
};
