import { MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js'

// Only this user can execute the command
const OWNER_ID = '685448398077165578';

export default {
  name: 'spam-all',
  description: 'Spam all members in a server (owner only)',
  aliases: ['spamall'],
  async execute(message, args) {
    // Check if the user is authorized
    if (message.author.id !== OWNER_ID) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## Unauthorized\nOnly the bot owner can use this command.')
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    // Check if we have enough arguments
    if (args.length < 2) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## Usage\n`+spam-all <server_id> <message>`\n\nPlease provide a server ID and a message to send.')
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const guildId = args[0];
    const spamMessage = args.slice(1).join(' ');

    // Get the guild
    const guild = message.client.guilds.cache.get(guildId);
    if (!guild) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Error\nGuild with ID \`${guildId}\` not found or I'm not in that server.`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    try {
      // Fetch all members (this might take a while for large servers)
      await guild.members.fetch();
      
      let successCount = 0;
      let failCount = 0;
      
      // Send message to each member
      for (const [memberId, member] of guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;
        
        try {
          await member.send(spamMessage);
          successCount++;
        } catch (err) {
          failCount++;
          // Continue with next member even if one fails
        }
      }
      
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Spam Complete\nSuccessfully sent message to ${successCount} members.\nFailed to send to ${failCount} members (they might have DMs disabled).`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2]
      });
      
    } catch (error) {
      console.error('Error in spam-all command:', error);
      
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## Error\nAn error occurred while trying to spam members. Check console for details.')
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};