import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags,
  PermissionsBitField
} from 'discord.js'

export default {
    name: 'unhide',
    description: 'Unhide a channel and make it visible to non-administrative members.',
    async execute(message, args) {
        // Check if the command executor has the required permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const permissionContainer = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`#  Permission Required\nYou need the \`Manage Channels\` permission to use this command.\n\n**${message.guild.name}**`)
                );
            
            return message.reply({ 
                components: [permissionContainer], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        }

        // Check if the bot has the required permissions
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const botPermissionContainer = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`#  Bot Permission Required\nI need the \`Manage Channels\` permission to perform this action.\n\n**${message.guild.name}**`)
                );
            
            return message.reply({ 
                components: [botPermissionContainer], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        }

        // Get the channel mentioned or use the current channel if none is mentioned
        const channel = message.mentions.channels.first() || message.channel;

        try {
            // Update channel permissions to unhide it
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: true // Allow the ViewChannel permission
            });

            // Send simple confirmation container
            const unhideContainer = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`# ${channel.name} has been unhidden\n\n**${message.guild.name}**`)
                );

            return message.reply({ 
                components: [unhideContainer], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        } catch (error) {
            console.error('Error unhiding channel:', error);

            // Handle unexpected errors
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`#  Error\nAn error occurred while trying to unhide the channel. Please try again later.\n\n**${message.guild.name}**`)
                );
            
            return message.reply({ 
                components: [errorContainer], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        }
    }
};