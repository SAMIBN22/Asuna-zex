import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

function generateCrashPoint() {
    // Exponential distribution: most crashes are early, rare high multipliers
    const r = Math.random();
    if (r < 0.40) return parseFloat((1 + Math.random() * 0.8).toFixed(2));
    if (r < 0.70) return parseFloat((1.8 + Math.random() * 2).toFixed(2));
    if (r < 0.90) return parseFloat((3.8 + Math.random() * 5).toFixed(2));
    return parseFloat((8 + Math.random() * 20).toFixed(2));
}

export default {
    name: 'crash',
    aliases: ['rocketcrash', 'rkt'],
    description: 'Rocket game — watch the multiplier grow and cash out before it crashes!',
    category: 'Casino',
    usage: 'crash <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 10) return reply(message, accent, `#  __Invalid Bet__\n> Minimum bet is 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -bet } });

        const crashPoint = generateCrashPoint();
        let current      = 1.00;
        let cashedOut    = false;

        const cashoutBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('crash_cashout').setLabel(' CASH OUT').setStyle(ButtonStyle.Success)
        );

        const buildContainer = (mult, status = '') => new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `#  __Crash Game__\n` +
                `## \`x${mult.toFixed(2)}\` \n` +
                (status || `> *Press **CASH OUT** before the rocket crashes!*\n`) +
                `\n> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\` | **Potential:** \` ${Math.floor(bet * mult).toLocaleString()}\``
            ));

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [buildContainer(current), cashoutBtn],
            allowedMentions: { parse: [] }
        });

        const collector = sent.createMessageComponentCollector({ time: 15_000, filter: i => i.user.id === message.author.id, max: 1 });

        // Simulate the crash with an interval
        const STEPS = [1.20, 1.50, 1.80, 2.20, 2.70, 3.30, 4.00, 5.00, 6.50, 8.00];
        let stepIdx = 0;

        const interval = setInterval(async () => {
            if (cashedOut || stepIdx >= STEPS.length) {
                clearInterval(interval);
                return;
            }
            current = STEPS[stepIdx++];
            if (current >= crashPoint) {
                clearInterval(interval);
                if (!cashedOut) {
                    collector.stop('crash');
                    await sent.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [new ContainerBuilder().setAccentColor(accent)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `#  __CRASH at x${crashPoint}!__\n` +
                                `>  The rocket crashed! You lost \` ${bet.toLocaleString()}\`.\n` +
                                `>  Crashed at: \`x${crashPoint}\``
                            ))],
                        allowedMentions: { parse: [] }
                    }).catch(() => {});
                }
            } else {
                await sent.edit({ flags: MessageFlags.IsComponentsV2, components: [buildContainer(current), cashoutBtn], allowedMentions: { parse: [] } }).catch(() => {});
            }
        }, 1500);

        collector.on('collect', async interaction => {
            cashedOut = true;
            clearInterval(interval);
            const payout = Math.floor(bet * current);
            const net    = payout - bet;
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: payout } });

            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `#  __Cashed Out at x${current.toFixed(2)}!__\n` +
                        `>  You cashed out before the crash at \`x${crashPoint}\`!\n` +
                        `> ${emojis.star || ''} **Payout:** \` ${payout.toLocaleString()}\`\n` +
                        `> ${emojis.star || ''} **Net:** \`+${net.toLocaleString()} coins\``
                    ))],
                allowedMentions: { parse: [] }
            }).catch(() => {});
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !cashedOut) {
                clearInterval(interval);
                sent.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `#  __CRASH!__\n>  Too slow! The rocket crashed at \`x${crashPoint}\`. You lost \` ${bet.toLocaleString()}\`.`
                        ))],
                    allowedMentions: { parse: [] }
                }).catch(() => {});
            }
        });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
