import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

// Cooperative bank heist — costs an entry fee, random payout from a pool
const COOLDOWN_MS = 14_400_000; // 4 hours
const ENTRY_FEE   = 200;

export default {
    name: 'bankrob',
    aliases: ['heistbank', 'bankhack'],
    description: 'Attempt a bank robbery solo! High risk, high reward (4h cooldown)',
    category: 'Casino',
    usage: 'bankrob',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const now = Date.now();
        if (data.lastBankRob && now - data.lastBankRob.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastBankRob.getTime()));
            return reply(message, accent, `# ${emojis.loading} __Still Wanted__\n> You're on the police radar. Wait **${remaining}** before another heist.`);
        }

        if (data.wallet < ENTRY_FEE) {
            return reply(message, accent, `# ${emojis.no} __Not Enough Coins__\n> Bank robbery requires \`${emojis.coin} ${ENTRY_FEE}\` entry fee. You have \`${emojis.coin} ${data.wallet.toLocaleString()}\`.`);
        }

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -ENTRY_FEE }, $set: { lastBankRob: new Date() } });

        const roll = Math.random();
        let net, text;

        if (roll < 0.15) {
            const prize = Math.floor(Math.random() * 3000 + 2000);
            net  = prize - ENTRY_FEE;
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: prize } });
            text = `${emojis.money} **LEGENDARY HEIST!** You cracked the vault and escaped with \`${emojis.coin} ${prize.toLocaleString()}\`!`;
        } else if (roll < 0.45) {
            const prize = Math.floor(Math.random() * 1000 + 400);
            net  = prize - ENTRY_FEE;
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: prize } });
            text = `${emojis.yes} **Successful heist!** You grabbed \`${emojis.coin} ${prize.toLocaleString()}\` and slipped away.`;
        } else {
            net  = -ENTRY_FEE;
            text = `${emojis.cop} **BUSTED!** The alarm went off and you got arrested. Entry fee lost!`;
        }

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.bank} __Bank Robbery__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${text}\n\n` +
                `> ${themeEmojis.star || ''} **Entry Fee:** \`${emojis.coin} ${ENTRY_FEE}\`\n` +
                `> ${themeEmojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **New Balance:** \`${emojis.coin} ${(data.wallet - ENTRY_FEE + (net + ENTRY_FEE)).toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}

function msToTime(ms) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
}
