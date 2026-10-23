import { PermissionsBitField, ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import InviteStats from '../../../models/inviteStats.js';

export default {
    name: 'generate-invite',
    aliases: ['geninvite', 'createinvite'],
    description: 'Generate a permanent invite link linked to you.',
    category: 'Verification',
    usage: '&generate-invite',

    async execute(message, args, client) {
        let targetChannel = message.channel;
        if (typeof targetChannel.isThread === 'function' && targetChannel.isThread())
            targetChannel = targetChannel.parent;

        const validTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice];
        if (!message.guild || !validTypes.includes(targetChannel?.type) || !targetChannel?.createInvite) {
            return message.reply('Please run this command in a server text channel.');
        }

        const me = message.guild.members.me;
        if (!me?.permissionsIn(targetChannel.id).has(PermissionsBitField.Flags.CreateInstantInvite)) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Missing Permission\nI need **Create Invite** permission in this channel.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        let invite;
        try {
            invite = await targetChannel.createInvite({ maxAge: 0, maxUses: 0, unique: true });
        } catch {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Failed\nCould not create the invite link. Check my permissions.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        // Initialize invite stats in DB
        await InviteStats.findOneAndUpdate(
            { guildId: message.guild.id, userId: message.author.id },
            { $setOnInsert: { uses: 0, left: 0, banned: 0, kicked: 0 } },
            { upsert: true, new: true }
        );

        const c = new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Your Permanent Invite Link'))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Link:** ${invite.url}`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.tag}`));

        return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
};
