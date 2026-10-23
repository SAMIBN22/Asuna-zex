import { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import Marriage from '../models/marriage.js';

export const pendingProposals = new Map();

export async function getMarriageByUser(guildId, userId) {
    return Marriage.findByUser(guildId, userId);
}

export function getPartnerId(marriage, userId) {
    return marriage.users.find(id => id !== userId);
}

export function formatDuration(fromDate) {
    const ms = Date.now() - fromDate.getTime();
    const totalDays = Math.max(0, Math.floor(ms / 86400000));
    const years = Math.floor(totalDays / 365);
    const remDays = totalDays % 365;
    const months = Math.floor(remDays / 30);
    const days = remDays % 30;

    const parts = [];
    if (years) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    return parts.join(', ');
}

export function buildMarriageContainer(theme, header, content, thumbnailUrl, client) {
    const emojis = theme.emojis || {};
    return new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${emojis.title || ''} __${header}__\n\n${content}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(thumbnailUrl || client.user.displayAvatarURL({ extension: 'png' }))
                )
        );
}

export async function resolveUser(message, userInput, client) {
    if (message.mentions.users.size > 0) return message.mentions.users.first();
    if (userInput && /^\d{17,19}$/.test(userInput)) {
        return await client.users.fetch(userInput).catch(() => null);
    }
    return null;
}
