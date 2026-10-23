import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

export default {
    name: 'deposit',
    aliases: ['dep', 'save'],
    description: 'Deposit coins from your wallet into your bank',
    category: 'Casino',
    usage: 'deposit <amount|all>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const rawArg = args[0];
        let amount;
        if (!rawArg) {
            return reply(message, accent, `# ${emojis.no} __Missing Amount__\n> Usage: \`deposit <amount|all>\``);
        }
        if (rawArg.toLowerCase() === 'all') {
            amount = data.wallet;
        } else {
            amount = parseInt(rawArg);
            if (isNaN(amount) || amount <= 0) return reply(message, accent, `# ${emojis.no} __Invalid Amount__\n> Please enter a valid positive number.`);
        }

        if (amount > data.wallet) return reply(message, accent, `# ${emojis.no} __Not Enough Coins__\n> You only have \`${emojis.coin} ${data.wallet.toLocaleString()}\` in your wallet.`);

        const space = data.bankLimit - data.bank;
        if (space <= 0) return reply(message, accent, `# ${emojis.no} __Bank Full__\n> Your bank is at capacity (\`${data.bankLimit.toLocaleString()}\` coins).`);

        const deposited = Math.min(amount, space);
        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: -deposited, bank: deposited } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.bank} __Deposit Successful__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${themeEmojis.star || ''} **Deposited:** \`${emojis.coin} ${deposited.toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **Wallet:** \`${emojis.coin} ${(data.wallet - deposited).toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **Bank:** \`${emojis.bank} ${(data.bank + deposited).toLocaleString()} coins\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
