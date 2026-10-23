import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'skip',
    aliases: ['s', 'next'],
    description: 'Skip the current track.',
    category: 'Music',
    usage: '&skip',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.queue.length && !player.queue.current)
            return msg.error(message.channel, 'No more tracks to skip to.');
        player.stop();
        msg.success(message.channel, 'Skipped the current track.');
    },
};
