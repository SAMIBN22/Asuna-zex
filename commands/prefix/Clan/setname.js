import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
  SeparatorBuilder
} from 'discord.js';

export default {
  name: 'setname',
  category: 'Clan',
  aliases: [ 'setusername', 'botname'],
  description: 'Set bot username',
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
            `> ${theme.arrow} *you need Administrator permission to change the bot name*`
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

    if (!args.length) {
      return replyWithContainer(
        `# __${theme.clouds} Name Setup__\n> ${theme.dot} *I need a new username*`,
        `## ${theme.star} **__Current Username:__**\n` +
        `> ${theme.arrow} **${client.user.username}**\n\n` +
        `## ${theme.star} **__How to use:__**\n` +
        `> ${theme.arrow} \`setname <new_username>\`\n\n` +
        `## ${theme.star} **__Requirements:__**\n` +
        `> ${theme.arrow} 2-32 characters long\n` +
        `> ${theme.arrow} No special characters except spaces and hyphens\n` +
        `> ${theme.arrow} Must be unique across Discord`
      );
    }

    const newUsername = args.join(' ').trim();
    
    if (newUsername.length < 2 || newUsername.length > 32) {
      return replyWithContainer(
        `# __${theme.clouds} Invalid Username__\n> ${theme.no} *Username length error*`,
        `> ${theme.arrow} *Username must be between 2-32 characters*\n` +
        `> ${theme.arrow} *Current length: ${newUsername.length} characters*`
      );
    }

    if (newUsername === client.user.username) {
      return replyWithContainer(
        `# __${theme.clouds} Same Username__\n> ${theme.info} *No change needed*`,
        `> ${theme.arrow} *The username is already set to "${newUsername}"*`
      );
    }

    const oldUsername = client.user.username;
    await client.user.setUsername(newUsername);
    
    return replyWithContainer(
      `# __${theme.clouds} Username Updated__\n> ${theme.yes} *Username changed successfully*`,
      `> ${theme.arrow} *Old username: ${oldUsername}*\n` +
      `> ${theme.arrow} *New username: ${newUsername}*\n` +
      `> ${theme.arrow} *It may take a few minutes to update everywhere*`
    );
  }
};
