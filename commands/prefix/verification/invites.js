import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, MessageFlags,
} from 'discord.js';
import InviteStats from '../../../models/inviteStats.js';

export default {
    name: 'invites',
    aliases: ['invitestats', 'invite'],
    description: 'Show invite statistics of a user.',
    category: 'Verification',
    usage: '&invites [@user]',

    async execute(message, args, client) {
        const target = await resolveMember(message, args[0]) || message.member;
        if (!target) {
            return message.reply('>  Could not find that member in this server.').catch(() => {});
        }
        const guildId = message.guild.id;
        const userId  = target.id;

        let stats = await InviteStats.findOne({ guildId, userId }).lean() || { uses: 0, left: 0, banned: 0, kicked: 0 };

        // Live fetch from Discord API
        let liveUses = null;
        try {
            const me = await message.guild.members.fetchMe().catch(() => null);
            if (me?.permissions?.has('ManageGuild')) {
                const invites = await message.guild.invites.fetch();
                liveUses = 0;
                for (const [, inv] of invites) {
                    if (inv?.inviter?.id === userId) liveUses += inv?.uses || 0;
                }
            }
        } catch {}

        if (typeof liveUses === 'number') stats.uses = Math.max(stats.uses || 0, liveUses);

        const total = (stats.uses || 0) + (stats.left || 0) + (stats.banned || 0) + (stats.kicked || 0);
        if (total === 0) {
            const c = new ContainerBuilder()
                .setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Not Found'))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`No invite data found for ${target.user.tag}.`));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const c = new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  Invite Stats — ${target.user.tag}`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                ` **Invited:** ${stats.uses ?? 0}\n` +
                ` **Left:** ${stats.left ?? 0}\n` +
                ` **Banned:** ${stats.banned ?? 0}\n` +
                ` **Kicked:** ${stats.kicked ?? 0}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.tag}`));
        return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
};
