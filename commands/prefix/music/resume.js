import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'resume',
    aliases: ['unpause'],
    description: 'Resume the paused track.',
    category: 'Music',
    usage: '&resume',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.paused) return msg.error(message.channel, 'The player is already playing.');
        player.pause(false);
        msg.success(message.channel, 'Resumed the music.');
    },
};
