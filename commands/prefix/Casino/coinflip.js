import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

export default {
    name: 'coinflip',
    aliases: ['cf', 'flip'],
    description: 'Flip a coin — double your bet or lose it all',
    category: 'Casino',
    usage: 'coinflip <heads|tails> <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const side = args[0]?.toLowerCase();
        if (!['heads', 'tails', 'h', 't'].includes(side)) {
            return reply(message, accent, `# ${emojis.no} __Invalid Choice__\n> Usage: \`coinflip <heads|tails> <bet>\``);
        }
        const choice = side.startsWith('h') ? 'heads' : 'tails';
        const bet    = parseInt(args[1]);
        if (isNaN(bet) || bet < 10) return reply(message, accent, `# ${emojis.no} __Invalid Bet__\n> Minimum bet is 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `# ${emojis.no} __Not Enough Coins__\n> You only have \`${emojis.coin} ${data.wallet.toLocaleString()}\`.`);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won    = result === choice;
        const net    = won ? bet : -bet;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.coin} __Coin Flip__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.target} **Your pick:** \`${choice}\`\n` +
                `> ${emojis.coin} **Result:** \`${result}\` ${result === 'heads' ? '' : emojis.white_dot}\n\n` +
                `${won ? `${emojis.party} **You won!**` : `${emojis.spend} **You lost!**`}\n\n` +
                `> ${themeEmojis.star || ''} **Bet:** \`${emojis.coin} ${bet.toLocaleString()}\`\n` +
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
