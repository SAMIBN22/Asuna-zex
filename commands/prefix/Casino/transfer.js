import { resolveUser } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

export default {
    name: 'transfer',
    aliases: ['give', 'pay', 'send'],
    description: 'Send coins to another member',
    category: 'Casino',
    usage: 'transfer <@user> <amount>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const target = await resolveUser(message, args[0], client);
        if (!target || target.bot) return reply(message, accent, `#  __Invalid Target__\n> Mention a valid (non-bot) user to send coins to.`);
        if (target.id === message.author.id) return reply(message, accent, `#  __Invalid Target__\n> You cannot send coins to yourself.`);

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) return reply(message, accent, `#  __Invalid Amount__\n> Usage: \`transfer @user <amount>\``);

        const sender = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        if (sender.wallet < amount) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${sender.wallet.toLocaleString()}\` in your wallet.`);

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -amount } });
        await Casino.findOneAndUpdate(
            { userId: target.id, guildId: message.guild.id },
            { $setOnInsert: { userId: target.id, guildId: message.guild.id }, $inc: { wallet: amount } },
            { upsert: true }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Transfer Complete__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.star || ''} **Sent:** \` ${amount.toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **To:** ${target.username}\n` +
                `> ${emojis.star || ''} **Your Remaining Wallet:** \` ${(sender.wallet - amount).toLocaleString()} coins\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
