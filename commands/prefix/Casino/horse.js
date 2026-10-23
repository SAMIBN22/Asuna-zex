import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const HORSES = [
    { name: 'Thunder Bolt', emoji: '', odds: 2.0 },
    { name: 'Lucky Star',   emoji: '', odds: 3.5 },
    { name: 'Dark Horse',   emoji: '', odds: 5.0 },
    { name: 'Silver Wind',  emoji: '', odds: 2.5 },
    { name: 'Golden Hoof',  emoji: '', odds: 4.0 },
];

export default {
    name: 'horse',
    aliases: ['horserace', 'race', 'horsebet'],
    description: 'Bet on a horse race! Pick 1-5 and win based on odds',
    category: 'Casino',
    usage: 'horse <1-5> <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const pick = parseInt(args[0]);
        const bet  = parseInt(args[1]);

        if (isNaN(pick) || pick < 1 || pick > 5 || isNaN(bet) || bet < 10) {
            const list = HORSES.map((h, i) => `\`${i+1}\` ${h.emoji} **${h.name}** — odds \`x${h.odds}\``).join('\n');
            return reply(message, accent,
                `#  __Horse Race__\n> Usage: \`horse <1-5> <bet>\` (min 10 coins)\n\n**Horses:**\n${list}`
            );
        }

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        // Weighted winner based on odds (lower odds = more likely to win)
        const totalWeight = HORSES.reduce((s, h) => s + (1 / h.odds), 0);
        let r = Math.random() * totalWeight, winnerIdx = 0;
        for (let i = 0; i < HORSES.length; i++) {
            r -= 1 / HORSES[i].odds;
            if (r <= 0) { winnerIdx = i; break; }
        }

        const pickedHorse = HORSES[pick - 1];
        const winner      = HORSES[winnerIdx];
        const won         = winnerIdx === pick - 1;

        const net = won ? Math.floor(bet * pickedHorse.odds) - bet : -bet;
        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        // Build race track
        const track = HORSES.map((h, i) => {
            const pos = (i === winnerIdx) ? 18 : Math.floor(Math.random() * 14) + 2;
            const lane = '·'.repeat(pos) + h.emoji + '·'.repeat(18 - pos);
            return ` ${lane} |finish|`;
        }).join('\n');

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Horse Race Results__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `\`\`\`\n${track}\n\`\`\`\n` +
                ` **Winner: ${winner.emoji} ${winner.name}**\n\n` +
                `>  **Your Pick:** ${pickedHorse.emoji} ${pickedHorse.name} (odds \`x${pickedHorse.odds}\`)\n` +
                `> ${won ? ' **You Won!**' : ' **You Lost!**'}\n` +
                `> ${emojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **New Balance:** \` ${(data.wallet + net).toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
