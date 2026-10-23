import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

const COOLDOWN_MS   = 7_200_000; // 2 hours
const SUCCESS_RATE  = 0.60;
const CRIMES = [
    { name: 'robbed a convenience store', min: 300, max: 700 },
    { name: 'hacked a weak website', min: 200, max: 900 },
    { name: 'pickpocketed a tourist', min: 150, max: 400 },
    { name: 'sold fake concert tickets', min: 250, max: 600 },
    { name: 'smuggled exotic snacks', min: 200, max: 500 },
    { name: 'scammed an NFT buyer', min: 400, max: 1200 },
];
const FINES = [100, 200, 300, 400];

export default {
    name: 'crime',
    aliases: ['heist', 'steal'],
    description: 'Commit a crime for big money — but risk a fine (2h cooldown)',
    category: 'Casino',
    usage: 'crime',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const data = await Casino.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const now = Date.now();
        if (data.lastCrime && now - data.lastCrime.getTime() < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - data.lastCrime.getTime()));
            const container = new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# ${emojis.loading} __Laying Low__\n> ${themeEmojis.star || ''} The police are watching. Wait **${remaining}** before your next crime.`
                ));
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
        }

        const success = Math.random() < SUCCESS_RATE;
        const crime   = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        let text;

        await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $set: { lastCrime: new Date() } });

        if (success) {
            const earned = Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min;
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: earned } });
            text = `> ${emojis.yes} **Success!** You ${crime.name} and got away!\n> ${themeEmojis.star || ''} **Earned:** \`${emojis.coin} ${earned.toLocaleString()} coins\``;
        } else {
            const fine = FINES[Math.floor(Math.random() * FINES.length)];
            const actual = Math.min(fine, data.wallet);
            await Casino.updateOne({ userId: message.author.id, guildId: message.guild.id }, { $inc: { wallet: -actual } });
            text = `> ${emojis.no} **Caught!** You tried to commit a crime but got arrested!\n> ${themeEmojis.star || ''} **Fine:** \`${emojis.coin} ${actual.toLocaleString()} coins\``;
        }

        const container = new ContainerBuilder().setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.thief} __Crime Report__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(text + `\n> ${emojis.loading} **Next attempt:** in 2 hours`));

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function msToTime(ms) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
}
