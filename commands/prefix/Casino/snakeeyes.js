import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

export default {
    name: 'snakeeyes',
    aliases: ['snake', 'se'],
    description: 'Roll two dice — snake eyes (1,1) pays 30x! Doubles pay 5x, others lose',
    category: 'Casino',
    usage: 'snakeeyes <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 10) return reply(message, accent, `#  __Invalid Bet__\n> Minimum bet is 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        const DICE_E = ['', '1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣'];

        let multiplier = 0;
        let resultText;
        if (d1 === 1 && d2 === 1) {
            multiplier = 30;
            resultText = ` **SNAKE EYES! 1⃣ + 1⃣** — You hit the jackpot!`;
        } else if (d1 === d2) {
            multiplier = 5;
            resultText = ` **Doubles! ${DICE_E[d1]} + ${DICE_E[d2]}** — Nice roll!`;
        } else {
            resultText = ` **No match. ${DICE_E[d1]} + ${DICE_E[d2]}** — Better luck next time!`;
        }

        const winnings = Math.floor(bet * multiplier);
        const net      = winnings - bet;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Snake Eyes__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${resultText}\n\n` +
                `> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\`\n` +
                `> ${emojis.star || ''} **Winnings:** \` ${winnings.toLocaleString()}\`\n` +
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
