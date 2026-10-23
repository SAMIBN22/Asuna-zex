import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

export default {
  name: 'clanjoin',
  description: 'Make the bot join a voice channel',
  category: 'Clan',
  usage: 'join',
  cooldown: 5,
  permissions: [PermissionFlagsBits.Administrator],
  
  async execute(message, args) {
    try {
      const member = message.member;
      if (!member.voice.channel) {
        return this._sendErrorComponent(
          message,
          'You must be in a voice channel to use this command.',
          message.client.clanThemes
        );
      }

      const voiceChannel = member.voice.channel;

      if (voiceChannel.members.has(message.client.user.id)) {
        return this._sendErrorComponent(
          message,
          'I am already in that voice channel!',
          message.client.clanThemes
        );
      }

      if (!voiceChannel.permissionsFor(message.client.user).has(['Connect', 'Speak'])) {
        return this._sendErrorComponent(
          message,
          'I don\'t have permission to join that voice channel.',
          message.client.clanThemes
        );
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      connection.on('disconnected', () => {
        setTimeout(() => {
          joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
          });
        }, 1000);
      });

      const theme = message.client.clanThemes?.emojis || {};
      const images = message.client.clanThemes?.images || {};
      
      const content = 
        `# ${theme.clouds || ''} Bot Voice Channel\n\n` +
        `> ${theme.dot || '•'} **Channel:** \`${voiceChannel.name}\`\n` +
        `> ${theme.dot || '•'} **Status:** \`24/7 Active\`\n` +
        `> ${theme.dot || '•'} **Guild:** \`${message.guild.name}\`\n\n` +
        `*${theme.heart || ''} I will stay here forever and never leave*`;

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false }
      });

    } catch (error) {
      console.error('Error in join command:', error);
      await this._sendErrorComponent(
        message,
        'Failed to join voice channel. Please try again.',
        message.client.clanThemes
      );
    }
  },

  async _sendErrorComponent(messageOrInteraction, errorContent, themes) {
    const theme = themes?.emojis || {};
    
    const content = 
      `# ${theme.clouds || ''} Bot Error\n\n` +
      `**${theme.no || ''} ${errorContent}**\n\n` +
      `*${theme.heart || ''} I'm sorry about this!*`;

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      );

    await messageOrInteraction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });
  }
};
