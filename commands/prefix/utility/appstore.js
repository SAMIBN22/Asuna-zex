import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'appstore',
    description: 'Search for apps on the Apple App Store',
    category: 'Utility',
    usage: 'appstore <query>',
    aliases: ['app', 'itunes'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&appstore <app name>\`**`
                    ))]
            });
        }

        const query = args.join(' ');
        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Searching App Store...__`))]
        });

        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&country=us&limit=5`);
            const data = await res.json();

            if (!data.results?.length) {
                return loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __No Results Found__\n> ${emojis.star || ''} **No apps found for:** \`${query}\``
                        ))]
                });
            }

            const app = data.results[0];
            const rating = app.averageUserRating ? `${''.repeat(Math.round(app.averageUserRating))} (${app.averageUserRating.toFixed(1)})` : 'N/A';
            const price = app.price === 0 ? 'Free' : `$${app.price}`;
            const size = app.fileSizeBytes ? `${(parseInt(app.fileSizeBytes) / 1048576).toFixed(1)} MB` : 'N/A';

            const otherApps = data.results.slice(1, 4).map(a => `> ${emojis.star || ''} **${a.trackName}** — ${a.price === 0 ? 'Free' : `$${a.price}`}`).join('\n');

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __App Store Results__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${app.trackName}\n` +
                                    `> ${emojis.star || ''} **Developer:** ${app.artistName}\n` +
                                    `> ${emojis.star || ''} **Category:** ${app.primaryGenreName}\n` +
                                    `> ${emojis.star || ''} **Price:** ${price}\n` +
                                    `> ${emojis.star || ''} **Rating:** ${rating}\n` +
                                    `> ${emojis.star || ''} **Size:** ${size}\n` +
                                    `> ${emojis.star || ''} **Version:** ${app.version}`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(app.artworkUrl100 || app.artworkUrl60))
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __Other Results__\n${otherApps || '> *No other results*'}\n\n` +
                            `>  [View on App Store](${app.trackViewUrl})`
                        ))
                ]
            });
        } catch {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Error__\n> ${emojis.star || ''} **Failed to fetch App Store data.**`
                    ))]
            });
        }
    }
};
