import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags
} from 'discord.js';

import GuildSetup from "../../../models/clanGuildSetup.js"; 
import ClanConfig from "../../../models/clanConfig.js";
import config from "../../../config/clanConfig.js"; 

export default {
  name: 'editroleicon',
  category: 'Clan',
  description: 'Edit clan role icon (Managers only)',
  cooldown: 5,
  async execute(message, args, client) {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

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

    const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *Server is not setup yet*\n> ${theme.dot} *Please run \`${config.prefix}setup\` first*`);
    }

    const managerRoleId = guildSetup.roles?.manager;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isManager = managerRoleId && member.roles.cache.has(managerRoleId);
    if (!isAdmin && !isManager) {
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can edit role icons*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Edit Role Icon`, `> ${theme.dot} *Please provide clan identifier and icon*\n> ${theme.dot} *Usage: \`${config.prefix}editroleicon <clanName|clanID> <iconURL|emoji>\`*`);
    }

    const clanIdentifier = args[0];
    const iconValue = args[1];

    if (!iconValue.startsWith('http') && !iconValue.match(/^<a?:.+:\d+>$/)) {
      return replyWithContainer(`${theme.clouds} Edit Role Icon`, `> ${theme.dot} *Please provide a valid emoji or image URL*\n> ${theme.dot} *Usage: \`${config.prefix}editroleicon <clanName|clanID> :emoji:\` or \`${config.prefix}editroleicon <clanName|clanID> https://...\`*`);
    }

    let clan = await ClanConfig.findOne({ guildId: guild.id, name: clanIdentifier });
    if (!clan) {
      clan = await ClanConfig.findOne({ guildId: guild.id, clanId: clanIdentifier });
    }

    if (!clan) {
      const allClans = await ClanConfig.find({ guildId: guild.id });
      const clanList = allClans.map(c => `Name: ${c.name}, ID: ${c.clanId}`).join('\n');
      return replyWithContainer(`${theme.clouds} Edit Role Icon`, `> ${theme.no} *Clan not found*
> ${theme.dot} *Please check the clan name or ID*

**Available clans:**
${clanList}`);
    }

    const role = guild.roles.cache.get(clan.roleId);
    if (!role) {
      return replyWithContainer(`${theme.clouds} Edit Role Icon`, `> ${theme.no} *Clan role not found*\n> ${theme.dot} *The role may have been deleted*`);
    }

    await role.setIcon(iconValue);

    return replyWithContainer(`${theme.clouds} Edit Role Icon`, `> ${theme.yes} *Clan **${clan.name}** role icon updated successfully*\n> ${theme.dot} *The role now has a new icon*`);
  }
};
