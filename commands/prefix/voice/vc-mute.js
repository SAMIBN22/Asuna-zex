import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { EmbedBuilder, PermissionsBitField, PermissionFlagsBits } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOMS_FILE = path.join(__dirname, '../../db/privateVoiceRooms.json');

function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    } catch (e) { console.error('Error loading voice rooms:', e); }
    return {};
}

function parseTime(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[unit];
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s} second(s)`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute(s)`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour(s)`;
    return `${Math.floor(h / 24)} day(s)`;
}

export default {
    name: 'vc-mute',
    aliases: ['vcmute', 'mutevc'],
    description: 'Mute a member in your private voice room',
    usage: '-vc-mute <person name> <person ID> [time: 10s/5m/1h/2d]',
    category: 'Private Voice',

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply(
                '**Usage:** `-vc-mute <person name> <person ID> [time]`\n\n' +
                '**Examples:**\n' +
                '`-vc-mute Ahmed 123456789012345678` — permanent mute\n' +
                '`-vc-mute Ahmed 123456789012345678 10m` — mute for 10 minutes\n\n' +
                '**Time formats:** `10s` `5m` `1h` `2d`'
            );
        }

        const isAdmin = message.author.id === message.guild.ownerId ||
                        message.member.permissions.has(PermissionFlagsBits.Administrator);

        let timeMs = null;
        let userId;
        let personName;

        const lastArg = args[args.length - 1];
        const secondLastArg = args[args.length - 2];

        if (parseTime(lastArg) !== null && /^\d{17,19}$/.test(secondLastArg)) {
            timeMs = parseTime(lastArg);
            userId = secondLastArg;
            personName = args.slice(0, args.length - 2).join(' ') || 'Unknown';
        } else if (/^\d{17,19}$/.test(lastArg)) {
            userId = lastArg;
            personName = args.slice(0, args.length - 1).join(' ') || 'Unknown';
        } else {
            return message.reply(
                ' Could not find a valid Discord ID.\n' +
                '**Usage:** `-vc-mute <person name> <person ID> [time]`'
            );
        }

        const rooms = loadRooms();
        let userVoiceRoom = null;

        for (const [channelId, room] of Object.entries(rooms)) {
            if (room.guildId !== message.guild.id) continue;
            if (room.ownerId === message.author.id) {
                userVoiceRoom = { channelId, ...room };
                break;
            }
            if (isAdmin && !userVoiceRoom) {
                userVoiceRoom = { channelId, ...room };
            }
        }

        if (!userVoiceRoom) {
            return message.reply(' No private voice room found!');
        }

        const voiceChannel = message.guild.channels.cache.get(userVoiceRoom.channelId);
        if (!voiceChannel) {
            return message.reply(' Voice channel not found! It may have been deleted.');
        }

        try {
            const targetMember = await resolveMember(message, userId);
            if (!targetMember) {
                return message.reply(' User not found in this server! Please check the ID.');
            }

            await voiceChannel.permissionOverwrites.edit(targetMember.id, {
                [PermissionsBitField.Flags.Speak]: false,
                [PermissionsBitField.Flags.Stream]: false
            });

            if (targetMember.voice.channelId === voiceChannel.id) {
                await targetMember.voice.setMute(true).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setTitle(' Member Muted')
                .setDescription(`**${personName}** has been muted in the voice room.`)
                .addFields(
                    { name: ' Member', value: `<@${targetMember.id}>`, inline: true },
                    { name: ' Duration', value: timeMs ? formatTime(timeMs) : '**Permanent**', inline: true },
                    { name: ' Room', value: `<#${voiceChannel.id}>`, inline: true }
                )
                .setColor('#ED4245')
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            if (timeMs) {
                setTimeout(async () => {
                    try {
                        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
                            [PermissionsBitField.Flags.Speak]: null,
                            [PermissionsBitField.Flags.Stream]: null
                        });
                        const freshMember = await resolveMember(message, userId);
                        if (freshMember && freshMember.voice.serverMute) {
                            await freshMember.voice.setMute(false).catch(() => {});
                        }
                        await message.channel.send(
                            ` **${personName}** (<@${userId}>) has been automatically unmuted after ${formatTime(timeMs)}.`
                        ).catch(() => {});
                    } catch (e) {
                        console.error('Auto-unmute error:', e);
                    }
                }, timeMs);
            }

        } catch (error) {
            console.error('Error muting member:', error);
            await message.reply(' Error muting member. Please check bot permissions (Manage Channels + Mute Members).');
        }
    }
};
