import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';
import emojis from '../../../lib/musicEmojis.js';

export default {
    name: 'shuffle',
    aliases: ['mix'],
    description: 'Shuffle the current queue.',
    category: 'Music',
    usage: '&shuffle',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (!player.queue.length)
            return msg.error(message.channel, 'Not enough tracks in the queue to shuffle.');
        player.queue.shuffle();
        msg.success(message.channel, `${emojis.shuffle} Queue shuffled!`);
    },
};
