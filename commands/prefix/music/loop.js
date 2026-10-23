import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';
import emojis from '../../../lib/musicEmojis.js';

export default {
    name: 'loop',
    aliases: ['repeat'],
    description: 'Toggle queue loop on/off.',
    category: 'Music',
    usage: '&loop',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;
        const newMode = player.loop === 'none' ? 'queue' : 'none';
        player.setLoop(newMode);
        msg.success(message.channel,
            `${emojis.repeat} Loop ${newMode === 'queue' ? '**enabled** (queue)' : '**disabled**'}.`
        );
    },
};
