import { musicGuard, requirePlayer, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Set the player volume (0–100).',
    category: 'Music',
    usage: '&volume <0-100>',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        const player = requirePlayer(message);
        if (!player) return;

        const vol = parseInt(args[0], 10);
        if (isNaN(vol) || vol < 0 || vol > 100)
            return msg.error(message.channel, 'Please provide a valid volume between **0** and **100**.');

        player.setVolume(vol);
        msg.success(message.channel, `Volume set to **${vol}%**.`);
    },
};
