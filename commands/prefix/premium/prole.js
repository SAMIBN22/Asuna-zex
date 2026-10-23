import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder
} from 'discord.js';

import GuildSetup from '../../../models/guildSetup.js';

export default {
  name: "prole",
  aliases: ["setprole", "prime-role"],
  description: "Manage your prime room role (icon/color).",
  category: "Premium",

  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Warning__\n` +
                `> ${theme.emojis.star} You must be in your prime room to use this command.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const setup = await GuildSetup.findOne({ channelId: voiceChannel.id });
    if (!setup || !setup.roleId) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Warning__\n` +
                `> ${theme.emojis.star} This room doesn't have a prime role.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const managers = Array.isArray(setup.managers) ? setup.managers.map(String) : [];
    const isOwner = setup.ownerId === message.author.id;
    const isManager = managers.includes(message.author.id);

    if (!isOwner && !isManager) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Permission__\n` +
                `> ${theme.emojis.star} Only the owner or managers can edit this role.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const subCommand = args[0]?.toLowerCase();
    const role = message.guild.roles.cache.get(setup.roleId);

    if (!["icon", "color"].includes(subCommand) || !args[1]) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Command Prime Role__\n` +
                `> ${theme.emojis.star} **Examples:** \n` +
                `> ${theme.emojis.star} prole icon \n` +
                `> ${theme.emojis.star} prole color #ff0000`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subCommand === "icon") {
      if (message.guild.premiumTier < 2) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.title} __Warning__\n` +
                  `> ${theme.emojis.star} This server needs Level 2 (7 boosts) to use role icons.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const match = args[1].match(/<a?:([\w]+):(\d+)>/);
      if (!match) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.title} __Warning__\n` +
                  `> ${theme.emojis.star} Please provide a valid custom emoji.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const emojiName = match[1];
      const emojiId = match[2];
      const animated = args[1].startsWith("<a:");
      if (animated) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.title} __Warning__\n` +
                  `> ${theme.emojis.star} Role icons do not support animated (GIF) emojis.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const url = `https://cdn.discordapp.com/emojis/${emojiId}.png`;

      if (role.icon) await role.setIcon(null);
      await role.setIcon(url);
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.yes} __Success__\n` +
                `> ${theme.emojis.star} Icon updated for **${role.name}**.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subCommand === "color") {
      const color = args[1];
      await role.setColor(color);
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.yes} __Success__\n` +
                `> ${theme.emojis.star} Color updated for **${role.name}** → \`${color}\`.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
