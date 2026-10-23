import {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from 'discord.js';
import VerifStats from '../../../models/verifStats.js';

function hasPermission(member, settings, guildId) {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const roles = settings?.[guildId]?.commandRoles?.['topverif'] || [];
    return member.roles.cache.some(r => roles.includes(r.id));
}

export default {
    name: 'topverif',
    aliases: ['veriftop', 'verifleaderboard'],
    description: 'Show top verificators in the server.',
    category: 'Verification',
    usage: '&topverif',

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nYou do not have permission to use this command.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const rawData = await VerifStats.find({ guildId: message.guild.id }).sort({ count: -1 }).limit(50).lean();
        if (!rawData.length) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Info\nNo verification logs found for this server.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        // Resolve members in bulk
        const ids = rawData.map(r => r.userId);
        let fetched = new Map();
        try { fetched = await message.guild.members.fetch({ user: ids, withPresences: false }); } catch {}

        const active = rawData
            .map(row => {
                const member = fetched.get(row.userId) || message.guild.members.cache.get(row.userId);
                return member ? { ...row, member } : null;
            })
            .filter(Boolean)
            .slice(0, 25);

        if (active.length === 0) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Info\nNo active verificators found.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const pageSize   = 5;
        const totalPages = Math.ceil(active.length / pageSize);
        let page         = 0;

        const buildContainer = () => {
            const start = page * pageSize;
            const slice = active.slice(start, start + pageSize);
            const c     = new ContainerBuilder()
                .setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  Top Verificators — Page ${page + 1}/${totalPages}`))
                .addSeparatorComponents(new SeparatorBuilder());
            slice.forEach((v, i) => {
                const name  = v.member.displayName || v.member.user.username;
                const block = `__**#${start + i + 1}**__\n**Name:** ${name}\n**ID:** \`${v.userId}\`\n**Verified:** \`${v.count.toLocaleString()}\``;
                c.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
                if (i < slice.length - 1) c.addSeparatorComponents(new SeparatorBuilder());
            });
            c.addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.tag}`))
                .addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tv-prev').setLabel(' Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
                    new ButtonBuilder().setCustomId('tv-next').setLabel('Next ').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
                ));
            return c;
        };

        const sent = await message.channel.send({ components: [buildContainer()], flags: MessageFlags.IsComponentsV2 });
        const col  = sent.createMessageComponentCollector({ time: 3 * 60_000, filter: i => i.user.id === message.author.id });

        col.on('collect', async i => {
            try {
                if (i.customId === 'tv-prev') page = Math.max(0, page - 1);
                else if (i.customId === 'tv-next') page = Math.min(totalPages - 1, page + 1);
                await i.update({ components: [buildContainer()], flags: MessageFlags.IsComponentsV2 });
            } catch {}
        });

        col.on('end', async () => { try { await sent.edit({ components: [] }); } catch {} });
    }
};
