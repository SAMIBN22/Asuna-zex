import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder
} from 'discord.js';

import ClanConfig from "../../../models/clanConfig.js";
import GuildSetup from "../../../models/clanGuildSetup.js";
import Logger from "../../../utils/clanLogger.js";
import config from "../../../config/clanConfig.js";

export default {
  name: 'nick',
  category: 'Clan',
  aliases: ['nickname', 'name', 'rename'],
  description: 'Change the nickname of a clan member',
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
      return replyWithContainer(`${theme.clouds} Nickname Management`, errorMessage);
    };

    const handleSuccess = (content) => {
      return replyWithContainer(`${theme.clouds} Nickname Management`, content);
    };

    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return handleError(`> ${theme.dot} *The clan system has not been set up yet*\n> ${theme.dot} *Please configure the system first*`);
    }

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      $or: [{ leaders: member.id }, { coLeaders: member.id }]
    });

    if (!clan) {
      return handleError(`> ${theme.dot} *You are not a leader or co-leader of any clan*\n> ${theme.dot} *You need clan permissions to change nicknames*`);
    }

    if (args.length < 2) {
      return handleError(`> ${theme.dot} *Please provide a valid user and new nickname*\n> ${theme.dot} *Usage: \`${config.prefix}nick @member newname\` or \`${config.prefix}nick userID newname\`*`);
    }

    const memberArg = args[0];
    let targetMember;
    const mentionMatch = memberArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      targetMember = await resolveMember(message, args[0]);
    } else {
      targetMember = await resolveMember(message, args[0]);
    }

    if (!targetMember) {
      return handleError(`> ${theme.dot} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`);
    }

    if (!clan.members.includes(targetMember.id)) {
      return handleError(`> ${theme.dot} *This member is not in your clan*\n> ${theme.dot} *They're not part of the team*`);
    }

    const newNickname = args.slice(1).join(' ');
    if (!newNickname) {
      return handleError(`> ${theme.dot} *Please provide a new nickname*\n> ${theme.dot} *The nickname cannot be empty*`);
    }

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return handleError(`> ${theme.dot} *I do not have permission to manage nicknames*\n> ${theme.dot} *Please give me the Manage Nicknames permission*`);
    }

    if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
      return handleError(`> ${theme.dot} *I cannot change this member's nickname*\n> ${theme.dot} *Due to role hierarchy restrictions*`);
    }

    const oldNickname = targetMember.nickname || targetMember.user.username;
    await targetMember.setNickname(newNickname);

    const successMessage = `> ${theme.yes} ${targetMember.user.tag} nickname changed from **${oldNickname}** to **${newNickname}**\n> ${theme.dot} *Nickname updated successfully*`;
    
    const logger = new Logger(client);
    await logger.logNicknameChange(guild.id, member, targetMember, oldNickname, newNickname);

    return handleSuccess(successMessage);
  }
};