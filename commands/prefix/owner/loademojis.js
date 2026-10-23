import { PermissionFlagsBits } from 'discord.js';
import { extractProjectEmojis, syncProjectEmojis } from '../../../lib/projectEmojiSync.js';

function isBotOwner(userId, client) {
    return (client.config?.devIds || []).some(id => String(id) === String(userId));
}

function reply(message, content) {
    return message.reply({
        content,
        allowedMentions: { parse: [] },
    });
}

export default {
    name: 'loademojis',
    aliases: ['importemojis', 'syncemojis'],
    description: 'Import all custom emojis referenced by the bot project into this server.',
    category: 'Owner',
    usage: '&loademojis',
    ownerOnly: true,

    async execute(message, args, client) {
        if (!isBotOwner(message.author.id, client)) {
            return reply(
                message,
                'Access denied. This command is restricted to bot owners.'
            );
        }

        if (!message.guild) {
            return reply(message, 'This command can only be used inside a server.');
        }

        const botMember = message.guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return reply(
                message,
                'I need the **Manage Expressions** permission to import custom emojis.'
            );
        }

        const projectEmojis = await extractProjectEmojis();
        if (projectEmojis.length === 0) {
            return reply(
                message,
                'No custom Discord emojis were found in the bot project. Standard Unicode emojis were ignored.'
            );
        }

        const existingNames = new Set(
            message.guild.emojis.cache
                .map(emoji => emoji.name?.toLowerCase())
                .filter(Boolean)
        );
        const imported = [];
        const skipped = [];
        const failed = [];

        await reply(
            message,
            `Import started. Found **${projectEmojis.length}** unique custom emoji reference(s). I will continue past unavailable sources.`
        );

        const result = await syncProjectEmojis(message.guild, {
            logger: {
                log: (...args) => console.log('[EmojiCommand]', ...args),
                warn: (...args) => console.warn('[EmojiCommand]', ...args),
            },
        });

        const summary = [
            '## Custom Emoji Import Completed',
            `Found in project: **${result.total ?? projectEmojis.length}**`,
            `Successfully imported: **${result.imported ?? 0}**`,
            `Skipped/already present: **${result.skipped ?? 0}**`,
            `Unavailable or failed: **${result.failed ?? 0}**`,
            '',
            'Standard Unicode emojis do not need to be uploaded. Deleted Discord emojis cannot be recreated from their ID alone.',
        ];

        if (result.failedExamples?.length > 0) {
            summary.push('', `Details: ${result.failedExamples.join(', ')}`);
        }

        const response = summary.join('\n');
        return reply(
            message,
            response.length > 1900
                ? `${response.slice(0, 1890)}\n…Additional details were omitted to fit Discord's message limit.`
                : response
        );
    },
};