import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
  ActivityType,
  SeparatorBuilder
} from 'discord.js';

export default {
  name: 'clansetstatus',
  category: 'Clan',
  aliases: ['status', 'setactivity', 'botstatus'],
  description: 'Set bot status and activity',
  cooldown: 10,
  permissions: ['Administrator'],
  async execute(message, args, client) {
    const { member } = message;
    const theme = client.clanThemes?.emojis?.main || {};

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# __${theme.clouds} Access Denied__\n\n` +
            `${theme.clouds} Hey… looks like you can't do this just yet\n` +
            `> ${theme.arrow} *you need Administrator permission to change the bot status*`
          )
        );

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false }
      });
    }

    const botThumbnail = new ThumbnailBuilder()
      .setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
      .setDescription(`${client.user.username}'s Avatar`);

    const buildContainer = (header, content) => {
      return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${header}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`${content}`)
            )
            .setThumbnailAccessory(botThumbnail)
        );
    };

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    if (!args[0]) {
      return replyWithContainer(
        `# __${theme.clouds} Status Setup__\n> ${theme.dot} *I need status information*`,
        `## ${theme.star} **__Usage:__**\n` +
        `> ${theme.arrow} \`setstatus [online|idle|dnd|invisible]\`\n` +
        `> ${theme.arrow} \`setstatus [status] [playing|watching|listening|streaming] [text]\``
      );
    }

    const statusType = args[0].toLowerCase();
    const activityType = args[1]?.toLowerCase();
    const activityText = args.slice(2).join(' ');

    const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
    const validActivities = ['playing', 'watching', 'listening', 'streaming'];

    if (!validStatuses.includes(statusType)) {
      return replyWithContainer(
        `# __${theme.clouds} Invalid Status__\n> ${theme.no} *Invalid status type*`,
        `> ${theme.arrow} *Valid statuses: ${validStatuses.join(', ')}*\n` +
        `> ${theme.arrow} *You provided: ${statusType}*`
      );
    }

    if (activityType && !validActivities.includes(activityType)) {
      return replyWithContainer(
        `# __${theme.clouds} Invalid Activity__\n> ${theme.no} *Invalid activity type*`,
        `> ${theme.arrow} *Valid activities: ${validActivities.join(', ')}*\n` +
        `> ${theme.arrow} *You provided: ${activityType}*`
      );
    }

    const statusMap = {
      'online': 'online',
      'idle': 'idle', 
      'dnd': 'dnd',
      'invisible': 'invisible'
    };

    const activityMap = {
      'playing': ActivityType.Playing,
      'watching': ActivityType.Watching,
      'listening': ActivityType.Listening,
      'streaming': ActivityType.Streaming
    };

    if (activityType && activityText) {
      await client.user.setPresence({
        status: statusMap[statusType],
        activities: [{
          name: activityText,
          type: activityMap[activityType]
        }]
      });
      return replyWithContainer(
        `# __${theme.clouds} Status Updated__\n> ${theme.yes} *Status updated successfully*`,
        `> ${theme.arrow} *Status: ${statusType}*\n` +
        `> ${theme.arrow} *Activity: ${activityType} ${activityText}*\n` +
        `> ${theme.arrow} *It may take a few minutes to update everywhere*`
      );
    } else {
      await client.user.setPresence({
        status: statusMap[statusType]
      });
      return replyWithContainer(
        `# __${theme.clouds} Status Updated__\n> ${theme.yes} *Status updated successfully*`,
        `> ${theme.arrow} *Status: ${statusType}*\n` +
        `> ${theme.arrow} *It may take a few minutes to update everywhere*`
      );
    }
  }
};