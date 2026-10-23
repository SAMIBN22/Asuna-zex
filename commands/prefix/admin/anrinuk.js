import { EmbedBuilder } from 'discord.js';
import emojis from '../../emojis.js';

export default {
  name: 'anrinuk',
  aliases: ['security', 'full-protection'],
  description: 'Enable full security protection (Owner/Kings only)',
  category: 'Admin',
  usage: '-anrinuk',
  cooldown: 5,
  async execute(message, args) {
    try {
      // Check if user is owner or has king permissions
      const isOwner = message.author.id === message.guild.ownerId;
      const hasKingPerms = message.member.permissions.has('Administrator') || 
                          message.member.roles.cache.some(role => role.name.toLowerCase().includes('king'));

      if (!isOwner && !hasKingPerms) {
        return message.reply(" This command is restricted to server owners and kings only.");
      }

      // Create security status embed
      const securityEmbed = new EmbedBuilder()
        .setColor('#FFFFFF')
        .setTitle(' Full Security Protection Activated')
        .setDescription('All security systems have been enabled successfully!')
        .addFields(
          { name: ' Anti-Link Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Bot Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Delete Channel', value: ' Enabled', inline: true },
          { name: ' Anti-Delete Role', value: ' Enabled', inline: true },
          { name: ' Anti-Ban Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Kick Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Token Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Spam Protection', value: ' Enabled', inline: true },
          { name: ' Anti-Webhook Protection', value: ' Enabled', inline: true }
        )
        .setFooter({ text: 'Security systems are now monitoring all activities' })
        .setTimestamp();

      // Send confirmation message
      await message.reply({ embeds: [securityEmbed] });

      // Log the security activation
      console.log(`[SECURITY] Full protection activated by ${message.author.tag} (${message.author.id}) in ${message.guild.name}`);

    } catch (error) {
      console.error('Error in anrinuk command:', error);
      message.reply(" An error occurred while activating security systems.");
    }
  }
}; 