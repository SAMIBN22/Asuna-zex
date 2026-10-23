import { ContainerBuilder, MessageFlags } from 'discord.js';
import config from '../../../config/config.js';

const PRIMARY_OWNER_IDS = new Set((config.primaryOwnerIds || []).map(String));

function panel(color, content) {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [
            new ContainerBuilder()
                .setAccentColor(color)
                .addTextDisplayComponents((text) => text.setContent(content)),
        ],
    };
}

export default {
    name: 'assistant',
    aliases: ['assistants', 'assistantid'],
    description: 'View the bot assistant configuration and setup instructions.',
    category: 'Owner',
    usage: '&assistant [list]',
    ownerOnly: true,
    noPrefix: true,

    async execute(message, args, client) {
        if (!PRIMARY_OWNER_IDS.has(String(message.author.id))) {
            return message.reply(panel(
                0xED4245,
                '## Access Denied\n> Only the primary bot owner can manage assistant access.'
            ));
        }

        const subcommand = (args[0] || 'list').toLowerCase();
        if (subcommand !== 'list') {
            return message.reply(panel(
                0xFBBF24,
                '## Assistant Manager\n\n' +
                '**Usage:** `&assistant list`\n\n' +
                'To add an assistant, place one or more Discord user IDs in the secure environment variable `ASSISTANT_IDS`, separated by commas, then restart the bot.\n\n' +
                '**Example:** `ASSISTANT_IDS=123456789012345678,987654321098765432`\n\n' +
                'Assistant access is limited to trusted users. Never share the bot token.'
            ));
        }

        const assistants = client.config?.assistantIds || [];
        const assistantList = assistants.length
            ? assistants.map((id) => `> <@${id}> — \`${id}\``).join('\n')
            : '> No assistant IDs are configured.';

        return message.reply(panel(
            0x5865F2,
            '## Bot Assistant Configuration\n\n' +
            `**Configured assistants:** ${assistants.length}\n` +
            `${assistantList}\n\n` +
            '**Setup:** Add IDs to the secure `ASSISTANT_IDS` environment variable and restart the bot.\n' +
            '**Security:** Only the primary bot owner can manage this configuration.'
        ));
    },
};