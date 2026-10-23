/**
 * threadHandler.js
 * Handles all interactions for the Thread compose system:
 *
 *   thread_panel_open     — shows ephemeral compose panel (Dark / Light buttons)
 *   thread_compose_dark   — opens the Dark card compose modal
 *   thread_compose_light  — opens the Light card compose modal
 *   thread_modal_dark     — posts a dark card to the channel
 *   thread_modal_light    — posts a light card to the channel
 */

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';

// ── Modal builder ─────────────────────────────────────────────────────────────

function buildComposeModal(mode) {
    const label = mode === 'dark' ? '⬛  Dark Card — Write your message' : '⬜  Light Card — Write your message';
    return new ModalBuilder()
        .setCustomId(`thread_modal_${mode}`)
        .setTitle(mode === 'dark' ? '⬛ Dark Thread Card' : '⬜ Light Thread Card')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('thread_text')
                    .setLabel('Your message')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Write anything you want to post...')
                    .setMinLength(1)
                    .setMaxLength(2000)
                    .setRequired(true)
            )
        );
}

// ── Card builder ─────────────────────────────────────────────────────────────

function buildThreadEmbed(mode, member, guild, text) {
    const isDark    = mode === 'dark';
    const color     = isDark ? 0x000000 : 0xFFFFFF;
    const guildIcon = guild.iconURL({ extension: 'png', size: 64 }) ?? null;

    return new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name:    member.displayName,
            iconURL: member.user.displayAvatarURL({ extension: 'png', size: 128 }),
        })
        .setDescription(text)
        .setThumbnail(guildIcon)
        .setTimestamp()
        .setFooter({
            text:    guild.name,
            iconURL: guildIcon ?? undefined,
        });
}

// ── Ephemeral compose panel ───────────────────────────────────────────────────

function buildComposePanel() {
    return {
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [
            new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## 🧵 __Thread — Compose__\n\n` +
                                `> Choose a card style and write your message.\n` +
                                `> It will be posted in this channel for everyone to see.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(
                                'https://cdn.discordapp.com/embed/avatars/0.png'
                            )
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('thread_compose_dark')
                            .setLabel('⬛  Dark')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('thread_compose_light')
                            .setLabel('⬜  Light')
                            .setStyle(ButtonStyle.Secondary),
                    )
                ),
        ],
    };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleThreadInteraction(interaction, client) {
    const cid = interaction.customId;

    // ── Thread button → show ephemeral compose panel ─────────────────────────
    if (cid === 'thread_panel_open') {
        return interaction.reply(buildComposePanel());
    }

    // ── Dark / Light compose buttons → show modal ─────────────────────────────
    if (cid === 'thread_compose_dark' || cid === 'thread_compose_light') {
        const mode = cid === 'thread_compose_dark' ? 'dark' : 'light';
        return interaction.showModal(buildComposeModal(mode));
    }

    // ── Modal submissions → post card to channel ──────────────────────────────
    if (cid === 'thread_modal_dark' || cid === 'thread_modal_light') {
        const mode   = cid === 'thread_modal_dark' ? 'dark' : 'light';
        const text   = interaction.fields.getTextInputValue('thread_text').trim();
        const member = interaction.member;
        const guild  = interaction.guild;
        const channel = interaction.channel;

        if (!text) {
            return interaction.reply({
                flags:   MessageFlags.Ephemeral,
                content: '> ⚠️  Your message cannot be empty.',
            });
        }

        const embed = buildThreadEmbed(mode, member, guild, text);

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(`[threadHandler] Failed to post ${mode} card:`, err.message);
            return interaction.reply({
                flags:   MessageFlags.Ephemeral,
                content: '> ❌  Failed to post your card. Please check my permissions in this channel.',
            });
        }

        // Acknowledge the modal silently (ephemeral confirmation)
        return interaction.reply({
            flags:   MessageFlags.Ephemeral,
            content: `> ✅  Your ${mode === 'dark' ? '⬛ dark' : '⬜ light'} card has been posted.`,
        });
    }
}
