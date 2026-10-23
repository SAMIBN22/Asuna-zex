import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import InviteStats from '../../../models/inviteStats.js';

export default {
    name: 'topinvitesreset',
    aliases: ['resetinvites', 'invitesreset'],
    description: 'Reset the top invites leaderboard for this server.',
    category: 'Verification',
    usage: '&topinvitesreset',

    async execute(message, args, client) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nOnly administrators can reset the leaderboard.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        await InviteStats.deleteMany({ guildId: message.guild.id });

        const c = new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Top Invites Reset'))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('The top invites leaderboard has been reset for this server.'))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.tag}`));
        return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
};
