import {
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder
} from "discord.js";

import ClanConfig from "../../../models/clanConfig.js";
import GuildSetup from "../../../models/clanGuildSetup.js";
import config from "../../../config/clanConfig.js";

export default {
  name: 'myrolecolor',
  category: 'Clan',
  description: "Edit your clan role color (Leaders only)",
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

    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      leaders: member.id
    });

    if (!clan && !isAdmin) {
      return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.dot} *You must be a clan leader to edit role settings*\n> ${theme.dot} *Only leaders can modify clan roles*`);
    }

    if (!args[0]) {
      return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.dot} *Please provide a color*\n> ${theme.dot} *Usage: \`${config.prefix}editrolecolor <#hexcolor>\`*`);
    }

    const colorValue = args[0];

    const colorMatch = colorValue.match(/^#?([0-9a-fA-F]{6})$/);
    if (!colorMatch) {
      return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.dot} *Please provide a valid hex color*\n> ${theme.dot} *Usage: \`${config.prefix}editrolecolor #EBC210\`*`);
    }

    if (!clan.roleId) {
      return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.info} *This clan doesn't have a role yet*\n> ${theme.dot} *Please create a clan first*`);
    }

    const role = guild.roles.cache.get(clan.roleId);
    if (!role) {
      return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.no} *Clan role not found*\n> ${theme.dot} *The role may have been deleted*`);
    }

    const color = parseInt(colorMatch[1], 16);
    await role.setColor(color);

    return replyWithContainer(`${theme.clouds} Edit Role Color`, `> ${theme.yes} *Role color updated successfully*\n> ${theme.dot} *The clan role now has a new color*`);
  }
};
