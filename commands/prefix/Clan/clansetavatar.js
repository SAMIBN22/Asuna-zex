import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
  SeparatorBuilder,
  MediaGalleryBuilder
} from 'discord.js';

export default {
  name: 'clansetavatar',
  category: 'Clan',
  aliases: ['avatar', 'setav', 'botavatar'],
  description: 'Set bot avatar image',
  cooldown: 10,
  permissions: ['Administrator'],
  async execute(message, args, client) {
    const { member } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

    const userThumbnail = new ThumbnailBuilder()
      .setURL(member.user.displayAvatarURL({ extension: "png", size: 512 }))
      .setDescription(`${member.user.username}'s Avatar`);

    const buildContainer = (header, content) => {
      return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(content)
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
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You need administrator permissions to use this command*`);
    }

    let imageUrl = null;
    
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        imageUrl = attachment.url;
      }
    } else if (args.length > 0) {
      const url = args[0];
      if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)(\?.*)?$/i)) {
        imageUrl = url;
      }
    }

    if (!imageUrl) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# __${theme.clouds} Avatar Setup__\n> ${theme.dot} *I need an image to set as my avatar*`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems([
            {
              media: { url: client.user.displayAvatarURL({ extension: 'png', size: 1024 }) },
              title: "Current Avatar",
              subtitle: "Bot's current avatar"
            }
          ])
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.star} **__How to use:__**\n` +
            `> ${theme.arrow} Attach an image file\n` +
            `> ${theme.arrow} Or provide an image URL\n` +
            `## ${theme.star} **__Supported formats:__**\n` +
            `> ${theme.arrow} JPG, PNG, GIF, WebP, BMP, TIFF, SVG`
          )
        );

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false }
      });
    }

    const oldAvatar = client.user.displayAvatarURL({ extension: 'png', size: 1024 });
    await client.user.setAvatar(imageUrl);
    
    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# __${theme.clouds} Avatar Updated__\n> ${theme.yes} *Avatar updated successfully*`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          {
            media: { url: oldAvatar },
            title: "Previous Avatar",
            subtitle: "Bot's old avatar"
          },
          {
            media: { url: imageUrl },
            title: "New Avatar", 
            subtitle: "Bot's new avatar"
          }
        ])
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> ${theme.arrow} *My new avatar has been set*\n` +
          `> ${theme.arrow} *It may take a few minutes to update everywhere*`
        )
      );

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });
  }
};
