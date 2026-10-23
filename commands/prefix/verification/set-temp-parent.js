import { PermissionsBitField, ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
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
    name: 'set-temp-parent',
    aliases: ['settempparent', 'set-parent', 'setparent'],
    description: 'Set the category to host temporary channels for this server.',
    category: 'Verification',
    usage: '&set-temp-parent <#category|id>',

    async execute(message, args, client) {
        if (!message.guild) return;
        const isOwner = OWNER_IDS.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isAdmin && !isOwner)
            return sendV2(message.channel, ['#  Permission Denied', 'You need **Administrator** permission.']);

        let target = message.mentions.channels.first()
                  || message.guild.channels.cache.get(args?.[0]);
        if (!target)
            return sendV2(message.channel, ['#  Invalid Usage', 'Please mention a category or provide its ID.']);

        let category = null;
        if (target.type === ChannelType.GuildCategory) category = target;
        else if (target.parent?.type === ChannelType.GuildCategory) category = target.parent;

        if (!category)
            return sendV2(message.channel, ['#  Invalid Selection', 'Please select a valid category channel.']);

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $set: { tempChannelParentId: category.id } },
            { upsert: true }
        );

        return sendV2(message.channel, [
            '#  Success',
            `Temporary channels parent set to **${category.name}** (\`${category.id}\`).`,
        ]);
    }
};
