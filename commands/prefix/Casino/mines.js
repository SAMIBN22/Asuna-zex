import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const GRID = 9; // 3x3
const MINES_COUNT = 3;

export default {
    name: 'mines',
    aliases: ['mine', 'minesweeper'],
    description: 'Minesweeper betting — reveal safe tiles and cash out before hitting a mine!',
    category: 'Casino',
    usage: 'mines <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 10) return reply(message, accent, `#  __Invalid Bet__\n> Usage: \`mines <bet>\` — minimum 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -bet } });

        // Generate mine positions
        const mines = new Set();
        while (mines.size < MINES_COUNT) mines.add(Math.floor(Math.random() * GRID));

        const revealed = new Array(GRID).fill(false);
        let safeRevealed = 0;
        let gameOver = false;

        const multiplier = () => {
            const safe = GRID - MINES_COUNT;
            return parseFloat((1 + safeRevealed * (MINES_COUNT / (safe - safeRevealed + 1)) * 0.5).toFixed(2));
        };

        const buildGrid = (showAll = false) => {
            const rows = [];
            for (let row = 0; row < 3; row++) {
                const rowBtns = [];
                for (let col = 0; col < 3; col++) {
                    const idx = row * 3 + col;
                    let style = ButtonStyle.Secondary;
                    let label = '';
                    let disabled = false;
                    if (revealed[idx]) {
                        label = mines.has(idx) ? '' : '';
                        style = mines.has(idx) ? ButtonStyle.Danger : ButtonStyle.Success;
                        disabled = true;
                    } else if (showAll) {
                        label = mines.has(idx) ? '' : '';
                        disabled = true;
                    } else if (gameOver) {
                        disabled = true;
                    }
                    rowBtns.push(new ButtonBuilder().setCustomId(`mines_${idx}`).setLabel(label).setStyle(style).setDisabled(disabled));
                }
                rows.push(new ActionRowBuilder().addComponents(...rowBtns));
            }
            return rows;
        };

        const cashoutBtn = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mines_cashout').setLabel(`Cash Out (x${multiplier()})`).setStyle(ButtonStyle.Primary).setDisabled(safeRevealed === 0)
        );

        const infoContainer = () => new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `#  __Mines__\n` +
                `> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\` | **Mines:** \`${MINES_COUNT}/9\`\n` +
                `>  Safe tiles found: \`${safeRevealed}\` | Multiplier: \`x${multiplier()}\`\n` +
                `> *Click a tile. Cash out anytime before hitting a mine!*`
            ));

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [infoContainer(), ...buildGrid(), cashoutBtn()],
            allowedMentions: { parse: [] }
        });

        const collector = sent.createMessageComponentCollector({ time: 60_000, filter: i => i.user.id === message.author.id });

        collector.on('collect', async interaction => {
            if (gameOver) return;

            if (interaction.customId === 'mines_cashout') {
                gameOver = true;
                collector.stop('cashout');
                const payout = Math.floor(bet * multiplier());
                await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: payout } });
                const net = payout - bet;

                const result = new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `#  __Cashed Out!__\n` +
                        `>  You cashed out with \`x${multiplier()}\` multiplier!\n` +
                        `> ${emojis.star || ''} **Payout:** \` ${payout.toLocaleString()}\`\n` +
                        `> ${emojis.star || ''} **Net:** \`+${net.toLocaleString()} coins\``
                    ));
                await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [result, ...buildGrid(true)], allowedMentions: { parse: [] } }).catch(() => {});
                return;
            }

            const idx = parseInt(interaction.customId.replace('mines_', ''));
            if (isNaN(idx) || revealed[idx]) return;
            revealed[idx] = true;

            if (mines.has(idx)) {
                gameOver = true;
                collector.stop('mine');
                const result = new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `#  __BOOM! Mine Hit!__\n` +
                        `>  You hit a mine and lost \` ${bet.toLocaleString()}\`!\n` +
                        `> Safe tiles found before bust: \`${safeRevealed}\``
                    ));
                await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [result, ...buildGrid(true)], allowedMentions: { parse: [] } }).catch(() => {});
            } else {
                safeRevealed++;
                if (safeRevealed === GRID - MINES_COUNT) {
                    // All safe tiles found — auto cashout
                    gameOver = true;
                    collector.stop('win');
                    const payout = Math.floor(bet * multiplier());
                    await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: payout } });
                    const result = new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `#  __All Safe Tiles Found!__\n` +
                            `>  You cleared the entire board! Auto cash out!\n` +
                            `> ${emojis.star || ''} **Payout:** \` ${payout.toLocaleString()}\``
                        ));
                    await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [result, ...buildGrid(true)], allowedMentions: { parse: [] } }).catch(() => {});
                } else {
                    await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [infoContainer(), ...buildGrid(), cashoutBtn()], allowedMentions: { parse: [] } }).catch(() => {});
                }
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: bet } }).catch(() => {});
                sent.edit({ components: [] }).catch(() => {});
            }
        });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
