import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const WEEKLY_REWARD = 5000;
const COOLDOWN_MS   = 604_800_000; // 7 days

export default {
    name: 'weekly',
    aliases: ['week'],
    description: 'Claim your weekly coin reward (resets every 7 days)',
    category: 'Casino',
    usage: 'weekly',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const now = Date.now();
        if (data.lastWeekly && now - data.lastWeekly.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastWeekly.getTime()));
            const container = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `#  __Weekly Already Claimed__\n> ${emojis.star || ''} Come back in **${remaining}** to claim again!`
                ));
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
        }

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: WEEKLY_REWARD }, $set: { lastWeekly: new Date() } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Weekly Reward Claimed!__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.star || ''} **Reward:** \` ${WEEKLY_REWARD.toLocaleString()} coins\`\n` +
                `>  **Next claim:** in 7 days\n\n*Stay active and don't forget your daily too!*`
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function msToTime(ms) {
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${d}d ${h}h ${m}m`;
}
