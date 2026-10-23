import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const SUITS  = ['', '', '', ''];
const RANKS  = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newDeck() {
    const deck = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
    return deck.sort(() => Math.random() - 0.5);
}

function cardValue(rank) {
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
}

function handTotal(hand) {
    let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
    let aces  = hand.filter(c => c.rank === 'A').length;
    while (total > 21 && aces-- > 0) total -= 10;
    return total;
}

function showHand(hand, hide = false) {
    if (hide) return `\`${hand[0].rank}${hand[0].suit}\` \`\``;
    return hand.map(c => `\`${c.rank}${c.suit}\``).join(' ');
}

export default {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: 'Play a game of Blackjack against the dealer',
    category: 'Casino',
    usage: 'blackjack <bet>',

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

        const deck        = newDeck();
        const playerHand  = [deck.pop(), deck.pop()];
        const dealerHand  = [deck.pop(), deck.pop()];

        const buildContainer = (playerHand, dealerHand, hideDealer, status = '') => {
            const pTotal = handTotal(playerHand);
            const dTotal = hideDealer ? cardValue(dealerHand[0].rank) : handTotal(dealerHand);
            return new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Blackjack__`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Dealer's Hand:** ${showHand(dealerHand, hideDealer)} — \`${hideDealer ? '?' : dTotal}\`\n\n` +
                    `**Your Hand:** ${showHand(playerHand)} — \`${pTotal}\`\n\n` +
                    (status ? `${status}\n\n` : '') +
                    `> ${emojis.star || ''} **Bet:** \` ${bet.toLocaleString()}\`\n` +
                    `> ${emojis.star || ''} **Wallet:** \` ${data.wallet.toLocaleString()}\``
                ));
        };

        const hitStandRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger)
        );

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [buildContainer(playerHand, dealerHand, true), hitStandRow],
            allowedMentions: { parse: [] }
        });

        const collector = sent.createMessageComponentCollector({ time: 60_000, filter: i => i.user.id === message.author.id });

        const endGame = async (interaction, pHand, dHand, reason) => {
            collector.stop();
            const pTotal = handTotal(pHand);
            const dTotal = handTotal(dHand);

            let net = 0;
            let outcome;
            if (reason === 'bust') {
                outcome = ` **Bust!** You went over 21. You lose \` ${bet.toLocaleString()}\`.`;
            } else if (pTotal > dTotal || dTotal > 21) {
                net = bet;
                outcome = ` **You Win!** You earned \` ${bet.toLocaleString()}\`.`;
            } else if (pTotal === dTotal) {
                net = 0;
                await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: bet } });
                outcome = ` **Push!** Tie game — your bet is returned.`;
            } else {
                outcome = ` **Dealer Wins!** You lose \` ${bet.toLocaleString()}\`.`;
            }
            if (net > 0) await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: bet * 2 } });

            const finalContainer = buildContainer(pHand, dHand, false, outcome);
            await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [finalContainer], allowedMentions: { parse: [] } }).catch(() => {});
        };

        collector.on('collect', async interaction => {
            if (interaction.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                const pTotal = handTotal(playerHand);
                if (pTotal > 21) return endGame(interaction, playerHand, dealerHand, 'bust');
                if (pTotal === 21) {
                    // auto-stand
                    while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());
                    return endGame(interaction, playerHand, dealerHand, 'stand');
                }
                await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [buildContainer(playerHand, dealerHand, true), hitStandRow], allowedMentions: { parse: [] } }).catch(() => {});
            } else if (interaction.customId === 'bj_stand') {
                while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());
                return endGame(interaction, playerHand, dealerHand, 'stand');
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'user') sent.edit({ components: [] }).catch(() => {});
        });
    }
};

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
