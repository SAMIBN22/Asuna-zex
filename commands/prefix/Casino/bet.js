import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

// Simple number guess game — pick 1-10, win 8x if correct
export default {
    name: 'bet',
    aliases: ['guess', 'luckynum'],
    description: 'Pick a number 1-10. Guess correctly and win 8x your bet!',
    category: 'Casino',
    usage: 'bet <1-10> <amount>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const pick = parseInt(args[0]);
        const bet  = parseInt(args[1]);

        if (isNaN(pick) || pick < 1 || pick > 10 || isNaN(bet) || bet < 10) {
            return reply(message, accent, `# ${emojis.no} __Invalid Input__\n> Usage: \`bet <1-10> <amount>\`\n> Minimum bet: 10 coins. Pick any number from 1 to 10.`);
        }

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `# ${emojis.no} __Not Enough Coins__\n> You only have \`${emojis.coin} ${data.wallet.toLocaleString()}\`.`);

        const result = Math.floor(Math.random() * 10) + 1;
        const won    = result === pick;
        const net    = won ? Math.floor(bet * 8) - bet : -bet;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.target} __Lucky Number Bet__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.target} **Your guess:** \`${pick}\`\n` +
                `> ${emojis.dice} **The number was:** \`${result}\`\n\n` +
                `${won ? `${emojis.party} **CORRECT! You win \`${emojis.coin} ${Math.floor(bet * 8).toLocaleString()}\`!**` : `${emojis.spend} **Wrong! You lose \`${emojis.coin} ${bet.toLocaleString()}\`.**`}\n\n` +
                `> ${themeEmojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **New Balance:** \`${emojis.coin} ${(data.wallet + net).toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
