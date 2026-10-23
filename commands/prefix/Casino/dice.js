import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

export default {
    name: 'dice',
    aliases: ['roll', 'dicegame'],
    description: 'Roll two dice — predict high (8+), low (6-), or exact sum',
    category: 'Casino',
    usage: 'dice <high|low|7|2-12> <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const betType = args[0]?.toLowerCase();
        const bet     = parseInt(args[1]);

        if (!betType || isNaN(bet) || bet < 10) {
            return reply(message, accent, `#  __Invalid Input__\n> Usage: \`dice <high|low|7|2-12> <bet>\`\n> **high** = 8–12 (pays 1.8x) | **low** = 2–6 (pays 1.8x) | **7** (pays 4x) | exact number 2-12 (pays 5x)`);
        }

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        const sum = d1 + d2;

        const DICE_EMOJIS = ['', '1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣'];

        let multiplier = 0;
        if (betType === 'high' && sum >= 8)  multiplier = 1.8;
        else if (betType === 'low' && sum <= 6) multiplier = 1.8;
        else if (betType === '7' && sum === 7) multiplier = 4;
        else {
            const num = parseInt(betType);
            if (!isNaN(num) && num >= 2 && num <= 12) {
                if (sum === num) multiplier = 5;
            } else if (!['high', 'low'].includes(betType)) {
                return reply(message, accent, `#  __Invalid Bet Type__\n> Choose: \`high\`, \`low\`, \`7\`, or a number \`2-12\`.`);
            }
        }

        const winnings = Math.floor(bet * multiplier);
        const net      = winnings - bet;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Dice Roll__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `>  **Your Bet:** \`${betType}\` for \` ${bet.toLocaleString()}\`\n` +
                `>  **Roll:** ${DICE_EMOJIS[d1]} + ${DICE_EMOJIS[d2]} = **${sum}**\n\n` +
                `${net >= 0 ? ` **You Won \` ${winnings.toLocaleString()}\`!**` : ` **You Lost \` ${bet.toLocaleString()}\`!**`}\n\n` +
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
