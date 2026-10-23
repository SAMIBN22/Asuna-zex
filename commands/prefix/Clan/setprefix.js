import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags
} from 'discord.js';

import GuildSetup from '../../../models/clanGuildSetup.js';
import config from '../../../config/clanConfig.js';

export default {
  name: 'setprefix',
  category: 'Clan',
  description: 'Set bot prefix for this server',
  cooldown: 5,
  permissions: ['Administrator'],
  async execute(message, args, client) {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};

    const userThumbnail = new ThumbnailBuilder()
      .setURL(member.user.displayAvatarURL({ extension: "png", size: 512 }))
      .setDescription(`${member.user.username}'s Avatar`);

    const buildContainer = (header, content) => {
      return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
            )
            .setThumbnailAccessory(userThumbnail)
        );
    };

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You need administrator permissions to use this command*`);
    }

    if (!args[0]) {
      return replyWithContainer(`${theme.clouds} Set Prefix`, `> ${theme.dot} *Please provide a new prefix*\n> ${theme.dot} *Usage: \`& setprefix [new_prefix]\`*`);
    }

    const newPrefix = args[0];
    
    if (newPrefix.length > 5) {
      return replyWithContainer(`${theme.clouds} Set Prefix`, `> ${theme.no} *Prefix must be 5 characters or less*\n> ${theme.dot} *Please provide a shorter prefix*`);
    }

    let guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      guildSetup = new GuildSetup({
        guildId: guild.id,
        prefix: newPrefix,
        roles: {},
        categories: {},
        channels: {}
      });
    } else {
      guildSetup.prefix = newPrefix;
    }
    
    await guildSetup.save();
    return replyWithContainer(`${theme.clouds} Set Prefix`, `> ${theme.yes} *Prefix updated to \`${newPrefix}\`*\n> ${theme.dot} *Bot commands now use this prefix*`);
  }
};
