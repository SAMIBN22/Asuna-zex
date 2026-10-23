import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    SeparatorSpacingSize,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
} from 'discord.js';
import themeManager from '../../../themes/themeManager.js';
import config from '../../../config/config.js';

// ─── Custom Emojis ────────────────────────────────────────────────────────────
const EMOJI_TITLE = '<:15367544377150095461:1537455650034942093>';
const EMOJI_BUG   = '<:15367538686277797061:1537451662321647666>';
const EMOJI_PREM  = '<:15367551382057165311:1537455876238213241>';

const parseEmoji = (str, fallback) => {
    const value = typeof str === 'string' ? str.trim() : '';
    if (!value) return { name: fallback };
    const m = value.match(/<a?:(\w+):(\d+)>/);
    return m ? { name: m[1], id: m[2], animated: value.startsWith('<a:') } : { name: value };
};

// ─── Per-user cooldown (60 seconds) ──────────────────────────────────────────
const cooldownMap = new Map();
const COOLDOWN_MS = 60_000;

// ─── Build the support container ─────────────────────────────────────────────
export function buildContainer(accentColor) {
    return new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(text =>
            text.setContent(
                `## ${EMOJI_TITLE} __Support Center__\n` +
                `-# Professional assistance, one message away.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(text =>
            text.setContent(
                `### __How can we help?__\n` +
                `Choose the support category that best matches your request. ` +
                `Our development team will review your message and follow up as soon as possible.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(text =>
            text.setContent(
                `${EMOJI_BUG} __Bug Reports & Errors__\n` +
                `-# Report unexpected behavior, errors, or issues you have encountered.\n\n` +
                `${EMOJI_PREM} __Custom Bot Premium__\n` +
                `-# Ask about premium features, custom development, or a tailored bot.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(text =>
            text.setContent(`### __Select a support option__`)
        )
        .addActionRowComponents(row =>
            row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('support_select')
                    .setPlaceholder('Choose a support category')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Bugs & Errors')
                            .setDescription('Report an issue or unexpected bot behavior')
                            .setValue('bugs')
                            .setEmoji(parseEmoji(EMOJI_BUG, '<:15367544377150095461:1537455650034942093>')),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Custom Bot Premium')
                            .setDescription('Explore premium features or custom development')
                            .setValue('premium')
                            .setEmoji(parseEmoji(EMOJI_PREM, '<:15367551382057165311:1537455876238213241>')),
                    )
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(text =>
            text.setContent(
                `-# __Need a quick status check?__ Use \`.subscription <server|self>\` to view your subscription status.`
            )
        );
}

function buildSupportModal(value, userId) {
    if (value === 'bugs') {
        return new ModalBuilder()
            .setCustomId(`support_bug_${userId}`)
            .setTitle('Report a Bug or Error')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Description of the issue')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Please describe the bug or error in detail')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('steps')
                        .setLabel('Steps to reproduce')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('List the steps to reproduce this issue')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('expected')
                        .setLabel('Expected behavior')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('What did you expect to happen?')
                        .setRequired(true)
                ),
            );
    }

    return new ModalBuilder()
        .setCustomId(`support_premium_${userId}`)
        .setTitle('Custom Bot Premium Inquiry')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('looking_for')
                    .setLabel('What are you looking for?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Please describe what features or services you need')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('budget')
                    .setLabel('Budget (if applicable)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('What is your budget for this project?')
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('timeline')
                    .setLabel('Timeline / Deadline')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('When do you need this completed by?')
                    .setRequired(false)
            ),
        );
}

export async function handleSupportSelect(interaction) {
    const value = interaction.values?.[0];
    if (value !== 'bugs' && value !== 'premium') {
        return interaction.reply({
            content: 'This support option is no longer available. Please use the latest support panel.',
            flags: MessageFlags.Ephemeral,
        });
    }

    return interaction.showModal(buildSupportModal(value, interaction.user.id));
}

