import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'stop',
    aliases: ['dc', 'disconnect', 'leave'],
    description: 'Stop playback, clear the queue, and leave the voice channel.',
    category: 'Music',
    usage: '&stop',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        player.destroy();
        msg.success(message.channel, 'Stopped the music and cleared the queue.');
    },
};
