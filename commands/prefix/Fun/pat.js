import { resolveUser } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder } from 'discord.js';

const createResponse = (theme, type, header, content, client) => {
  const emojis = theme.emojis;
  return new ContainerBuilder()
    .setAccentColor(theme.color)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `# ${emojis[type === 'success' ? 'yes' : 'title'] || ''} __${header}__\n` +
          `> ${emojis.star || '•'} ${content}`
        ))
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
        )
    );
};

const createPatContainer = (author, target, imageUrl, theme) => {
  const emojis = theme.emojis;
  return new ContainerBuilder()
    .setAccentColor(theme.color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${emojis.title || ''} __Pat Action__\n` +
      `> ${emojis.star || '•'} ${author} pats ${target}`
    ))
    .addMediaGalleryComponents(
      new MediaGalleryBuilder()
        .addItems(item => item.setURL(imageUrl))
    );
};


export default {
  name: "pat",
  description: "Pat someone on the head",
  category: "Fun",
  usage: "+pat <user>",
  guildOnly: true,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const theme = await client.themeManager.getTheme(guildId);

    const user = await resolveUser(message, args[0], client);
    if (!user) {
      return message.reply({
        components: [createResponse(theme, 'info', 'Pat Input', 'Please mention a user to pat.', client)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      const response = await fetch('https://nekos.life/api/v2/img/pat');
      const data = await response.json();
      const container = createPatContainer(message.author, user, data.url, theme);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (e) {
      return message.reply({
        components: [createResponse(theme, 'error', 'Error', 'Failed to fetch image.', client)],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
