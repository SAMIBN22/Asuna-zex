import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';

const TICKET_COST = 50;
const PRIZES = [
    { label: ' JACKPOT', value: 5000, chance: 0.01 },
    { label: ' BIG WIN',  value: 1000, chance: 0.04 },
    { label: ' WIN',      value: 300,  chance: 0.10 },
    { label: ' SMALL',   value: 100,  chance: 0.20 },
    { label: ' NOTHING',  value: 0,    chance: 0.65 },
];

function pickPrize() {
    const r = Math.random();
    let c   = 0;
    for (const p of PRIZES) { c += p.chance; if (r < c) return p; }
    return PRIZES[PRIZES.length - 1];
}

export default {
    name: 'scratch',
    aliases: ['scratchcard', 'lottery'],
    description: `Buy a scratch card for  ${TICKET_COST} coins and reveal your prize`,
    category: 'Casino',
    usage: 'scratch',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        if (data.wallet < TICKET_COST) {
            return reply(message, accent, `#  __Not Enough Coins__\n> A scratch card costs \` ${TICKET_COST}\`. You have \` ${data.wallet.toLocaleString()}\`.`);
        }

        const prize = pickPrize();
        const net   = prize.value - TICKET_COST;

        await Casino.updateOne(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { wallet: net } }
        );

        const card = generateCard(prize);

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  __Scratch Card__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `\`\`\`\n${card}\n\`\`\`\n` +
                `**${prize.label}**${prize.value > 0 ? ` — \` ${prize.value.toLocaleString()} coins\`` : ''}\n\n` +
                `> ${emojis.star || ''} **Cost:** \` ${TICKET_COST}\`\n` +
                `> ${emojis.star || ''} **Net:** \`${net >= 0 ? '+' : ''}${net.toLocaleString()} coins\`\n` +
                `> ${emojis.star || ''} **New Balance:** \` ${(data.wallet + net).toLocaleString()}\``
            ));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function generateCard(winner) {
    const symbols = ['', '', '', '', '', ''];
    const w = winner.value > 0 ? symbols[Math.floor(Math.random() * symbols.length)] : null;
    const row = (r) => r.map(s => ` ${s} `).join('|');
    const makeRow = () => Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
    const r1 = makeRow(), r2 = makeRow(), r3 = makeRow();
    if (w) { r2[1] = w; r2[0] = w; r2[2] = w; } // three of a kind middle row on win
    return `${row(r1)}\n${row(r2)}\n${row(r3)}`;
}

function reply(message, accent, text) {
    const container = new ContainerBuilder().setAccentColor(accent)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
}
