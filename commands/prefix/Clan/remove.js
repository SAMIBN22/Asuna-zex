import { resolveMember } from '../../../lib/resolveUser.js';
import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder
} from "discord.js";

import ClanConfig from "../../../models/clanConfig.js"; 
import GuildSetup from "../../../models/clanGuildSetup.js";
import Logger from "../../../utils/clanLogger.js";
import config from "../../../config/clanConfig.js"; 

export default {
  name: "remove",
  category: 'Clan',
  aliases: ["userremove", "removeuser", "kick"],
  description: "Remove a member from your clan",
  cooldown: 5,
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

    const handleError = (errorMessage) => {
      return replyWithContainer(`${theme.title} Clan Management`, errorMessage);
    };

    const handleSuccess = (content) => {
      return replyWithContainer(`${theme.title} Clan Management`, content);
    };

    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return handleError(`> ${theme.dot} *The clan system has not been set up yet*\n> ${theme.dot} *Please configure the system first*`);
    }

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      $or: [{ leaders: member.id }, { coLeaders: member.id }],
    });

    if (!clan) {
      return handleError(`> ${theme.dot} *You are not a leader or co-leader of any clan*\n> ${theme.dot} *You need clan permissions to remove members*`);
    }

    const userArg = args[0];
    if (!userArg) {
      return handleError(`> ${theme.dot} *Please provide a valid user*\n> ${theme.dot} *Usage: \`${config.prefix}remove @member\` or \`${config.prefix}remove userID\`*`);
    }

    let targetMember;
    const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      targetMember = await resolveMember(message, args[0]);
    } else {
      
    }
    
    if (!targetMember) {
      return handleError(`> ${theme.dot} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`);
    }

    if (clan.coLeaders.includes(targetMember.id)) {
      return handleError(`> ${theme.dot} *This member is a co leader*\n> ${theme.dot} *Use \`${config.prefix}removecoll @user\` to remove co-leader first*`);
    }

    if (![...clan.members].includes(targetMember.id)) {
      return handleError(`> ${theme.dot} *This member is not in your clan*\n> ${theme.dot} *They're not part of the team*`);
    }

    clan.members = clan.members.filter(id => id !== targetMember.id);
    await clan.save();
    const role = guild.roles.cache.get(clan.roleId);
    if (role) {
      await targetMember.roles.remove(role);
    }

    const successMessage = `> ${theme.yes} ${targetMember} has been removed from **${clan.name}**\n> ${theme.dot} *They're no longer part of the clan*`;
    
    const logger = new Logger(client);
    await logger.logMemberRemoved(guild.id, member, targetMember, clan.name);

    return handleSuccess(successMessage);
  }
};