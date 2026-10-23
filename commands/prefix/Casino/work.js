import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const COOLDOWN_MS = 3_600_000; // 1 hour
const JOBS = [
    { title: 'Software Engineer', min: 200, max: 450 },
    { title: 'Chef', min: 150, max: 350 },
    { title: 'Doctor', min: 300, max: 600 },
    { title: 'Artist', min: 100, max: 300 },
    { title: 'Streamer', min: 80, max: 500 },
    { title: 'Driver', min: 120, max: 280 },
    { title: 'Teacher', min: 160, max: 320 },
    { title: 'Trader', min: 50, max: 700 },
    { title: 'Mechanic', min: 180, max: 380 },
    { title: 'Musician', min: 90, max: 420 },
];

export default {
    name: 'work',
    aliases: ['job', 'earn'],
    description: 'Work a job to earn coins (1 hour cooldown)',
    category: 'Casino',
    usage: 'work',

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
        if (data.lastWork && now - data.lastWork.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastWork.getTime()));
            const container = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `#  __You Are Tired__\n> ${emojis.star || ''} You need to rest! Come back in **${remaining}**.`
                ));
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
        }

        const job    = JOBS[Math.floor(Math.random() * JOBS.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: earned }, $set: { lastWork: new Date() } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Work Complete!__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.star || ''} **Job:** \`${job.title}\`\n` +
                `> ${emojis.star || ''} **Earned:** \` ${earned.toLocaleString()} coins\`\n` +
                `>  **Next shift:** in 1 hour`
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function msToTime(ms) {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return `${m}m ${s}s`;
}
