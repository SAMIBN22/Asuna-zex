import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { randomUUID } from 'node:crypto';

const CONTROL_BUTTON = 'owner_broadcast_compose';
const RATE_PREFIX = 'owner_broadcast_rate:';
const FEEDBACK_PREFIX = 'owner_broadcast_feedback:';
const MAX_MESSAGE_LENGTH = 3500;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// Broadcast sessions are intentionally short-lived. The original announcement
// remains in each DM, while this map only tracks the feedback interaction.
const sessions = new Map();

function getBotOwnerIds(client) {
    return new Set(
        (client.config?.botOwnerIds || client.config?.primaryOwnerIds || [])
            .map(String)
            .filter(Boolean),
    );
}

export function isBotOwner(client, userId) {
    return getBotOwnerIds(client).has(String(userId));
}

function pruneSessions() {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, session] of sessions) {
        if (session.createdAt < cutoff) sessions.delete(id);
    }
}

function shorten(value, maxLength = 1024) {
    const text = String(value || '').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildControlPanel() {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Owner Broadcast Center')
        .setDescription(
            'Use this private control panel to send a professional announcement to the owners of every server where the bot is installed.',
        )
        .addFields(
            {
                name: 'Recipients',
                value: 'Every available server owner will receive the message in a direct message.',
                inline: false,
            },
            {
                name: 'Feedback',
                value: 'Recipients can rate the announcement from 1 to 5 stars and send written feedback.',
                inline: false,
            },
        )
        .setFooter({ text: 'Restricted to the two bot owners' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(CONTROL_BUTTON)
            .setLabel('Compose Broadcast')
            .setStyle(ButtonStyle.Primary),
    );

    return { embeds: [embed], components: [row] };
}

function buildRatingRows(session) {
    const ratingRow = new ActionRowBuilder();
    for (let rating = 1; rating <= 5; rating += 1) {
        ratingRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`${RATE_PREFIX}${session.id}:${rating}`)
                .setLabel(`${rating} Star${rating === 1 ? '' : 's'}`)
                .setStyle(session.rating === rating ? ButtonStyle.Success : ButtonStyle.Secondary),
        );
    }

    const feedbackRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${FEEDBACK_PREFIX}${session.id}`)
            .setLabel(session.feedback ? 'Update Written Feedback' : 'Write Feedback')
            .setStyle(ButtonStyle.Primary),
    );

    return [ratingRow, feedbackRow];
}

function buildRecipientEmbed(session) {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Message from the Bot Owners')
        .setDescription(session.broadcastText)
        .addFields(
            {
                name: 'Server',
                value: shorten(session.guildName, 1024),
                inline: true,
            },
            {
                name: 'How to respond',
                value: 'Select a star rating below, then use “Write Feedback” to send a written response. You can also reply directly to this DM.',
                inline: false,
            },
        )
        .setFooter({
            text: session.rating
                ? `Your current rating: ${session.rating}/5 • Thank you for your feedback`
                : 'Your feedback helps us improve the bot',
        });

    if (session.feedback) {
        embed.addFields({
            name: 'Your current written feedback',
            value: shorten(session.feedback, 1024),
            inline: false,
        });
    }

    return embed;
}

function buildOwnerNotification(session, kind) {
    const title = kind === 'feedback'
        ? 'New Written Feedback Received'
        : 'New Star Rating Received';

    return new EmbedBuilder()
        .setColor(kind === 'feedback' ? 0x57f287 : 0xf1c40f)
        .setTitle(title)
        .setDescription('A server owner has responded to the latest owner broadcast.')
        .addFields(
            { name: 'Server', value: shorten(session.guildName), inline: true },
            { name: 'Server Owner', value: `${shorten(session.ownerTag)} (<@${session.ownerId}>)`, inline: true },
            { name: 'Rating', value: session.rating ? `${session.rating}/5 stars` : 'Not provided', inline: true },
            { name: 'Written Feedback', value: shorten(session.feedback || 'No written feedback provided.', 1024), inline: false },
            { name: 'Original Broadcast', value: shorten(session.broadcastText, 1024), inline: false },
        )
        .setFooter({ text: 'Owner Broadcast Center' })
        .setTimestamp();
}

async function notifyBotOwners(client, session, kind) {
    const notification = { embeds: [buildOwnerNotification(session, kind)] };
    for (const ownerId of getBotOwnerIds(client)) {
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) await owner.send(notification).catch(() => {});
    }
}

async function updateRecipientMessage(session) {
    if (!session.dmMessage) return;
    await session.dmMessage.edit({
        embeds: [buildRecipientEmbed(session)],
        components: buildRatingRows(session),
    }).catch(() => {});
}

async function sendBroadcast(client, broadcastText) {
    pruneSessions();

    const sentGuildIds = new Set();
    const failedGuilds = [];
    let sentCount = 0;

    for (const guild of client.guilds.cache.values()) {
        if (!guild.ownerId || sentGuildIds.has(guild.id)) continue;
        sentGuildIds.add(guild.id);

        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        if (!owner) {
            failedGuilds.push(guild.name);
            continue;
        }

        const session = {
            id: randomUUID(),
            createdAt: Date.now(),
            guildId: guild.id,
            guildName: guild.name,
            ownerId: guild.ownerId,
            ownerTag: owner.tag || owner.username,
            broadcastText,
            rating: null,
            feedback: '',
            dmMessage: null,
        };

        session.dmMessage = await owner.send({
            embeds: [buildRecipientEmbed(session)],
            components: buildRatingRows(session),
        }).catch(() => null);

        if (session.dmMessage) {
            sessions.set(session.id, session);
            sentCount += 1;
        }
        else failedGuilds.push(guild.name);
    }

    return {
        sent: sentCount,
        total: sentGuildIds.size,
        failedGuilds,
    };
}

async function showComposeModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('owner_broadcast_compose_modal')
        .setTitle('Compose Owner Broadcast')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('owner_broadcast_message')
                    .setLabel('Message to send to server owners')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Write a clear and professional message...')
                    .setMaxLength(MAX_MESSAGE_LENGTH)
                    .setRequired(true),
            ),
        );

    return interaction.showModal(modal);
}

export async function handleOwnerBroadcastInteraction(interaction, client) {
    if (!interaction.customId?.startsWith('owner_broadcast_')) return false;

    if (interaction.customId === CONTROL_BUTTON) {
        if (!isBotOwner(client, interaction.user.id)) {
            return interaction.reply({
                content: 'This control panel is restricted to the bot owners.',
                flags: MessageFlags.Ephemeral,
            });
        }
        return showComposeModal(interaction);
    }

    if (interaction.customId.startsWith(RATE_PREFIX)) {
        const [, sessionId, rawRating] = interaction.customId.split(':');
        const session = sessions.get(sessionId);
        const rating = Number(rawRating);

        if (!session || session.ownerId !== interaction.user.id || rating < 1 || rating > 5) {
            return interaction.reply({
                content: 'This feedback request is no longer available.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const changed = session.rating !== rating;
        session.rating = rating;
        await interaction.update({
            embeds: [buildRecipientEmbed(session)],
            components: buildRatingRows(session),
        });
        if (changed) await notifyBotOwners(client, session, 'rating');
        return true;
    }

    if (interaction.customId.startsWith(FEEDBACK_PREFIX)) {
        const sessionId = interaction.customId.slice(FEEDBACK_PREFIX.length);
        const session = sessions.get(sessionId);

        if (!session || session.ownerId !== interaction.user.id) {
            return interaction.reply({
                content: 'This feedback request is no longer available.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`${FEEDBACK_PREFIX}${session.id}:modal`)
            .setTitle('Write Your Feedback')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('owner_feedback_text')
                        .setLabel('Your feedback')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Tell us what you liked or what we can improve...')
                        .setMaxLength(2000)
                        .setRequired(true)
                        .setValue(session.feedback.slice(0, 2000)),
                ),
            );

        return interaction.showModal(modal);
    }

    return false;
}

export async function handleOwnerBroadcastModal(interaction, client) {
    if (!interaction.customId?.startsWith(`${FEEDBACK_PREFIX}`) &&
        interaction.customId !== 'owner_broadcast_compose_modal') {
        return false;
    }

    if (interaction.customId === 'owner_broadcast_compose_modal') {
        if (!isBotOwner(client, interaction.user.id)) {
            return interaction.reply({
                content: 'This control panel is restricted to the bot owners.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const broadcastText = interaction.fields.getTextInputValue('owner_broadcast_message').trim();
        if (!broadcastText) {
            return interaction.reply({
                content: 'Please enter a message before sending the broadcast.',
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await sendBroadcast(client, broadcastText);
        const failedText = result.failedGuilds.length
            ? `\nCould not deliver to: ${result.failedGuilds.slice(0, 10).map(shorten).join(', ')}`
            : '';

        return interaction.editReply(
            `Broadcast complete. Delivered to **${result.sent}** server owner${result.sent === 1 ? '' : 's'} out of **${result.total}** server${result.total === 1 ? '' : 's'}.${failedText}`,
        );
    }

    const sessionId = interaction.customId.slice(FEEDBACK_PREFIX.length).replace(/:modal$/, '');
    const session = sessions.get(sessionId);
    if (!session || session.ownerId !== interaction.user.id) {
        return interaction.reply({
            content: 'This feedback request is no longer available.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const feedback = interaction.fields.getTextInputValue('owner_feedback_text').trim();
    if (!feedback) {
        return interaction.reply({
            content: 'Please enter feedback before submitting.',
            flags: MessageFlags.Ephemeral,
        });
    }

    session.feedback = feedback;
    await interaction.reply({
        content: 'Thank you. Your feedback has been sent to the bot owners.',
        flags: MessageFlags.Ephemeral,
    });
    await updateRecipientMessage(session);
    await notifyBotOwners(client, session, 'feedback');
    return true;
}

export async function handleOwnerBroadcastDirectMessage(message, client) {
    pruneSessions();
    const session = [...sessions.values()]
        .filter((candidate) => candidate.ownerId === message.author.id)
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!session || !message.content?.trim()) return false;

    session.feedback = message.content.trim().slice(0, 2000);
    await updateRecipientMessage(session);
    await notifyBotOwners(client, session, 'feedback');
    await message.reply('Thank you. Your feedback has been sent to the bot owners.').catch(() => {});
    return true;
}

export default {
    name: '1',
    description: 'Open the private bot-owner broadcast center.',
    aliases: ['owner-broadcast'],
    async execute(message, args, client) {
        if (!isBotOwner(client, message.author.id)) {
            return message.reply('This command is restricted to the two bot owners.');
        }

        return message.reply(buildControlPanel());
    },
};