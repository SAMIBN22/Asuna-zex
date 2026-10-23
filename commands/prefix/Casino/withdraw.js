import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

export default {
    name: 'withdraw',
    aliases: ['with', 'wd'],
    description: 'Withdraw coins from your bank to your wallet',
    category: 'Casino',
    usage: 'withdraw <amount|all>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const rawArg = args[0];
        let amount;
        if (!rawArg) return reply(message, accent, `#  __Missing Amount__\n> Usage: \`withdraw <amount|all>\``);
        if (rawArg.toLowerCase() === 'all') {
            amount = data.bank;
        } else {
            amount = parseInt(rawArg);
            if (isNaN(amount) || amount <= 0) return reply(message, accent, `#  __Invalid Amount__\n> Please enter a valid positive number.`);
        }

        if (amount > data.bank) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.bank.toLocaleString()}\` in your bank.`);

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: amount, bank: -amount } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Withdrawal Successful__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.star || ''} **Withdrawn:** \` ${amount.toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **Wallet:** \` ${(data.wallet + amount).toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **Bank:** \` ${(data.bank - amount).toLocaleString()} coins\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
