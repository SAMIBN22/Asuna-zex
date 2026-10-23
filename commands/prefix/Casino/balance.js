import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';
import Casino from '../../../models/casino.js';
import emojis from '../../emojis.js';

export default {
    name: 'balance',
    aliases: ['bal', 'coins', 'wallet'],
    description: 'Check your wallet and bank balance',
    category: 'Casino',
    usage: 'balance [@user]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const themeEmojis = theme.emojis || {};

        const target = await resolveMember(message, args[0]) || message.member;
        const data = await Casino.findOneAndUpdate(
            { userId: target.id, guildId: message.guild.id },
            { $setOnInsert: { userId: target.id, guildId: message.guild.id } },
            { upsert: true, new: true }
        );

        const total = data.wallet + data.bank;
        const bankPct = Math.min(100, Math.round((data.bank / data.bankLimit) * 100));
        const bar = buildBar(bankPct);

        const container = new ContainerBuilder()
            .setAccentColor(accent)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${emojis.money} __${target.username}'s Balance__`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `> ${themeEmojis.star || ''} **Wallet:** \`${emojis.coin} ${data.wallet.toLocaleString()} coins\`\n` +
                    `> ${themeEmojis.star || ''} **Bank:** \`${emojis.bank} ${data.bank.toLocaleString()} / ${data.bankLimit.toLocaleString()} coins\`\n` +
                    `> ${themeEmojis.star || ''} **Total Net Worth:** \`${emojis.diamond} ${total.toLocaleString()} coins\`\n\n` +
                    `**Bank Storage:** ${bar} \`${bankPct}%\``
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL({ extension: 'png' })))
            );

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
    }
};

function buildBar(pct) {
    const filled = Math.round(pct / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
