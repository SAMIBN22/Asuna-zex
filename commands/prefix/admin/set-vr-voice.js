import { PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VR_VOICE_PATH = path.join(__dirname, '../../db/vr-voice.json');

export default {
  name: 'set-vr-voice',
  aliases: ['-set-vr-voice'],
  description: 'Create a click2Verify voice channel for verification system (Admin only)',
  usage: '-set-vr-voice',
  cooldown: 10,
  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ content: ' Only admins can use this command.' });
    }
    const guild = message.guild;
    // Check if channel already exists
    let click2Verify = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildVoice && ch.name.toLowerCase() === 'click2verify'
    );
    if (!click2Verify) {
      click2Verify = await guild.channels.create({
        name: 'click2Verify',
        type: ChannelType.GuildVoice,
        userLimit: 1,
        permissionOverwrites: [
          { id: guild.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] }
        ]
      });
    }
    // Save channel ID for later use
    fs.writeFileSync(VR_VOICE_PATH, JSON.stringify({ guildId: guild.id, channelId: click2Verify.id }));
    return message.reply({ embeds: [
      new EmbedBuilder()
        .setColor('#FFFFFF')
        .setTitle('click2Verify Channel Ready')
        .setDescription(`Voice channel <#${click2Verify.id}> is set for verification system!`)
    ] });
  }
}; 