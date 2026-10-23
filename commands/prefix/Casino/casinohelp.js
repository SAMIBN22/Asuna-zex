import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import config from '../../../config/config.js';
import emojis from '../../emojis.js';

const { prefix } = config;

export default {
    name: 'casinohelp',
    aliases: ['chelp', 'casinohub', 'casino'],
    description: 'View all Casino commands and how to play',
    category: 'Casino',
    usage: 'casinohelp',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};
        const e = themeEmojis.star || '';

        const sections = {
            [`${emojis.money} Economy`]: [
                ['balance', 'Check wallet & bank balance'],
                ['daily',   'Claim daily reward (streak bonus)'],
                ['weekly',  'Claim weekly reward'],
                ['work',    'Work a job for coins (1h cooldown)'],
                ['crime',   'Commit a crime — high risk (2h cooldown)'],
                ['fish',    'Go fishing (30min cooldown)'],
                ['deposit', 'Deposit coins to your bank'],
                ['withdraw','Withdraw coins from your bank'],
                ['transfer','Send coins to another user'],
                ['rob',     'Rob another user\'s wallet (1h cooldown)'],
            ],
            [`${emojis.jackpot} Games`]: [
                ['slots',     'Spin the slot machine'],
                ['coinflip',  'Heads or tails — double or nothing'],
                ['blackjack', 'Play Blackjack against the dealer'],
                ['roulette',  'Bet on red/black/number'],
                ['dice',      'Bet on dice roll total'],
                ['highlow',   'Guess higher or lower card'],
                ['snakeeyes', 'Roll for snake eyes — 30x payout!'],
                ['horse',     'Bet on a horse race (1-5)'],
                ['mines',     'Minesweeper — cash out before boom!'],
                ['crash',     'Rocket crash game — cash out in time!'],
                ['bet',       'Lucky number 1-10 — win 8x!'],
            ],
            [`${emojis.coupon} Lottery`]: [
                ['scratch',  'Buy a scratch card for 50 coins'],
                ['jackpot',  'Buy a jackpot ticket — win the whole pool!'],
                ['trivia',   'Answer casino trivia for coins'],
            ],
            [`${emojis.chart} Info`]: [
                ['leaderboard', 'Top 10 richest players in the server'],
                ['bankrob',     'Solo bank heist — high risk, high reward'],
            ],
        };

        const lines = Object.entries(sections).map(([title, cmds]) => {
            const list = cmds.map(([name, desc]) => `> ${e} \`${prefix}${name}\` — ${desc}`).join('\n');
            return `## ${title}\n${list}`;
        }).join('\n\n');

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.jackpot} __Casino Commands__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> ${emojis.hint} *Use \`${prefix}help\` to browse all bot categories.*\n` +
                `> ${emojis.dice} *All casino coins are server-specific — good luck!*`
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};
