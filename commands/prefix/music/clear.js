import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'clearqueue',          // primary name avoids collision with admin &clear (purge messages)
    aliases: ['cq', 'qclear'],
    description: 'Clear all tracks from the music queue (keeps the current track playing).',
    category: 'Music',
    usage: '&clearqueue',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.queue.length)
            return msg.error(message.channel, 'The queue is already empty.');
        player.queue.clear();
        msg.success(message.channel, 'Queue cleared.');
    },
};
