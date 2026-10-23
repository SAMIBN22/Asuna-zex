import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionsBitField
} from 'discord.js';

export default {
  name: "psetcategory",
  description: "Setup the system category by ID or mention",
  category: "Premium",

  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Permission__\n` +
                `> ${theme.emojis.star} You don't have permission to use this command.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    let category = message.mentions.channels.first();
    if (!category) {
      const id = args[0];
      if (!id) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.title} __Warning__\n` +
                  `> ${theme.emojis.star} Please provide a category mention or ID.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
      category = message.guild.channels.cache.get(id);
    }

    if (!category || category.type !== 4) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Warning__\n` +
                `> ${theme.emojis.star} Please provide a valid category.`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    await client.saveSettings(message.guild.id, 'premiumCategory', category.id);

    const container = new ContainerBuilder()
      .setAccentColor(theme.color)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${theme.emojis.yes} __Success__\n` +
          `> ${theme.emojis.star} Category <#${category.id}> has been set as the system category.`
        )
      );

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
