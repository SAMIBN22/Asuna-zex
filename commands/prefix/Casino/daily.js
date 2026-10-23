import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

const DAILY_REWARD = 500;
const STREAK_BONUS = 50;
const COOLDOWN_MS  = 86_400_000; // 24 h

export default {
    name: 'daily',
    aliases: ['claim'],
    description: 'Claim your daily coin reward (resets every 24 hours)',
    category: 'Casino',
    usage: 'daily',

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
        if (data.lastDaily && now - data.lastDaily.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastDaily.getTime()));
            const container = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# ${emojis.loading} __Daily Already Claimed__\n> ${themeEmojis.star || ''} Come back in **${remaining}** to claim again!`
                ));
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
        }

        const streak = (data.lastDaily && now - data.lastDaily.getTime() < COOLDOWN_MS * 2) ? data.dailyStreak + 1 : 1;
        const bonus  = (streak - 1) * STREAK_BONUS;
        const reward = DAILY_REWARD + bonus;

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: reward }, $set: { lastDaily: new Date(), dailyStreak: streak } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${emojis.gift} __Daily Reward Claimed!__`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${themeEmojis.star || ''} **Reward:** \`${emojis.coin} ${reward.toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **Base:** \`${DAILY_REWARD.toLocaleString()} coins\`\n` +
                `> ${themeEmojis.star || ''} **Streak Bonus:** \`+${bonus} coins\`\n` +
                `> ${emojis.fire} **Streak:** \`${streak} day${streak !== 1 ? 's' : ''}\`\n\n` +
                `*Come back tomorrow to keep your streak!*`
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function msToTime(ms) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return `${h}h ${m}m ${s}s`;
}
