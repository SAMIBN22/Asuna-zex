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
} from 'discord.js';

import GuildSetup from "../../../models/clanGuildSetup.js"; 
import ClanConfig from "../../../models/clanConfig.js";
import config from "../../../config/clanConfig.js"; 

export default {
  name: 'forcetransfer',
  category: 'Clan',
  description: 'Force transfer clan leadership (Managers only)',
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
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can force transfer clans*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Force Transfer`, `> ${theme.dot} *Please provide clan identifier and new leader*\n> ${theme.dot} *Usage: \`${config.prefix}forcetransfer <clanName|clanID> <@user>\`*`);
    }

    const clanIdentifier = args[0];
    const userArg = args[1];

    let clan = await ClanConfig.findOne({ guildId: guild.id, name: clanIdentifier });
    if (!clan) {
      clan = await ClanConfig.findOne({ guildId: guild.id, clanId: clanIdentifier });
    }

    if (!clan) {
      const allClans = await ClanConfig.find({ guildId: guild.id });
      const clanList = allClans.map(c => `Name: ${c.name}, ID: ${c.clanId}`).join('\n');
      return replyWithContainer(`${theme.clouds} Force Transfer`, `> ${theme.no} *Clan not found*
> ${theme.dot} *Please check the clan name or ID*

**Available clans:**
${clanList}`);
    }

    let newLeader;
    const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      newLeader = await resolveMember(message, args[0]);
    } else {
      
    }

    if (!newLeader) {
      return replyWithContainer(`${theme.clouds} Force Transfer`, `> ${theme.no} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`);
    }

    const oldLeaders = [...clan.leaders];
    clan.leaders = [newLeader.id];
    clan.coLeaders = clan.coLeaders.filter(id => id !== newLeader.id);
    clan.members = clan.members.filter(id => id !== newLeader.id);
    await clan.save();

    const role = guild.roles.cache.get(clan.roleId);
    if (role) {
      await newLeader.roles.add(role);
      for (const oldLeaderId of oldLeaders) {
        const oldLeader = guild.members.cache.get(oldLeaderId);
        if (oldLeader) await oldLeader.roles.remove(role);
      }
    }

    return replyWithContainer(`${theme.clouds} Force Transfer`, `> ${theme.yes} *Clan **${clan.name}** leadership transferred to **${newLeader.user.tag}***\n> ${theme.dot} *The new leader now has full control*`);
  }
};
