import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

// Bet types: red, black, green (0), odd, even, or a number 0-36
const RED_NUMS   = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

function getColor(n) {
    if (n === 0) return '';
    return RED_NUMS.includes(n) ? '' : '';
}

function calcPayout(bet, type, result) {
    if (type === 'green' || type === '0') return result === 0 ? 35 : 0;
    if (type === 'red')   return RED_NUMS.includes(result) ? 2 : 0;
    if (type === 'black') return BLACK_NUMS.includes(result) ? 2 : 0;
    if (type === 'odd')   return result !== 0 && result % 2 === 1 ? 2 : 0;
    if (type === 'even')  return result !== 0 && result % 2 === 0 ? 2 : 0;
    const num = parseInt(type);
    if (!isNaN(num) && num >= 0 && num <= 36) return result === num ? 35 : 0;
    return -1; // invalid
}

export default {
    name: 'roulette',
    aliases: ['rou', 'wheel'],
    description: 'Bet on roulette — pick red/black/odd/even/green or a number 0-36',
    category: 'Casino',
    usage: 'roulette <red|black|odd|even|green|0-36> <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const betType = args[0]?.toLowerCase();
        const bet     = parseInt(args[1]);
        if (!betType || isNaN(bet) || bet < 10) {
            return reply(message, accent, `#  __Invalid Input__\n> Usage: \`roulette <red|black|odd|even|green|0-36> <bet>\`\n> Minimum bet: 10 coins.`);
        }

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        const result     = Math.floor(Math.random() * 37); // 0–36
        const multiplier = calcPayout(bet, betType, result);

        if (multiplier === -1) return reply(message, accent, `#  __Invalid Bet Type__\n> Choose: \`red\`, \`black\`, \`odd\`, \`even\`, \`green\`, or a number \`0-36\`.`);

        const winnings = Math.floor(bet * multiplier);
        const net      = winnings - bet;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Roulette__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `>  **Your Bet:** \`${betType}\` for \` ${bet.toLocaleString()}\`\n` +
                `> ${getColor(result)} **Ball Landed On:** \`${result}\`\n\n` +
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
