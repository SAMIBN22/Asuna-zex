import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

function drawCard() {
    const rank  = Math.floor(Math.random() * 13) + 1; // 1–13
    const names = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['', '', '', ''];
    return { rank, display: `${names[rank - 1]}${suits[Math.floor(Math.random() * 4)]}` };
}

export default {
    name: 'highlow',
    aliases: ['hl', 'hilo'],
    description: 'Guess if the next card is higher or lower — win 1.9x your bet',
    category: 'Casino',
    usage: 'highlow <bet>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 10) return reply(message, accent, `#  __Invalid Bet__\n> Usage: \`highlow <bet>\` — minimum 10 coins.`);

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );
        if (data.wallet < bet) return reply(message, accent, `#  __Not Enough Coins__\n> You only have \` ${data.wallet.toLocaleString()}\`.`);

        // Deduct bet upfront
        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -bet } });

        const current = drawCard();

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __High or Low?__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `>  **Current Card:** \`${current.display}\` (rank: ${current.rank})\n` +
                `> Is the next card **higher** or **lower**?\n\n` +
                `> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\` | **Win pays:** \` ${Math.floor(bet * 1.9).toLocaleString()}\``
            ));

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hl_high').setLabel('Higher ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('hl_low').setLabel('Lower ').setStyle(ButtonStyle.Danger),
        );

        const sent = await message.reply({ flags: MessageFlags.IsComponentsV2, components: [container, actionRow], allowedMentions: { parse: [] } });

        const collector = sent.createMessageComponentCollector({ time: 30_000, filter: i => i.user.id === message.author.id, max: 1 });

        collector.on('collect', async interaction => {
            const next      = drawCard();
            const guessHigh = interaction.customId === 'hl_high';
            const actualHigh = next.rank > current.rank;
            const tie        = next.rank === current.rank;

            let payout = 0;      // what we credit back (bet already deducted)
            let resultText;

            if (tie) {
                payout     = bet; // refund the bet
                resultText = ` **Tie! (\`${next.display}\`)** Your bet is returned.`;
            } else if (guessHigh === actualHigh) {
                payout     = Math.floor(bet * 1.9); // full win payout (includes original bet)
                resultText = ` **Correct! Next card was \`${next.display}\` (rank ${next.rank}).** You win \` ${payout.toLocaleString()}\`!`;
            } else {
                payout     = 0; // already deducted, nothing to credit
                resultText = ` **Wrong! Next card was \`${next.display}\` (rank ${next.rank}).** You lose \` ${bet.toLocaleString()}\`.`;
            }

            if (payout > 0) {
                await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: payout } });
            }

            // Fetch fresh balance for display
            const fresh = await Casino.findOne({ userId: message.author.id, guildId: message.guild.id });
            const net   = payout - bet;

            const result = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __High or Low — Result__`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `>  **Your card:** \`${current.display}\` → **Next:** \`${next.display}\`\n\n` +
                    `${resultText}\n\n` +
                    `> ${emojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                    `> ${emojis.star || ''} **New Balance:** \` ${fresh.wallet.toLocaleString()}\``
                ));

            await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [result], allowedMentions: { parse: [] } }).catch(() => {});
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                // Refund bet on timeout
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
