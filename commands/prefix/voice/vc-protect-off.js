import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'vc-protect-off',
  description: 'Disable auto-kick protection for your room.',
  async execute(message, args) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('You must be in a voice channel!');

    let rooms = {};
    const roomsPath = path.join(__dirname, '../../db/privateVoiceRooms.json');
    if (fs.existsSync(roomsPath)) {
        rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
    }
    
    const roomInfo = rooms[voiceChannel.id];
    if (!roomInfo || roomInfo.ownerId !== message.author.id) {
        return message.reply('Only the room owner can use this command!');
    }

    roomInfo.protect = false;
    fs.writeFileSync(roomsPath, JSON.stringify(rooms, null, 2));

    message.channel.send(' Auto-kick protection disabled. Users can now join normally.');
  }
};
