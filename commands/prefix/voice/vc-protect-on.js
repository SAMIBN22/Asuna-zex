import { PermissionFlagsBits } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'vc-protect-on',
  description: 'Enable auto-kick protection for your room (kicks anyone who joins).',
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

    roomInfo.protect = true;
    fs.writeFileSync(roomsPath, JSON.stringify(rooms, null, 2));

    // Kick anyone currently in the channel who isn't the owner or staff
    voiceChannel.members.forEach(member => {
        if (member.id !== message.author.id && !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            member.voice.disconnect().catch(() => {});
        }
    });

    message.channel.send(' Auto-kick protection enabled. Anyone who joins will be kicked automatically.');
  }
};
