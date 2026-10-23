import { resolveUser } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const COOLDOWN_MS  = 3_600_000; // 1 hour
const SUCCESS_RATE = 0.50;
const STEAL_PCT    = 0.25; // steal up to 25% of victim's wallet

export default {
    name: 'rob',
    aliases: ['mug', 'steal'],
    description: 'Try to rob another member\'s wallet (1h cooldown)',
    category: 'Casino',
    usage: 'rob <@user>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const target = await resolveUser(message, args[0], client);
        if (!target || target.bot) return reply(message, accent, `#  __Invalid Target__\n> Mention a valid member to rob.`);
        if (target.id === message.author.id) return reply(message, accent, `#  __Invalid Target__\n> You cannot rob yourself.`);

        const robberData = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const now = Date.now();
        if (robberData.lastRob && now - robberData.lastRob.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - robberData.lastRob.getTime()));
            return reply(message, accent, `#  __Laying Low__\n> Wait **${remaining}** before robbing again.`);
        }

        const victimData = await Casino.findOneAndUpdate(
            { userId: target.id, guildId: message.guild.id },
            { $setOnInsert: { userId: target.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $set: { lastRob: new Date() } });

        if (victimData.wallet < 100) return reply(message, accent, `#  __Not Worth It__\n> **${target.username}** is broke — they have less than 100 coins!`);

        const success = Math.random() < SUCCESS_RATE;
        if (success) {
            const stolen = Math.floor(victimData.wallet * STEAL_PCT * Math.random() + victimData.wallet * 0.05);
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: stolen } });
            await Casino.updateOne({ userId: target.id, guildId: message.guild.id }, { $inc: { wallet: -stolen } });
            return reply(message, accent,
                `#  __Successful Robbery!__\n` +
                `>  You successfully robbed **${target.username}**!\n` +
                `> ${emojis.star || ''} **Stolen:** \` ${stolen.toLocaleString()} coins\`\n` +
                `>  Don't spend it all in one place...`
            );
        } else {
            const fine = Math.floor(Math.random() * 200 + 100);
            const paid = Math.min(fine, robberData.wallet);
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -paid } });
            return reply(message, accent,
                `#  __Caught Red-Handed!__\n` +
                `>  You tried to rob **${target.username}** but got caught!\n` +
                `> ${emojis.star || ''} **Fine:** \` ${paid.toLocaleString()} coins\``
            );
        }
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
