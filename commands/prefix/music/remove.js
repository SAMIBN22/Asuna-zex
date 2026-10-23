import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'qremove',
    aliases: ['rm', 'removetrack'],
    description: 'Remove a track from the queue by its position.',
    category: 'Music',
    usage: '&qremove <position>',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;

        const pos = parseInt(args[0], 10);
        if (isNaN(pos) || pos < 1 || pos > player.queue.length)
            return msg.error(message.channel,
                `Please provide a valid track position between **1** and **${player.queue.length}**.`
            );

        const removed = player.queue.remove(pos - 1);
        msg.success(message.channel, `Removed **${removed.info.title}** from the queue.`);
    },
};
