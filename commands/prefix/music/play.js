import { musicGuard, requireVoice, requireRiffy } from '../../../lib/musicGuard.js';
import * as msg from '../../../lib/musicMessages.js';

export default {
    name: 'play',
    aliases: ['music'],
    description: 'Play a song or playlist from YouTube, Spotify, or a URL.',
    category: 'Music',
    usage: '&play <song name | URL>',

    async execute(message, args, client) {
        if (!requireRiffy(message)) return;
        if (!await musicGuard(message)) return;
        if (!await requireVoice(message)) return;

        const query = args.join(' ');
        if (!query) return msg.error(message.channel, 'Please provide a search query or URL.');

        try {
            const player = client.riffy.createConnection({
                guildId:      message.guild.id,
                voiceChannel: message.member.voice.channel.id,
                textChannel:  message.channel.id,
                deaf:         true,
            });

            const resolve = await client.riffy.resolve({ query, requester: message.author });
            const { loadType, tracks, playlistInfo } = resolve;

            if (loadType === 'playlist') {
                for (const track of tracks) {
                    track.info.requester = message.author;
                    player.queue.add(track);
                }
                msg.addedPlaylist(message.channel, playlistInfo, tracks);
                if (!player.playing && !player.paused) player.play();

            } else if (loadType === 'search' || loadType === 'track') {
                const track = tracks.shift();
                track.info.requester = message.author;
                const position = player.queue.length + 1;
                player.queue.add(track);
                msg.addedToQueue(message.channel, track, position);
                if (!player.playing && !player.paused) player.play();

            } else {
                msg.error(message.channel, 'No results found. Try a different search term.');
            }
        } catch (err) {
            console.error('[Music] play error:', err);
            msg.error(message.channel, 'An error occurred while trying to play that track. Please try again.');
        }
    },
};
