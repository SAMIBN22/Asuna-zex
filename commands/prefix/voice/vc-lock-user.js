import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { PermissionFlagsBits } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'vc-lock-user',
  description: 'Lock/Kick a specific user from your room.',
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
        return message.reply('Only the room owner can use this command in their own room!');
    }

    const target = await resolveMember(message, args[0]);
    if (!target) return message.reply('Please mention a user to lock out.');

    try {
      // Add to locked users list
      if (!roomInfo.lockedUsers) roomInfo.lockedUsers = [];
      if (!roomInfo.lockedUsers.includes(target.id)) {
          roomInfo.lockedUsers.push(target.id);
      }
      
      // Remove from allowed users if they were allowed
      if (roomInfo.allowedUsers) {
          roomInfo.allowedUsers = roomInfo.allowedUsers.filter(id => id !== target.id);
      }

      fs.writeFileSync(roomsPath, JSON.stringify(rooms, null, 2));

      // 1. Remove the room role
      if (roomInfo.roleId) {
        await target.roles.remove(roomInfo.roleId).catch(() => {});
      }

      // 2. Lock permissions
      await voiceChannel.permissionOverwrites.edit(target, {
        Connect: false,
        ViewChannel: false
      });

      // 3. Kick if in channel
      if (target.voice.channelId === voiceChannel.id) {
        await target.voice.disconnect();
      }

      message.channel.send(` Locked ${target.user.username} from the room.`);
    } catch (error) {
      console.error(error);
      message.reply('Failed to execute lock command.');
    }
  }
};
