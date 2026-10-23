import { resolveMember } from '../../../lib/resolveUser.js';
import { resolveUser } from '../../../lib/resolveUser.js';
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOMS_FILE = path.join(__dirname, '../../db/privateVoiceRooms.json');

function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading voice rooms:', error);
    }
    return {};
}

export default {
    name: 'vc-remove',
    aliases: ['vcremove', 'removevc', 'voiceremove'],
    description: 'Remove a member from your private voice room',
    usage: '-vc-remove @user',
    category: 'Private Voice',

    async execute(message, args) {
        const targetUser = await resolveUser(message, args[0], client);
        
        if (!targetUser) {
            return message.reply('**Usage:** `+vc-remove @user`');
        }

        const rooms = loadRooms();
        let userVoiceRoom = null;

        for (const [channelId, room] of Object.entries(rooms)) {
            if (room.ownerId === message.author.id) {
                userVoiceRoom = { channelId, ...room };
                break;
            }
        }

        if (!userVoiceRoom) {
            return message.reply('You do not own any voice room!');
        }

        try {
            const targetMember = await resolveMember(message, targetUser.id);
            const role = message.guild.roles.cache.get(userVoiceRoom.roleId);
            const voiceChannel = message.guild.channels.cache.get(userVoiceRoom.channelId);
            
            if (role) {
                await targetMember.roles.remove(role);
            }

            if (voiceChannel && targetMember.voice.channelId === userVoiceRoom.channelId) {
                await targetMember.voice.disconnect();
            }

            await message.reply(`Removed <@${targetUser.id}> from your voice room!`);
        } catch (error) {
            console.error('Error removing member:', error);
            await message.reply('Error removing member from voice room.');
        }
    }
};
