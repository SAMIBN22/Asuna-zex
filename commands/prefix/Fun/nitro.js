import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js'

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NITRO_IMAGE_FALLBACK = 'https://i.pinimg.com/736x/24/1f/7c/241f7c7ab4f646fc978590f0a133ff73.jpg';

function getConfig() {
    const configPath = path.join(__dirname, '../../config/nitro-images.json');
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return { images: [], expiresHours: 47 };
    }
}

function generateNitroCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function buildNitroPanel(code, config, nitroImageUrl, buttonDisabled = false) {
    const expires = config.expiresHours || 47;
    const link = `https://discord.gift/${code}`;

    return new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`##  Discord Nitro !`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Here's your Discord Nitro gift:\n${link}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**You've been gifted a subscription!**\nYou've been gifted Nitro for **3 months!**`
            )
        )
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(nitroImageUrl)
                    .setDescription('Discord Nitro')
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Expires in ${expires} hours`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`nitro_accept_${code}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(buttonDisabled)
            )
        );
}

export default {
    name: 'nitro',
    aliases: ['givenitro', 'nitrogift'],
    description: 'Send a fake Discord Nitro gift panel',
    category: 'Fun',
    cooldown: 5,

    execute: async (message, args) => {
        const config = getConfig();
        const code = generateNitroCode();

        const nitroImageUrl = config.nitroImage || NITRO_IMAGE_FALLBACK;
        const panel = buildNitroPanel(code, config, nitroImageUrl, false);

        await message.channel.send({
            components: [panel],
            flags: MessageFlags.IsComponentsV2
        });

        try { await message.delete(); } catch (e) {}
    },

    handleAccept: async (interaction) => {
        const config = getConfig();
        const images = config.images || [];

        const code = interaction.customId.replace('nitro_accept_', '');

        const nitroAttachment = interaction.message.attachments.first();
        const nitroImageUrl = nitroAttachment
            ? nitroAttachment.url
            : 'https://i.pinimg.com/originals/a9/d3/07/a9d30701ea0cc98beac1275f4c284d59.gif';

        const displayName = interaction.member?.displayName || interaction.user.globalName || interaction.user.username;

        const updatedPanel = buildNitroPanel(code, config, nitroImageUrl, true);

        const components = [updatedPanel];

        if (images.length > 0) {
            const randomImage = images[Math.floor(Math.random() * images.length)];

            const galleryContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${displayName}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(randomImage)
                            .setDescription(`${displayName}'s gift`)
                    )
                );

            components.push(galleryContainer);
        } else {
            const noImgContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  ${displayName} claimed this gift!`
                    )
                );
            components.push(noImgContainer);
        }

        await interaction.update({
            components,
            flags: [MessageFlags.IsComponentsV2]
        });
    }
};
