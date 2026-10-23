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
  name: 'editname',
  category: 'Clan',
  description: 'Edit clan name (Managers only)',
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
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can edit clan names*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Edit Name`, `> ${theme.dot} *Please provide clan identifier and new name*\n> ${theme.dot} *Usage: \`${config.prefix}editname <clanName|clanID> <newName>\`*`);
    }

    const clanIdentifier = args[0];
    const newName = args.slice(1).join(' ').trim();

    if (newName.length > 50) {
      return replyWithContainer(`${theme.clouds} Edit Name`, `> ${theme.dot} *Clan name must be 50 characters or less*\n> ${theme.dot} *Please provide a shorter name*`);
    }

    let clan = await ClanConfig.findOne({ guildId: guild.id, name: clanIdentifier });
    if (!clan) {
      clan = await ClanConfig.findOne({ guildId: guild.id, clanId: clanIdentifier });
    }

    if (!clan) {
      const allClans = await ClanConfig.find({ guildId: guild.id });
      const clanList = allClans.map(c => `Name: ${c.name}, ID: ${c.clanId}`).join('\n');
      return replyWithContainer(`${theme.clouds} Edit Name`, `> ${theme.no} *Clan not found*\n> ${theme.dot} *Please check the clan name or ID*\n\n**Available clans:**\n${clanList}`);
    }

    const existingClan = await ClanConfig.findOne({ guildId: guild.id, name: newName });
    if (existingClan && existingClan._id.toString() !== clan._id.toString()) {
      return replyWithContainer(`${theme.clouds} Edit Name`, `> ${theme.info} *A clan with this name already exists*\n> ${theme.dot} *Please choose a different name*`);
    }

    const oldName = clan.name;
    clan.name = newName;
    await clan.save();

    const role = guild.roles.cache.get(clan.roleId);
    if (role) await role.setName(newName);

    const textChannel = guild.channels.cache.get(clan.channels?.text);
    if (textChannel) {
      const newTextName = newName.toLowerCase().replace(/\s+/g, '-');
      await textChannel.setName(newTextName);
    }

    const voiceChannel = guild.channels.cache.get(clan.channels?.voice);
    if (voiceChannel) {
      await voiceChannel.setName(`${newName} Voice`);
    }

    return replyWithContainer(`${theme.clouds} Edit Name`, `> ${theme.yes} *Clan name updated from **${oldName}** to **${newName}***\n> ${theme.dot} *Role, text channel, and voice channel names updated*`);
  }
};
