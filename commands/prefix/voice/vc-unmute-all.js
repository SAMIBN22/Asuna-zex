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
    name: 'vc-unmute-all',
    aliases: ['vcunmuteall', 'unmuteallvc'],
    description: 'Unmute all members in your private voice room',
    usage: '-vc-unmute-all',
    category: 'Private Voice',

    async execute(message, args) {
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
            const voiceChannel = message.guild.channels.cache.get(userVoiceRoom.channelId);
            if (voiceChannel) {
                for (const [memberId, vcMember] of voiceChannel.members) {
                    await vcMember.voice.setMute(false);
                }
            }
            await message.reply('All members in your voice room have been unmuted!');
        } catch (error) {
            console.error('Error unmuting all:', error);
            await message.reply('Error unmuting members.');
        }
    }
};
