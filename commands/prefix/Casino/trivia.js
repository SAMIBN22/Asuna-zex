import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const QUESTIONS = [
    { q: 'What is the highest possible hand in poker?', a: 'Royal Flush', opts: ['Full House', 'Royal Flush', 'Straight Flush', 'Four of a Kind'] },
    { q: 'In Blackjack, what is the goal score?', a: '21', opts: ['21', '17', '24', '18'] },
    { q: 'How many numbers are on a standard roulette wheel (American)?', a: '38', opts: ['36', '37', '38', '40'] },
    { q: 'What are the odds of rolling a 7 with two dice?', a: '1 in 6', opts: ['1 in 4', '1 in 5', '1 in 6', '1 in 8'] },
    { q: 'In Baccarat, which hand wins if both get a 5?', a: 'Tie', opts: ['Player', 'Banker', 'Tie', 'Nobody'] },
    { q: 'How many cards are in a standard deck?', a: '52', opts: ['48', '52', '54', '56'] },
    { q: 'What suit does the Queen of Spades belong to?', a: 'Spades', opts: ['Hearts', 'Diamonds', 'Clubs', 'Spades'] },
    { q: 'Snake eyes in dice means rolling...?', a: '1 and 1', opts: ['6 and 6', '1 and 6', '1 and 1', '2 and 2'] },
    { q: 'What color is 0 on a roulette wheel?', a: 'Green', opts: ['Red', 'Black', 'Green', 'Blue'] },
    { q: 'In poker, how many cards does each player get in Texas Hold\'em?', a: '2', opts: ['1', '2', '3', '5'] },
];

const REWARD    = 300;
const PENALTY   = 100;

export default {
    name: 'trivia',
    aliases: ['quiz', 'casinoquiz'],
    description: `Answer a casino trivia question — correct earns  ${REWARD}, wrong costs  ${PENALTY}`,
    category: 'Casino',
    usage: 'trivia',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
        const letters  = ['A', 'B', 'C', 'D'];

        const buttons = shuffled.map((opt, i) =>
            new ButtonBuilder()
                .setCustomId(`trivia_${i}`)
                .setLabel(`${letters[i]}: ${opt}`)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(...buttons);

        const optionsList = shuffled.map((opt, i) => `> **${letters[i]}:** ${opt}`).join('\n');

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Casino Trivia__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**${q.q}**\n\n${optionsList}\n\n` +
                `> ${emojis.star || ''} **Correct:** +\` ${REWARD}\` | **Wrong:** -\` ${PENALTY}\`\n` +
                `>  *You have 20 seconds to answer!*`
            ));

        const sent = await message.reply({ flags: MessageFlags.IsComponentsV2, components: [container, row], allowedMentions: { parse: [] } });

        const collector = sent.createMessageComponentCollector({ time: 20_000, filter: i => i.user.id === message.author.id, max: 1 });

        collector.on('collect', async interaction => {
            const idx    = parseInt(interaction.customId.replace('trivia_', ''));
            const chosen = shuffled[idx];
            const correct = chosen === q.a;

            const net = correct ? REWARD : -Math.min(PENALTY, data.wallet);
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: net } });

            const result = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `#  __Trivia Result__\n\n` +
                    `**${q.q}**\n\n` +
                    `>  **Your answer:** \`${chosen}\`\n` +
                    `>  **Correct answer:** \`${q.a}\`\n\n` +
                    `${correct ? ' **Correct!**' : ' **Wrong!**'} ${net >= 0 ? `+\` ${net}\`` : `-\` ${Math.abs(net)}\``}`
                ));

            await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [result], allowedMentions: { parse: [] } }).catch(() => {});
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const timeout = new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `#  __Time's Up!__\n>  Too slow! The answer was \`${q.a}\`.`
                    ));
                sent.edit({ flags: MessageFlags.IsComponentsV2, components: [timeout], allowedMentions: { parse: [] } }).catch(() => {});
            }
        });
    }
};
