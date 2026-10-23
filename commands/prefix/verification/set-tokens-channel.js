import { ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionsBitField } from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function sendV2(channel, lines) {
    const c = new ContainerBuilder().setAccentColor(0x7C3AED);
    lines.forEach((l, i) => {
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(l));
        if (i < lines.length - 1) c.addSeparatorComponents(new SeparatorBuilder());
    });
    return channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

export default {
    name: 'set-tokens-channel',
    aliases: ['settokenschannel', 'set-token-channel'],
    description: 'Set the channel where suspicious token detections are logged.',
    category: 'Verification',
    usage: '&set-tokens-channel #channel',

    async execute(message, args, client) {
        const isOwner = OWNER_IDS.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isAdmin && !isOwner)
            return sendV2(message.channel, ['#  Permission Denied', 'You need `Administrator` permission.']);

        const channel = message.mentions.channels.first()
                     || message.guild.channels.cache.get(args?.[0]);
        if (!channel || channel.type !== ChannelType.GuildText)
            return sendV2(message.channel, ['#  Invalid Channel', 'Please mention a valid **text channel**.']);

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $set: { tokenCheckChannel: channel.id } },
            { upsert: true }
        );

        return sendV2(message.channel, [
            '#  Token Channel Set',
            `Suspicious accounts will be logged in <#${channel.id}>`,
            `Requested by ${message.author.tag}`,
        ]);
    }
};
