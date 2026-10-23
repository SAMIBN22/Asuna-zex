import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'queue',
    aliases: ['q'],
    description: 'Display the current music queue.',
    category: 'Music',
    usage: '&queue',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.queue.length && !player.queue.current)
            return msg.error(message.channel, 'The queue is empty. Add tracks with `&play`.');
        msg.queueList(message.channel, player.queue, player.queue.current);
    },
};
