import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

function sendV2(channel, text) {
    const c = new ContainerBuilder().setAccentColor(0x7C3AED)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

export default {
    name: 'susverifremove',
    aliases: ['sos-verif-remove', 'sosverifrem'],
    description: 'Unblock user(s) so they can be verified again (Administrator only).',
    category: 'Verification',
    usage: '&susverifremove @user [id...]',

    async execute(message, args, client) {
        if (!message.guild) return;
        if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator))
            return sendV2(message.channel, '#  Permission Denied\nAdministrator permission required.');

        const targets = new Set();
        message.mentions.members?.forEach((_, id) => targets.add(id));
        args.forEach(t => { const m = String(t).match(/\d{15,}/); if (m) targets.add(m[0]); });

        if (targets.size === 0)
            return sendV2(message.channel, '#  Invalid Usage\nProvide at least one user mention or ID.\n\nUsage: `&susverifremove @user [id...]`');

        const gid = message.guild.id;
        const cfg = await GuildConfig.findOne({ guildId: gid }) || new GuildConfig({ guildId: gid });
        if (!cfg.susVerif) cfg.susVerif = {};
        if (!cfg.susVerif.blocked) cfg.susVerif.blocked = {};

        let removed = 0;
        for (const id of targets) {
            if (cfg.susVerif.blocked[id]) { delete cfg.susVerif.blocked[id]; removed++; }
        }
        cfg.markModified('susVerif');
        await cfg.save();

        const logId = cfg.susVerif?.logChannelId;
        if (logId) {
            const logCh = message.guild.channels.cache.get(logId);
            if (logCh) {
                for (const id of targets) {
                    await sendV2(logCh,
                        `#  Sus-Verify Unblocked\nUser: <@${id}>\nBy: <@${message.author.id}>\nTime: <t:${Math.floor(Date.now() / 1000)}:F>`
                    ).catch(() => {});
                }
            }
        }

        return sendV2(message.channel, `#  Blocklist Updated\nRemoved: **${removed}** • Total provided: **${targets.size}**`);
    }
};
