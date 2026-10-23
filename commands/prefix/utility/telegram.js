import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'telegram',
    description: 'Show Telegram profile information',
    category: 'Utility',
    usage: 'telegram <@username or username>',
    aliases: ['tg'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&telegram <username>\`**\n> ${emojis.star || ''} **Example:** \`&telegram telegram\``
                    ))]
            });
        }

        const username = args[0].replace('@', '').toLowerCase().trim();
        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Fetching Telegram Profile...__`))]
        });

        try {
            // Use Telegram's public bot API to get user info
            const res = await fetch(`https://t.me/${username}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' }
            });
            const html = await res.text();

            if (!res.ok || html.includes('tgme_page_context_limit')) {
                throw new Error('Profile not found or private.');
            }

            // Parse profile data from HTML
            const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
            const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
            const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

            const name = nameMatch?.[1] ? decodeHTMLEntities(nameMatch[1]) : username;
            const description = descMatch?.[1] ? decodeHTMLEntities(descMatch[1]) : 'No bio available.';
            const image = imageMatch?.[1] || null;

            const isGroup = html.includes('tgme_page_extra') && html.includes('member');
            const memberMatch = html.match(/(\d[\d\s,]+)\s*members/i);
            const members = memberMatch ? memberMatch[1].replace(/\s/g, '') : null;

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Telegram Profile__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${name}\n` +
                                    `> ${emojis.star || ''} **Username:** @${username}\n` +
                                    `> ${emojis.star || ''} **Type:** ${isGroup ? 'Group/Channel' : 'User/Bot'}\n` +
                                    (members ? `> ${emojis.star || ''} **Members:** ${members}\n` : '') +
                                    `> ${emojis.star || ''} **Link:** [t.me/${username}](https://t.me/${username})`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(image || client.user.displayAvatarURL()))
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __Bio__\n> ${description.slice(0, 300)}`
                        ))
                ]
            });
        } catch (err) {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Profile Not Found__\n` +
                        `> ${emojis.star || ''} **@${username}** could not be found.\n` +
                        `> ${emojis.star || ''} The profile may be private or does not exist.\n` +
                        `> ${emojis.star || ''} [Open in Telegram](https://t.me/${username})`
                    ))]
            });
        }
    }
};

function decodeHTMLEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');
}
