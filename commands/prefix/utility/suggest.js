import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'suggest',
    description: 'Submit a feature suggestion for the bot',
    category: 'Utility',
    usage: 'suggest <your suggestion>',
    aliases: ['suggestion', 'feedback'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&suggest <your suggestion>\`**`
                    ))]
            });
        }

        const suggestion = args.join(' ').slice(0, 1000);

        // Send to webhook/support server if configured
        if (client.config.webhookUrl) {
            try {
                await fetch(client.config.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: ' New Suggestion',
                            description: suggestion,
                            color: 0x5865F2,
                            author: { name: `${message.author.tag} (${message.author.id})`, icon_url: message.author.displayAvatarURL() },
                            footer: { text: `Guild: ${message.guild.name} | ${message.guild.id}` },
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            } catch (_) {}
        }

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Suggestion Submitted__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Thank you!__\n` +
                                `> ${emojis.star || ''} **Your suggestion has been received.**\n` +
                                `> ${emojis.star || ''} **From:** ${message.author.toString()}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Your Suggestion__\n> ${suggestion}`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
