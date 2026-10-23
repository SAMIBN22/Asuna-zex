import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const SYMBOLS = ['', '', '', '', '', '', '7⃣'];
const PAYOUTS = { '': 2, '': 2.5, '': 3, '': 3.5, '': 5, '': 10, '7⃣': 20 };

function spin() {
    return Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}

export default {
    name: 'slots',
    aliases: ['slot', 'spin'],
    description: 'Spin the slot machine and win big!',
    category: 'Casino',
    usage: 'slots <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const bet = parseBet(args[0]);
        if (!bet) return reply(message, accent, `#  __Invalid Bet__\n> Usage: \`slots <amount>\` — minimum bet is 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\` in your wallet.`);

        const reels = spin();
        const [a, b, c] = reels;
        let multiplier = 0;
        let resultText;

        if (a === b && b === c) {
            multiplier = PAYOUTS[a];
            resultText = ` **JACKPOT! Three ${a}!** Multiplier: **x${multiplier}**`;
        } else if (a === b || b === c) {
            const matched = a === b ? a : b;
            multiplier = PAYOUTS[matched] * 0.4;
            resultText = ` **Two of a kind!** Multiplier: **x${multiplier.toFixed(1)}**`;
        } else {
            resultText = ` **No match. Better luck next time!**`;
        }

        const winnings = Math.floor(bet * multiplier);
        const net      = winnings - bet;

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: net } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Slot Machine__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `## ┌─────────────────┐\n## │  ${a}  ${b}  ${c}  │\n## └─────────────────┘\n\n` +
                `${resultText}\n\n` +
                `> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\`\n` +
                `> ${emojis.star || ''} **Winnings:** \` ${winnings.toLocaleString()}\`\n` +
                `> ${emojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **New Balance:** \` ${(data.wallet + net).toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function parseBet(arg) {
    if (!arg) return null;
    const n = parseInt(arg);
    return (!isNaN(n) && n >= 10) ? n : null;
}

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
