import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { PermissionFlagsBits } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'vc-unlock-user',
  description: 'Unlock your voice room for a specific user and allow them in even if protection is on.',
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
    if (!target) return message.reply('Please mention a user to unlock.');

    try {
      // Initialize allowed users list if it doesn't exist
      if (!roomInfo.allowedUsers) roomInfo.allowedUsers = [];
      
      // Add user to allowed list if not already there
      if (!roomInfo.allowedUsers.includes(target.id)) {
          roomInfo.allowedUsers.push(target.id);
      }
      
      // Remove from locked users if they were locked
      if (roomInfo.lockedUsers) {
          roomInfo.lockedUsers = roomInfo.lockedUsers.filter(id => id !== target.id);
      }

      fs.writeFileSync(roomsPath, JSON.stringify(rooms, null, 2));

      // 1. Restore the room role
      if (roomInfo.roleId) {
        await target.roles.add(roomInfo.roleId).catch(() => {});
      }

      // 2. Grant permissions
      await voiceChannel.permissionOverwrites.edit(target, {
        Connect: true,
        ViewChannel: true,
        Speak: true
      });
      
      const textChannel = message.guild.channels.cache.find(c => c.name === voiceChannel.name && c.type === 0);
      if (textChannel) {
        await textChannel.permissionOverwrites.edit(target, {
          ViewChannel: true,
          SendMessages: true
        });
      }

      message.channel.send(` Unlocked ${target.user.username}. They can now join even if protection is ON.`);
    } catch (error) {
      console.error(error);
      message.reply('Failed to unlock the user.');
    }
  }
};
