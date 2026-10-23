import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, AttachmentBuilder } from 'discord.js';
import https from 'https';
import http from 'http';
import { Buffer } from 'buffer';

export default {
    name: 'svg',
    description: 'Convert SVG code or URL to PNG image',
    category: 'Utility',
    usage: 'svg <svg code or url>',
    aliases: ['svg2png', 'convertsvg'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const input = args.join(' ').trim();
        if (!input) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n` +
                        `> ${emojis.star || ''} **URL:** \`&svg https://example.com/image.svg\`\n` +
                        `> ${emojis.star || ''} **Code:** \`&svg <svg>...</svg>\``
                    ))]
            });
        }

        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Converting SVG...__`))]
        });

        try {
            let svgBuffer;

            if (input.startsWith('http://') || input.startsWith('https://')) {
                // Download SVG from URL
                svgBuffer = await new Promise((resolve, reject) => {
                    const proto = input.startsWith('https') ? https : http;
                    proto.get(input, (res) => {
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });
            } else if (input.includes('<svg')) {
                svgBuffer = Buffer.from(input, 'utf-8');
            } else {
                throw new Error('Invalid input: provide an SVG URL or SVG code.');
            }

            // Use Resvg for SVG rendering via API fallback
            const svgApiRes = await fetch('https://svg2png.com/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ svg: svgBuffer.toString('utf-8'), width: 512, height: 512 })
            }).catch(() => null);

            if (svgApiRes?.ok) {
                const pngBuffer = Buffer.from(await svgApiRes.arrayBuffer());
                const attachment = new AttachmentBuilder(pngBuffer, { name: 'output.png' });
                await loading.delete().catch(() => {});
                return message.reply({ files: [attachment], allowedMentions: { parse: [] } });
            }

            // Fallback: show the raw SVG as text
            throw new Error('Conversion service unavailable.');
        } catch (err) {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Conversion Failed__\n> ${emojis.star || ''} **${err.message}**\n> ${emojis.star || ''} Please ensure the SVG is valid and accessible.`
                    ))]
            });
        }
    }
};
