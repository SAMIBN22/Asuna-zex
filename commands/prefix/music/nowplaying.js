import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'nowplaying',
    aliases: ['np', 'current'],
    description: 'Show info about the currently playing track.',
    category: 'Music',
    usage: '&nowplaying',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.queue.current)
            return msg.error(message.channel, 'No track is currently playing.');
        msg.nowPlaying(message.channel, player.queue.current);
    },
};
