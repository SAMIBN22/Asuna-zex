import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const MEDALS = ['', '', '', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', ''];

export default {
    name: 'leaderboard',
    aliases: ['lb', 'rich', 'top'],
    description: 'View the top 10 richest players in the server',
    category: 'Casino',
    usage: 'leaderboard',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        // Use an aggregation pipeline to compute netWorth = wallet + bank server-side
        // and sort by it properly. $expr is NOT valid in Mongoose .sort() — use
        // $addFields + $sort inside aggregate() instead.
        const sorted = await Casino.aggregate([
            { $match: { guildId: message.guild.id } },
            { $addFields: { netWorth: { $add: ['$wallet', '$bank'] } } },
            { $sort: { netWorth: -1 } },
            { $limit: 10 },
        ]);

        if (sorted.length === 0) {
            return reply(message, accent, `#  __Leaderboard__\n> No data yet — start earning coins with \`daily\` or \`work\`!`);
        }

        const lines = await Promise.all(sorted.map(async (entry, i) => {
            let username = `Unknown (${entry.userId})`;
            try {
                const member = await message.guild.members.fetch(entry.userId).catch(() => null);
                username = member?.displayName || member?.user.username || username;
            } catch {}
            const total = entry.wallet + entry.bank;
            return `${MEDALS[i] || `${i + 1}.`} **${username}** — \` ${total.toLocaleString()} coins\``;
        }));

        const userEntry = await Casino.findOne({ userId: message.author.id, guildId: message.guild.id });
        const userTotal = userEntry ? (userEntry.wallet + userEntry.bank) : 0;
        const userRank  = userEntry
            ? (await Casino.countDocuments({ guildId: message.guild.id, $expr: { $gt: [{ $add: ['$wallet', '$bank'] }, userTotal] } })) + 1
            : 'Unranked';

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Casino Leaderboard__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.star || ''} **Your Rank:** \`#${userRank}\` | **Net Worth:** \` ${userTotal.toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
