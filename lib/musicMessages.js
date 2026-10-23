/**
 * Shared embed / message builders for the music system.
 * All functions return the Promise from channel.send().
 */
import { EmbedBuilder } from 'discord.js';
import emojis from './musicEmojis.js';
import musicConfig from '../config/musicConfig.js';

export function formatDuration(ms) {
    if (!ms || ms <= 0 || ms === 'Infinity') return 'LIVE';
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const h = Math.floor(ms / (1000 * 60 * 60));
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function getDuration(track) {
    if (track.info.isStream) return 'LIVE';
    if (!track.info.duration)  return 'N/A';
    return formatDuration(track.info.duration);
}

export function success(channel, text) {
    return channel.send(`${emojis.success} | ${text}`);
}

export function error(channel, text) {
    return channel.send(`${emojis.error} | ${text}`);
}

export function nowPlaying(channel, track) {
    const embed = new EmbedBuilder()
        .setColor(musicConfig.embedColor)
        .setTitle(`${emojis.music} Now Playing`)
        .setDescription(`[${track.info.title}](${track.info.uri})`);

    if (track.info.thumbnail && typeof track.info.thumbnail === 'string')
        embed.setThumbnail(track.info.thumbnail);

    embed.addFields(
        { name: 'Artist',       value: `${emojis.info} ${track.info.author}`,                    inline: true },
        { name: 'Duration',     value: `${emojis.time} ${getDuration(track)}`,                    inline: true },
        { name: 'Requested By', value: `${emojis.info} ${track.info.requester?.tag ?? 'Unknown'}`, inline: true },
    ).setFooter({ text: 'Use &help to see all commands' });

    return channel.send({ embeds: [embed] });
}

export function addedToQueue(channel, track, position) {
    const embed = new EmbedBuilder()
        .setColor(musicConfig.embedColor)
        .setDescription(`${emojis.success} Added to queue: [${track.info.title}](${track.info.uri})`);

    if (track.info.thumbnail && typeof track.info.thumbnail === 'string')
        embed.setThumbnail(track.info.thumbnail);

    embed.addFields(
        { name: 'Artist',   value: `${emojis.info}  ${track.info.author}`, inline: true },
        { name: 'Duration', value: `${emojis.time}  ${getDuration(track)}`, inline: true },
        { name: 'Position', value: `${emojis.queue} #${position}`,          inline: true },
    );
    return channel.send({ embeds: [embed] });
}

export function addedPlaylist(channel, playlistInfo, tracks) {
    const totalMs = tracks.reduce((a, t) =>
        (!t.info.isStream && t.info.duration) ? a + t.info.duration : a, 0);
    const streamCount = tracks.filter(t => t.info.isStream).length;

    const embed = new EmbedBuilder()
        .setColor(musicConfig.embedColor)
        .setTitle(`${emojis.success} Added Playlist`)
        .setDescription(`**${playlistInfo.name}**`);

    if (playlistInfo.thumbnail && typeof playlistInfo.thumbnail === 'string')
        embed.setThumbnail(playlistInfo.thumbnail);

    embed.addFields(
        { name: 'Total Tracks',  value: `${emojis.queue} ${tracks.length} tracks`,      inline: true },
        { name: 'Total Duration',value: `${emojis.time}  ${formatDuration(totalMs)}`,    inline: true },
        { name: 'Live Streams',  value: `${emojis.info}  ${streamCount}`,                inline: true },
    ).setFooter({ text: 'The playlist will start playing soon' });

    return channel.send({ embeds: [embed] });
}

export function queueEnded(channel) {
    return channel.send(`${emojis.info} | Queue ended. Leaving the voice channel.`);
}

export function queueList(channel, queue, currentTrack) {
    const embed = new EmbedBuilder()
        .setColor(musicConfig.embedColor)
        .setTitle(`${emojis.queue} Queue`);

    if (currentTrack) {
        embed.setDescription(
            `**Now Playing:**\n${emojis.play} [${currentTrack.info.title}](${currentTrack.info.uri}) — ${getDuration(currentTrack)}\n\n**Up Next:**`
        );
        if (currentTrack.info.thumbnail && typeof currentTrack.info.thumbnail === 'string')
            embed.setThumbnail(currentTrack.info.thumbnail);
    } else {
        embed.setDescription('**Queue:**');
    }

    if (queue.length) {
        const lines = queue.map((t, i) =>
            `\`${String(i + 1).padStart(2, '0')}\` ${emojis.song} [${t.info.title}](${t.info.uri}) — ${getDuration(t)}`
        ).join('\n');
        embed.addFields({ name: '\u200b', value: lines.slice(0, 1024) });

        const totalMs = queue.reduce((a, t) =>
            (!t.info.isStream && t.info.duration) ? a + t.info.duration : a, 0);
        const streams = queue.filter(t => t.info.isStream).length;
        embed.setFooter({ text: `${queue.length} track(s) • ${formatDuration(totalMs)}${streams ? ` • ${streams} stream(s)` : ''}` });
    } else {
        embed.addFields({ name: '\u200b', value: 'No tracks in queue.' });
    }

    return channel.send({ embeds: [embed] });
}

export function playerStatus(channel, player) {
    const embed = new EmbedBuilder()
        .setColor(musicConfig.embedColor)
        .setTitle(`${emojis.info} Player Status`)
        .addFields(
            { name: 'Status',    value: player.playing ? `${emojis.play} Playing` : `${emojis.pause} Paused`, inline: true },
            { name: 'Volume',    value: `${emojis.volume} ${player.volume}%`,                                   inline: true },
            { name: 'Loop',      value: `${emojis.repeat} ${player.loop === 'queue' ? 'Queue' : 'Off'}`,        inline: true },
        );

    if (player.queue.current) {
        const t = player.queue.current;
        embed.setDescription(
            `**Now Playing:**\n${emojis.music} [${t.info.title}](${t.info.uri})\n${emojis.time} ${getDuration(t)}`
        );
        if (t.info.thumbnail && typeof t.info.thumbnail === 'string')
            embed.setThumbnail(t.info.thumbnail);
    }

    return channel.send({ embeds: [embed] });
}
