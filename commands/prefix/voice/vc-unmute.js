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

export default {
    name: 'vc-unmute',
    aliases: ['vcunmute', 'unmutevc'],
    description: 'Unmute a member in your private voice room',
    usage: '-vc-unmute <person name> <person ID>',
    category: 'Private Voice',

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply(
                '**Usage:** `-vc-unmute <person name> <person ID>`\n\n' +
                '**Example:** `-vc-unmute Ahmed 123456789012345678`'
            );
        }

        const isAdmin = message.author.id === message.guild.ownerId ||
                        message.member.permissions.has(PermissionFlagsBits.Administrator);

        const userId = args[args.length - 1].replace(/[<@!>]/g, '');
        const personName = args.slice(0, args.length - 1).join(' ') || 'Unknown';

        if (!/^\d{17,19}$/.test(userId)) {
            return message.reply(
                ' Invalid Discord ID!\n' +
                '**Usage:** `-vc-unmute <person name> <person ID>`'
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
            const targetMember = await message.guild.members.fetch(userId).catch(() => null);
            if (!targetMember) {
                return message.reply(' User not found in this server! Please check the ID.');
            }

            await voiceChannel.permissionOverwrites.edit(targetMember.id, {
                [PermissionsBitField.Flags.Speak]: null,
                [PermissionsBitField.Flags.Stream]: null
            });

            if (targetMember.voice.serverMute) {
                await targetMember.voice.setMute(false).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setTitle(' Member Unmuted')
                .setDescription(`**${personName}** has been unmuted in the voice room.`)
                .addFields(
                    { name: ' Member', value: `<@${targetMember.id}>`, inline: true },
                    { name: ' Room', value: `<#${voiceChannel.id}>`, inline: true }
                )
                .setColor('#57F287')
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error unmuting member:', error);
            await message.reply(' Error unmuting member. Please check bot permissions.');
        }
    }
};
