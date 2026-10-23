import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import VerifStats from '../../../models/verifStats.js';

export default {
    name: 'topverifreset',
    aliases: ['resetverif', 'verifreset'],
    description: 'Reset the top verificators leaderboard for this server.',
    category: 'Verification',
    usage: '&topverifreset',

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nYou do not have permission.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const result = await VerifStats.deleteMany({ guildId: message.guild.id });

        const c = new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Top Verif Reset'))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                result.deletedCount > 0
                    ? ` Top verification leaderboard has been reset.\nCleared **${result.deletedCount}** entries.`
                    : 'Top verification data was already empty for this server.'
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.tag}`));

        return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
};
