import {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js'

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GIF_URL     = 'https://i.pinimg.com/originals/ad/9c/cd/ad9ccdbb48c43b5c8b4812b0d210e9c0.gif';
const ACCENT      = 0xFFFFFF;
const REACTIONS_PATH = path.join(__dirname, '../../config/stats3-reactions.json');

// Use Unicode emojis so the panel remains valid even when custom emojis
// from another server are unavailable.
const EMOJI_1 = '⭐';
const EMOJI_2 = '🌸';

function loadReactions() {
    try { return JSON.parse(fs.readFileSync(REACTIONS_PATH, 'utf8')); }
    catch { return {}; }
}

function saveReactions(data) {
    fs.writeFileSync(REACTIONS_PATH, JSON.stringify(data, null, 2));
}

function getCounts(guildId) {
    const data = loadReactions();
    if (!data[guildId]) data[guildId] = { e1: 0, e2: 0 };
    return data[guildId];
}

function buildPanel(guild, counts) {
    const total   = guild.memberCount;
    const inVoice = guild.members.cache.filter(m => m.voice.channel).size;
    const boosts  = guild.premiumSubscriptionCount || 0;

    return new ContainerBuilder()
        .setAccentColor(ACCENT)

        // Animated GIF image at the top
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(GIF_URL)
                    .setDescription('Server Banner')
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )

        // Server name with correct emoji
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                ` # __${guild.name}__`
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )

        // Stats
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`  Total Members: **${total.toLocaleString()}**`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`  Voice Members: **${inVoice.toLocaleString()}**`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`  Boosts: **${boosts.toLocaleString()}**`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )

        // Footer
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# All Rights Reserved | Copyright © : ${guild.name}`
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )

        // Reaction buttons
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('stats3_react_e1')
                    .setLabel(`${counts.e1}`)
                    .setEmoji(EMOJI_1)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stats3_react_e2')
                    .setLabel(`${counts.e2}`)
                    .setEmoji(EMOJI_2)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

export default {
    name: 'stats3',
    aliases: ['serverstats3', 'ss3'],
    description: 'Show server stats panel with reactions',
    cooldown: 5,

    async execute(message) {
        const isOwner = message.author.id === message.guild.ownerId;
        const hasHighPerms = message.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !hasHighPerms) return;

        const { guild } = message;
        await guild.members.fetch().catch(() => {});

        const counts = getCounts(guild.id);
        const panel  = buildPanel(guild, counts);

        await message.channel.send({
            components: [panel],
            flags: MessageFlags.IsComponentsV2
        });

        try { await message.delete(); } catch (e) {}
    },

    handleReact: async (interaction) => {
        const guildId = interaction.guild.id;
        const data    = loadReactions();
        if (!data[guildId]) data[guildId] = { e1: 0, e2: 0 };

        if (interaction.customId === 'stats3_react_e1') data[guildId].e1++;
        if (interaction.customId === 'stats3_react_e2') data[guildId].e2++;

        saveReactions(data);

        const guild  = interaction.guild;
        await guild.members.fetch().catch(() => {});

        const counts = data[guildId];
        const panel  = buildPanel(guild, counts);

        await interaction.update({
            components: [panel],
            flags: [MessageFlags.IsComponentsV2]
        });
    }
};
