import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (!message.guild) return;
        if (message.author?.bot) return;
        if (!message.author) return; // partial / uncached

        const content = message.content?.trim();
        const hasContent = content && content.length > 0;
        const hasAttachments = message.attachments?.size > 0;
        if (!hasContent && !hasAttachments) return;

        await new Promise(r => setTimeout(r, 1200));
        let deletedBy = null;
        try {
            const logs  = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === message.author.id && (Date.now() - entry.createdTimestamp) < 5000) {
                deletedBy = entry.executor;
            }
        } catch { /* */ }

        await sendLog(client, message.guild, 'messageDel', (accent, theme) => {
            const star    = theme.emojis?.star || '⭐';
            const preview = content?.length > 800 ? content.slice(0, 797) + '...' : content;
            const attachmentList = hasAttachments
                ? [...message.attachments.values()].map(a => `[${a.name}](${a.url})`).join(', ')
                : null;

            let body =
                `${star} **Author:** ${message.author} (\`${message.author.username}\`)\n` +
                `${star} **Channel:** <#${message.channel.id}>\n` +
                `${star} **Deleted By:** ${deletedBy ? `<@${deletedBy.id}>` : '`Author or Unknown`'}\n` +
                `${star} **Deleted At:** ${ts()}`;

            if (preview) body += `\n\n**📄 Content:**\n\`\`\`\n${preview}\n\`\`\``;
            if (attachmentList) body += `\n${star} **Attachments:** ${attachmentList}`;

            return new ContainerBuilder()
                .setAccentColor(COLORS.red)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🗑️ __Message Deleted__`))
                .addSeparatorComponents(div(true))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(
                                message.author.displayAvatarURL({ extension: 'png', size: 256 })
                            )
                        )
                )
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(message.guild));
        });
    },
};
