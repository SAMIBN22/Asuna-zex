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
  name: 'editrolename',
  category: 'Clan',
  description: 'Edit clan role name (Managers only)',
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
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can edit role names*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Edit Role Name`, `> ${theme.dot} *Please provide clan identifier and new role name*\n> ${theme.dot} *Usage: \`${config.prefix}editrolename <clanName|clanID> <newRoleName>\`*`);
    }

    const clanIdentifier = args[0];
    const newRoleName = args.slice(1).join(' ').trim();

    if (newRoleName.length > 100) {
      return replyWithContainer(`${theme.clouds} Edit Role Name`, `> ${theme.dot} *Role name must be 100 characters or less*\n> ${theme.dot} *Please provide a shorter name*`);
    }

    let clan = await ClanConfig.findOne({ guildId: guild.id, name: clanIdentifier });
    if (!clan) {
      clan = await ClanConfig.findOne({ guildId: guild.id, clanId: clanIdentifier });
    }

    if (!clan) {
      const allClans = await ClanConfig.find({ guildId: guild.id });
      const clanList = allClans.map(c => `Name: ${c.name}, ID: ${c.clanId}`).join('\n');
      return replyWithContainer(`${theme.clouds} Edit Role Name`, `> ${theme.no} *Clan not found*
> ${theme.dot} *Please check the clan name or ID*

**Available clans:**
${clanList}`);
    }

    const role = guild.roles.cache.get(clan.roleId);
    if (!role) {
      return replyWithContainer(`${theme.clouds} Edit Role Name`, `> ${theme.no} *Clan role not found*\n> ${theme.dot} *The role may have been deleted*`);
    }

    const oldRoleName = role.name;
    await role.setName(newRoleName);

    return replyWithContainer(`${theme.clouds} Edit Role Name`, `> ${theme.yes} *Clan **${clan.name}** role name updated from **${oldRoleName}** to **${newRoleName}***\n> ${theme.dot} *The role now has a new name*`);
  }
};
