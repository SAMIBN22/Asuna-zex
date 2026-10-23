import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import mongoose from 'mongoose';

// Simple jackpot pool stored in a dedicated collection
const jackpotSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    pool:    { type: Number, default: 1000 },
    lastWinner: { type: String, default: null },
    lastWon:    { type: Number, default: 0 },
});
const Jackpot = mongoose.models.Jackpot || mongoose.model('Jackpot', jackpotSchema);

const TICKET_COST = 100;
const WIN_CHANCE  = 0.05; // 5% per ticket

export default {
    name: 'jackpot',
    aliases: ['jp', 'pool'],
    description: `Buy a jackpot ticket for  ${TICKET_COST} — 5% chance to win the entire community pool!`,
    category: 'Casino',
    usage: 'jackpot',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const jpData = await Jackpot.findOneAndUpdate(
            { guildId: message.guild.id },
            { $setOnInsert: { guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const userData = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        if (userData.wallet < TICKET_COST) {
            return reply(message, accent,
                `#  __Jackpot Pool__\n` +
                `>  **Current Pool:** \` ${jpData.pool.toLocaleString()} coins\`\n` +
                `>  You need \` ${TICKET_COST}\` to buy a ticket but only have \` ${userData.wallet.toLocaleString()}\`.`
            );
        }

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -TICKET_COST } });
        await Jackpot.updateOne({ guildId: message.guild.id }, { $inc: { pool: TICKET_COST } });

        const won = Math.random() < WIN_CHANCE;

        if (won) {
            const prize = jpData.pool + TICKET_COST;
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: prize } });
            await Jackpot.updateOne({ guildId: message.guild.id }, { $set: { pool: 1000, lastWinner: message.author.username, lastWon: prize } });

            const container = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __JACKPOT WINNER!__`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `>  **${message.author.username} WON THE JACKPOT!**\n` +
                    `>  **Prize:** \` ${prize.toLocaleString()} coins\`\n` +
                    `>  **Pool reset to:** \` 1,000 coins\`\n\n` +
                    `*Congratulations! The pool has been reset for the next round.*`
                ));
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
        }

        const newPool = jpData.pool + TICKET_COST;
        const lastWin = jpData.lastWinner ? `>  **Last Winner:** ${jpData.lastWinner} — \` ${jpData.lastWon?.toLocaleString() || 0}\`` : '';

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Jackpot Ticket Purchased__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `>  **No win this time!** Keep buying tickets!\n` +
                `>  **Pool:** \` ${newPool.toLocaleString()} coins\`\n` +
                `>  **Win Chance:** \`${(WIN_CHANCE * 100).toFixed(0)}% per ticket\`\n` +
                (lastWin ? `${lastWin}\n` : '') +
                `\n*Use \`jackpot\` again to try your luck!*`
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
