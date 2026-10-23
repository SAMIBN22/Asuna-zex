import { resolveMember } from '../../../lib/resolveUser.js';
import { 
  PermissionFlagsBits, 
  ContainerBuilder, 
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags 
} from "discord.js";

import GuildSetup from '../../../models/clanGuildSetup.js'; 
import ClanConfig from '../../../models/clanConfig.js';
import config from "../../../config/clanConfig.js"; 

export default {
  name: "forceadd",
  category: 'Clan',
  aliases: ["fadd"],
  description: "Force add a user to a clan (Managers only)",
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

    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *Server is not setup yet*\n> ${theme.dot} *Please run \`${config.prefix}setup\` first*`);
    }

    const managerRoleId = guildConfig.roles?.manager;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isManager = managerRoleId && member.roles.cache.has(managerRoleId);
    if (!isAdmin && !isManager) {
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can force manage users*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Force Add`, `> ${theme.dot} *Please provide clan and user*\n> ${theme.dot} *Usage: \`${config.prefix}forceadd <clanName> <@user>\`*`);
    }

    const clanName = args[0];
    const userArg = args[1];

    let clan = await ClanConfig.findOne({ guildId: guild.id, name: clanName });
    if (!clan) {
      clan = await ClanConfig.findOne({ guildId: guild.id, clanId: clanName });
    }
    if (!clan) {
      return replyWithContainer(`${theme.clouds} Force Add`, `> ${theme.no} *Clan not found*\n> ${theme.dot} *Please check the clan name or ID*`);
    }

    let targetMember;
    const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      targetMember = await resolveMember(message, args[0]);
    } else {
      
    }

    if (!targetMember) {
      return replyWithContainer(`${theme.clouds} Force Add`, `> ${theme.no} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`);
    }

    if (clan.members.includes(targetMember.id) || clan.coLeaders.includes(targetMember.id) || clan.leaders.includes(targetMember.id)) {
      return replyWithContainer(`${theme.clouds} Force Add`, `> ${theme.info} *This member is already in the clan*\n> ${theme.dot} *They're already part of the team*`);
    }

    clan.members.push(targetMember.id);
    await clan.save();

    const role = guild.roles.cache.get(clan.roleId);
    if (role) await targetMember.roles.add(role);

    return replyWithContainer(`${theme.clouds} Force Add`, `> ${theme.yes} *${targetMember.user.tag} has been force added to **${clan.name}***\n> ${theme.dot} *They are now a clan member*`);
  }
};