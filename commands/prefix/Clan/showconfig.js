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

import GuildSetup from '../../../models/clanGuildSetup.js'; 
import config from "../../../config/clanConfig.js"; 

export default {
  name: 'showconfig',
  category: 'Clan',
  aliases: ['config','showsetup'],
  description: 'Displays the current server setup configuration.',
  cooldown: 3,
  permissions: ['Administrator'],
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

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You need Administrator permissions to view the configuration*\n> ${theme.dot} *Only admins can check server setup*`);
    }

    const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      return replyWithContainer(`${theme.clouds} Server Setup`, `> ${theme.info} *Server is not setup yet*\n> ${theme.dot} *Run \`${config.prefix}setup-clan\` to configure the bot completely*`);
    }

    const bannerImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: images.banner },
        title: `${theme.dot} Server Configuration`,
        subtitle: "Current Setup Status"
      }
    ]);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} Server Setup Configuration__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(bannerImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Setup Status__**\n` +
              `> ${theme.arrow} **Manager Role:** ${guildSetup.roles?.manager ? `<@&${guildSetup.roles.manager}>` : 'Not Set'}\n` +
              `> ${theme.arrow} **Clan Category:** ${guildSetup.categoryId ? `<#${guildSetup.categoryId}>` : 'Not Set'}\n` +
              `> ${theme.arrow} **Log Channel:** ${guildSetup.logChannelId ? `<#${guildSetup.logChannelId}>` : 'Not Set'}\n` +
              `> ${theme.arrow} **Prefix:** \`${guildSetup.prefix || config.prefix || '&'}\`\n` +
              `> ${theme.arrow} **Setup Date:** <t:${Math.floor(guildSetup.createdAt.getTime() / 1000)}:R>`
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