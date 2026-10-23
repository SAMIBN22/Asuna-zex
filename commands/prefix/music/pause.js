import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'pause',
    aliases: [],
    description: 'Pause the currently playing track.',
    category: 'Music',
    usage: '&pause',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        if (player.paused) return msg.error(message.channel, 'The player is already paused.');
        player.pause(true);
        msg.success(message.channel, 'Paused the music.');
    },
};
