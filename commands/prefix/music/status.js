import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'status',
    aliases: ['player'],
    description: 'Show the current player status (volume, loop, etc.).',
    category: 'Music',
    usage: '&status',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        msg.playerStatus(message.channel, player);
    },
};
