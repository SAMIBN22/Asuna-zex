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
    name: 'vc-mute-all',
    aliases: ['vcmuteall', 'muteallvc'],
    description: 'Mute all members in your private voice room',
    usage: '-vc-mute-all',
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
                    if (memberId !== message.author.id) {
                        await vcMember.voice.setMute(true);
                    }
                }
            }
            await message.reply('All members in your voice room have been muted!');
        } catch (error) {
            console.error('Error muting all:', error);
            await message.reply('Error muting members.');
        }
    }
};
