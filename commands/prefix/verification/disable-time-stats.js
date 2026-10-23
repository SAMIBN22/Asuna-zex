import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
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
    name: 'disable-time-stats',
    aliases: ['dts', 'disabletimestats', 'off-time-stats'],
    description: 'Disable the auto-posting of server stats for this server.',
    category: 'Verification',
    usage: '&disable-time-stats',

    async execute(message, args, client) {
        if (!message.guild) return;
        const isOwner = OWNER_IDS.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isAdmin && !isOwner)
            return sendV2(message.channel, ['#  Permission Denied', 'You need **Administrator** permission.']);

        // Stop runtime interval if stored on client
        const timers = client.statsAutoTimers;
        if (timers?.has(message.guild.id)) {
            try { clearInterval(timers.get(message.guild.id).interval); } catch {}
            timers.delete(message.guild.id);
        }

        // Remove from MongoDB
        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $unset: { statsAuto: '' } },
            { upsert: false }
        );

        return sendV2(message.channel, ['#  Success', 'Auto stats posting has been **disabled** for this server.']);
    }
};