export async function handleSupportModal(interaction, client) {
    const isBugReport = interaction.customId.startsWith('support_bug_');
    const isPremiumRequest = interaction.customId.startsWith('support_premium_');
    if (!isBugReport && !isPremiumRequest) return;

    const ownerId = interaction.customId.split('_').at(-1);
    if (ownerId !== interaction.user.id) {
        return interaction.reply({
            content: 'This form belongs to another user and cannot be submitted from your account.',
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const user = interaction.user;
    const guild = interaction.guild;
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    let dmEmbed;

    if (isBugReport) {
        const desc = interaction.fields.getTextInputValue('description');
        const steps = interaction.fields.getTextInputValue('steps');
        const expected = interaction.fields.getTextInputValue('expected');

        dmEmbed = new EmbedBuilder()
            .setTitle(`${EMOJI_BUG} New Bug Report`)
            .setColor(0xe74c3c)
            .setThumbnail(avatarUrl)
            .addFields(
                { name: 'User', value: `**${user.username}** (\`${user.id}\`)` },
                { name: 'Description', value: desc.slice(0, 1024) },
                { name: 'Steps to Reproduce', value: steps.slice(0, 1024) },
                { name: 'Expected Behavior', value: expected.slice(0, 1024) },
            )
            .setTimestamp()
            .setFooter({ text: `Server: ${guild?.name || 'Unknown Server'} (${guild?.id || 'Unknown ID'})` });
    } else {
        const lookingFor = interaction.fields.getTextInputValue('looking_for');
        const budget = interaction.fields.getTextInputValue('budget') || 'Not specified';
        const timeline = interaction.fields.getTextInputValue('timeline') || 'Not specified';

        dmEmbed = new EmbedBuilder()
            .setTitle(`${EMOJI_PREM} New Premium Inquiry`)
            .setColor(0x2ecc71)
            .setThumbnail(avatarUrl)
            .addFields(
                { name: 'User', value: `**${user.username}** (\`${user.id}\`)` },
                { name: 'What They Need', value: lookingFor.slice(0, 1024) },
                { name: 'Budget', value: budget.slice(0, 512) },
                { name: 'Timeline / Deadline', value: timeline.slice(0, 512) },
            )
            .setTimestamp()
            .setFooter({ text: `Server: ${guild?.name || 'Unknown Server'} (${guild?.id || 'Unknown ID'})` });
    }

    const recipientIds = new Set([
        ...(config.devIds || []),
        ...(config.botOwnerIds || []),
    ]);

    for (const recipientId of recipientIds) {
        try {
            const recipient = await client.users.fetch(recipientId);
            await recipient.send({ embeds: [dmEmbed] });
        } catch {
            // A recipient may have direct messages disabled — continue safely.
        }
    }

    return interaction.editReply({
        content: 'Your submission has been received. Our development team will get back to you shortly.',
    });
}

export default {
    name: 'support',
    aliases: ['sup'],
    description: 'Open the Support Center',
    category: 'Utility',
    usage: 'support',

    async execute(message, args, client) {
        // ── One-minute cooldown for regular users; both bot owners bypass it ──
        const now  = Date.now();
        const isBotOwner = config.botOwnerIds?.includes(message.author.id);
        const last = cooldownMap.get(message.author.id);
        if (!isBotOwner && last && now - last < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
            return message.reply({
                content: `__Support Panel Cooldown__\nPlease wait **${remaining}s** before using \`&support\` again.`,
                allowedMentions: { parse: [] },
            });
        }
        if (!isBotOwner) cooldownMap.set(message.author.id, now);

        // ── Resolve theme ─────────────────────────────────────────────────────
        const theme       = await themeManager.getTheme(message.guild.id);
        const accentColor = themeManager.getRGBColor(theme.color);

        // ── Send the support panel ────────────────────────────────────────────
        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [buildContainer(accentColor)],
            allowedMentions: { parse: [] },
        });

        // The panel is persistent. Its interactions are handled globally by
        // events/message/interactionCreate.js, so it remains usable forever
        // and continues working after a bot restart.
        return sent;

        // ── Collect select menu interactions ──────────────────────────────────
        const collector = sent.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && i.customId === 'support_select',
            time: 300_000,
        });

        collector.on('collect', async (interaction) => {
            const value = interaction.values[0];

            // ── Choose the right modal ────────────────────────────────────────
            let modal;
            if (value === 'bugs') {
                modal = new ModalBuilder()
                    .setCustomId(`support_bug_${message.author.id}`)
                    .setTitle('Report a Bug or Error')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('description')
                                .setLabel('Description of the issue')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Please describe the bug or error in detail')
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('steps')
                                .setLabel('Steps to reproduce')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('List the steps to reproduce this issue')
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('expected')
                                .setLabel('Expected behavior')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('What did you expect to happen?')
                                .setRequired(true)
                        ),
                    );
            } else {
                modal = new ModalBuilder()
                    .setCustomId(`support_premium_${message.author.id}`)
                    .setTitle('Custom Bot Premium Inquiry')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('looking_for')
                                .setLabel('What are you looking for?')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Please describe what features or services you need')
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('budget')
                                .setLabel('Budget (if applicable)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('What is your budget for this project?')
                                .setRequired(false)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('timeline')
                                .setLabel('Timeline / Deadline')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('When do you need this completed by?')
                                .setRequired(false)
                        ),
                    );
            }

            // ── Show the modal ────────────────────────────────────────────────
            await interaction.showModal(modal);

            // ── Await modal submission ────────────────────────────────────────
            try {
                const submitted = await interaction.awaitModalSubmit({
                    time: 300_000,
                    filter: (i) => i.user.id === message.author.id,
                });

                await submitted.deferReply({ ephemeral: true });

                const user      = message.author;
                const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });

                // ── Build owner DM embed ──────────────────────────────────────
                let dmEmbed;
                if (value === 'bugs') {
                    const desc     = submitted.fields.getTextInputValue('description');
                    const steps    = submitted.fields.getTextInputValue('steps');
                    const expected = submitted.fields.getTextInputValue('expected');

                    dmEmbed = new EmbedBuilder()
                        .setTitle(`${EMOJI_BUG} New Bug Report`)
                        .setColor(0xe74c3c)
                        .setThumbnail(avatarUrl)
                        .addFields(
                            { name: ' User', value: `**${user.username}** (\`${user.id}\`)` },
                            { name: ' Description', value: desc.slice(0, 1024) },
                            { name: ' Steps to Reproduce', value: steps.slice(0, 1024) },
                            { name: ' Expected Behavior', value: expected.slice(0, 1024) },
                        )
                        .setTimestamp()
                        .setFooter({ text: `Server: ${message.guild.name} (${message.guild.id})` });
                } else {
                    const lookingFor = submitted.fields.getTextInputValue('looking_for');
                    const budget     = submitted.fields.getTextInputValue('budget') || 'Not specified';
                    const timeline   = submitted.fields.getTextInputValue('timeline') || 'Not specified';

                    dmEmbed = new EmbedBuilder()
                        .setTitle(`${EMOJI_PREM} New Premium Inquiry`)
                        .setColor(0x2ecc71)
                        .setThumbnail(avatarUrl)
                        .addFields(
                            { name: ' User', value: `**${user.username}** (\`${user.id}\`)` },
                            { name: ' What They Need', value: lookingFor.slice(0, 1024) },
                            { name: ' Budget', value: budget.slice(0, 512) },
                            { name: ' Timeline / Deadline', value: timeline.slice(0, 512) },
                        )
                        .setTimestamp()
                        .setFooter({ text: `Server: ${message.guild.name} (${message.guild.id})` });
                }

                // ── DM all devIds ─────────────────────────────────────────────
                for (const devId of config.devIds) {
                    try {
                        const dev = await client.users.fetch(devId);
                        await dev.send({ embeds: [dmEmbed] });
                    } catch {
                        // Dev has DMs closed — skip silently
                    }
                }

                await submitted.editReply({
                    content: ` Your submission has been received! Our development team will get back to you shortly.`,
                });

            } catch {
                // Modal timed out or dismissed
            }
        });

        // ── Disable the menu after 5 minutes ─────────────────────────────────
        collector.on('end', async () => {
            try {
                await sent.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [buildContainer(accentColor, true)],
                    allowedMentions: { parse: [] },
                });
            } catch {
                // Message deleted — ignore
            }
        });
    },
};
