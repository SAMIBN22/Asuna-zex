import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionsBitField,
} from 'discord.js';
import InviteStats from '../../../models/inviteStats.js';

function hasPermission(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

export default {
    name: 'topinvites',
    aliases: ['invitetop', 'inviteleaderboard'],
    description: 'Show top inviters in the server.',
    category: 'Verification',
    usage: '&topinvites',

    async execute(message, args, client) {
        if (!message.guild) return;
        if (!hasPermission(message.member)) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nYou need **Administrator** permission.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const rawData = await InviteStats.find({ guildId: message.guild.id }).lean();

        // Sort by uses desc, top 30
        const sorted = rawData
            .filter(r => r.userId && (r.uses || 0) > 0)
            .sort((a, b) => (b.uses || 0) - (a.uses || 0))
            .slice(0, 30);

        if (sorted.length === 0) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Top Inviters\nNo invite data found for this server yet.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        // Resolve members
        const ids = sorted.map(r => r.userId);
        let fetched = new Map();
        try { fetched = await message.guild.members.fetch({ user: ids, withPresences: false }); } catch {}

        const active = sorted
            .map(row => {
                const member = fetched.get(row.userId) || message.guild.members.cache.get(row.userId);
                return member ? { ...row, member } : null;
            })
            .filter(Boolean);

        if (active.length === 0) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Top Inviters\nNo active inviters found.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const pageSize   = 6;
        const totalPages = Math.max(1, Math.ceil(active.length / pageSize));
        let currentPage  = 1;

        const medals = ['', '', ''];
        const fmtRow  = (row, idx, start) => {
            const rank   = start + idx + 1;
            const medal  = medals[rank - 1] || `${rank}.`;
            const name   = row.member.user.username;
            const total  = row.uses || 0;
            const left   = row.left || 0;
            const banned = row.banned || 0;
            const kicked = row.kicked || 0;
            const active2 = Math.max(0, total - left - banned - kicked);
            return `${medal} **${name}**\n   └  ${total} joins | Active: ${active2} | Left: ${left} | Banned: ${banned} | Kicked: ${kicked}`;
        };

        const buildButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ti-prev').setLabel(' Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
            new ButtonBuilder().setCustomId('ti-next').setLabel('Next ').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
            new ButtonBuilder().setCustomId('ti-close').setLabel('Close').setStyle(ButtonStyle.Danger),
        );

        const buildPage = (page) => {
            const start = (page - 1) * pageSize;
            const slice = active.slice(start, start + pageSize);
            const c = new ContainerBuilder()
                .setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  Top Inviters — Page ${page}/${totalPages}`))
                .addSeparatorComponents(new SeparatorBuilder());
            slice.forEach((row, i) => {
                c.addTextDisplayComponents(new TextDisplayBuilder().setContent(fmtRow(row, i, start)));
                if (i < slice.length - 1) c.addSeparatorComponents(new SeparatorBuilder());
            });
            c.addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Total inviters: ${active.length}`))
                .addActionRowComponents(buildButtons(page));
            return c;
        };

        const msg = await message.channel.send({ components: [buildPage(currentPage)], flags: MessageFlags.IsComponentsV2 });

        const col = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 5 * 60_000 });
        col.on('collect', async i => {
            try {
                await i.deferUpdate();
                if (i.customId === 'ti-close') { await msg.edit({ components: [], flags: MessageFlags.IsComponentsV2 }); col.stop(); return; }
                if (i.customId === 'ti-prev' && currentPage > 1) currentPage--;
                if (i.customId === 'ti-next' && currentPage < totalPages) currentPage++;
                await msg.edit({ components: [buildPage(currentPage)], flags: MessageFlags.IsComponentsV2 });
            } catch {}
        });
        col.on('end', async () => { try { await msg.edit({ components: [] }); } catch {} });
    }
};
