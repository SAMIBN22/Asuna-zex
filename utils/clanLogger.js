import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags 
} from 'discord.js';

class Logger {
  constructor(client) {
    this.client = client;
    this.theme = client.clanThemes?.emojis?.main || {};
  }

  async logToChannel(channelId, title, content, type = 'info') {
    if (!channelId) return;
    
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;

    const emoji = this.getTypeEmoji(type);
    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# __${emoji} ${title}__\n\n${content}`
        )
      );

    await channel.send({ 
      components: [container], 
      flags: MessageFlags.IsComponentsV2 
    });
  }

  async logClanAction(guildId, action, details) {
    const GuildSetup = (await import('../models/clanGuildSetup.js')).default;
    const guildConfig = await GuildSetup.findOne({ guildId });
    if (!guildConfig?.logChannelId) return;

    const content = Object.entries(details)
      .map(([key, value]) => `> ${this.theme.dot} **${key}:** ${value}`)
      .join('\n');

    await this.logToChannel(
      guildConfig.logChannelId,
      `${action} Logs`,
      content,
      'info'
    );
  }

  async logNicknameChange(guildId, member, targetMember, oldNick, newNick) {
    await this.logClanAction(guildId, 'Nickname Change', {
      'Action By': `${member} (\`${member.id}\`)`,
      'Member': `${targetMember} (\`${targetMember.id}\`)`,
      'Old Nickname': oldNick,
      'New Nickname': newNick,
      'Time': `<t:${Math.floor(Date.now() / 1000)}:F>`
    });
  }

  async logMemberAdded(guildId, member, targetMember, clanName) {
    await this.logClanAction(guildId, 'Member Added', {
      'Action By': `${member} (\`${member.id}\`)`,
      'Member Added': `${targetMember} (\`${targetMember.id}\`)`,
      'Clan': clanName,
      'Time': `<t:${Math.floor(Date.now() / 1000)}:F>`
    });
  }

  async logMemberRemoved(guildId, member, targetMember, clanName) {
    await this.logClanAction(guildId, 'Member Removed', {
      'Action By': `${member} (\`${member.id}\`)`,
      'Member Removed': `${targetMember} (\`${targetMember.id}\`)`,
      'Clan': clanName,
      'Time': `<t:${Math.floor(Date.now() / 1000)}:F>`
    });
  }

  getTypeEmoji(type) {
    return this.theme.title;
  }

  async sendToLogChannel(client, title, content) {
    try {
      console.log(`[GUILD LOG] ${title}: ${content}`);
    } catch (err) {
      console.error('Failed to send to log channel:', err);
    }
  }
}

export default Logger;

export const sendToLogChannel = async (client, title, content) => {
  const logger = new Logger(client);
  return await logger.sendToLogChannel(client, title, content);
};