import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const COOLDOWN_MS = 1_800_000; // 30 min

const CATCHES = [
    { name: 'Old Boot', emoji: '', min: 5,   max: 20,   chance: 0.15 },
    { name: 'Seaweed',  emoji: '', min: 10,  max: 30,   chance: 0.20 },
    { name: 'Small Fish', emoji: '', min: 40, max: 100, chance: 0.30 },
    { name: 'Salmon',   emoji: '', min: 80,  max: 200,  chance: 0.20 },
    { name: 'Lobster',  emoji: '', min: 150, max: 400,  chance: 0.10 },
    { name: 'Shark',    emoji: '', min: 400, max: 900,  chance: 0.04 },
    { name: 'Mermaid\'s Coin Purse', emoji: '', min: 800, max: 2000, chance: 0.01 },
];

function pickCatch() {
    const r = Math.random();
    let cumulative = 0;
    for (const item of CATCHES) {
        cumulative += item.chance;
        if (r < cumulative) return item;
    }
    return CATCHES[2];
}

export default {
    name: 'fish',
    aliases: ['fishing', 'cast'],
    description: 'Go fishing to earn coins (30 min cooldown)',
    category: 'Casino',
    usage: 'fish',

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
        if (data.lastFish && now - data.lastFish.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastFish.getTime()));
            return reply(message, accent, `#  __Still Waiting__\n> Your fishing rod is cooling down. Try again in **${remaining}**.`);
        }

        const catch_ = pickCatch();
        const earned = Math.floor(Math.random() * (catch_.max - catch_.min + 1)) + catch_.min;

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: earned }, $set: { lastFish: new Date() } }
        );

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Gone Fishing!__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `>  You cast your line and caught a **${catch_.name}** ${catch_.emoji}\n` +
                `> ${emojis.star || ''} **Earned:** \` ${earned.toLocaleString()} coins\`\n` +
                `>  **Next cast:** in 30 minutes`
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
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return `${m}m ${s}s`;
}
