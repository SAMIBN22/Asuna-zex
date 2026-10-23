import { Events } from 'discord.js';

export default {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (message.author?.bot) return;
        if (!message.guild) return;

        // Cache up to 1 deleted message per channel for snipe command
        if (!client.snipeCache) client.snipeCache = new Map();

        const content = message.content || '';
        const attachments = message.attachments.map(a => a.url);

        client.snipeCache.set(message.channel.id, {
            authorId: message.author?.id,
            authorTag: message.author?.tag || 'Unknown',
            authorAvatar: message.author?.displayAvatarURL({ extension: 'png', size: 256 }) || null,
            content,
            attachments,
            deletedAt: Date.now()
        });
    }
};
