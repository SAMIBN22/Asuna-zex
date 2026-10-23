import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags
} from "discord.js";

import ClanConfig from "../../../models/clanConfig.js"; 
import config from "../../../config/clanConfig.js"; 

export default {
  name: "info",
  category: 'Clan',
  description: "Show clan information",
  cooldown: 3,
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

    if (!args[0]) {
      return replyWithContainer(`${theme.clouds} Clan Information`, `> ${theme.dot} *Please provide a clan name, ID, or leader*\n> ${theme.dot} *Usage: \`${config.prefix}info <clanName/id/leader>\`*`);
    }

    const identifier = args[0];

    const findClan = async (identifier) => {
      let clan = await ClanConfig.findOne({ guildId: guild.id, name: identifier });
      if (!clan) {
        clan = await ClanConfig.findOne({ guildId: guild.id, clanId: identifier });
      }
      if (!clan) {
        const leaderMember = message.mentions.users.first() ||
          guild.members.cache.find(m => m.user.tag.toLowerCase() === identifier.toLowerCase())?.user;
        if (leaderMember) {
          clan = await ClanConfig.findOne({ guildId: guild.id, leaders: leaderMember.id });
        }
      }
      return clan;
    };

    const clan = await findClan(identifier);

    if (!clan) {
      return replyWithContainer(`${theme.clouds} Clan Information`, `> ${theme.no} *Clan **${identifier}** not found*\n> ${theme.dot} *Please check the clan name, ID, or leader*`);
    }

    const leaderTag = clan.leaders?.[0] ? `<@${clan.leaders[0]}>` : "`None`";
    const coLeaders = clan.leaders?.length > 1
      ? clan.leaders.slice(1).map(id => `<@${id}>`).join(", ")
      : "`None`";

    const role = clan.roleId ? `<@&${clan.roleId}>` : "`None`";
    const textChannel = clan.channels?.text ? `<#${clan.channels.text}>` : "`None`";
    const voiceChannel = clan.channels?.voice ? `<#${clan.channels.voice}>` : "`None`";

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} ${clan.name}__`)
      )
      .addSeparatorComponents(new SeparatorBuilder());

    if (images.banner) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(item =>
          item.setURL(images.banner).setDescription(`${clan.name} Information`)
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder());
    }

    container
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Clan Information__**\n` +
              `> ${theme.arrow} **Name:** ${clan.name}\n` +
              `> ${theme.arrow} **ID:** \`${clan.clanId}\`\n` +
              `> ${theme.arrow} **Leader:** ${leaderTag}\n` +
              `> ${theme.arrow} **Co-Leaders:** ${coLeaders}\n` +
              `> ${theme.arrow} **Role:** ${role}\n` +
              `> ${theme.arrow} **Text Channel:** ${textChannel}\n` +
              `> ${theme.arrow} **Voice Channel:** ${voiceChannel}`
            )
          )
          .setThumbnailAccessory(userThumbnail)
      );

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });
  }
};
