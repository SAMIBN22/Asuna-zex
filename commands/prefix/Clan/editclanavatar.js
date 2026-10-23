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
  name: "editclanavatar",
  category: 'Clan',
  description: "Edit your clan avatar (Leaders only)",
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

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      leaders: member.id
    });

    if (!clan) {
      return replyWithContainer(`${theme.clouds} Edit Clan Avatar`, `> ${theme.dot} *You must be a clan leader to edit clan settings*\n> ${theme.dot} *Only leaders can manage clan settings*`);
    }

    if (!args[0]) {
      return replyWithContainer(`${theme.clouds} Edit Clan Avatar`, `> ${theme.dot} *Please provide an avatar URL*\n> ${theme.dot} *Usage: \`${config.prefix}editclanavatar <avatarURL>\`*`);
    }

    const avatarUrl = args[0];

    if (!avatarUrl.startsWith('http')) {
      return replyWithContainer(`${theme.clouds} Edit Clan Avatar`, `> ${theme.dot} *Please provide a valid image URL*\n> ${theme.dot} *The URL must start with http*`);
    }

    clan.avatar = avatarUrl;
    await clan.save();

    return replyWithContainer(`${theme.clouds} Edit Clan Avatar`, `> ${theme.yes} *Clan **${clan.name}** avatar updated successfully*\n> ${theme.dot} *The new avatar will be displayed in clan information*`);
  }
};
