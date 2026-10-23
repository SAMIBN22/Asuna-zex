import { resolveUser } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder } from 'discord.js';

const createResponse = (type, header, content, theme, client) => new ContainerBuilder()
  .setAccentColor(theme.color)
  .addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# ${theme.emojis[type === 'warning' ? 'slap' : 'title']} __${header}__\n` +
        `> ${theme.emojis.star} ${content}`
      ))
      .setThumbnailAccessory(
        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
      )
  );

const createKillContainer = (author, target, imageUrl, theme) => new ContainerBuilder()
  .setAccentColor(theme.color)
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `## ${theme.emojis.title || ''} __Kill Action__\n` +
    `> ${theme.emojis.star} ${author} killed ${target}`
  ))
  .addMediaGalleryComponents(
    new MediaGalleryBuilder()
      .addItems(item => item.setURL(imageUrl))
  );


const validateTarget = (user, author) => {
  if (!user) return 'Please mention a user or provide a valid user ID to kill';
  if (user.id === author.id) return 'You cannot kill yourself';
  if (user.bot) return 'You cannot kill a bot';
  return null;
};

const fetchKillImage = async () => {
  const response = await fetch('https://api.waifu.pics/sfw/kill');
  const data = await response.json();
  return data.url;
};

export default {
  name: "kill",
  aliases: ["murder", "eliminate", "destroy", "kills"],
  description: "Eliminate someone with a dramatic anime image - for dramatic effect",
  category: "Fun",
  usage: "+kill <user>",
  examples: [
    "+kill @algo",
    "+kill 645784683774345232",
    "+kill  allgox"
  ],
  permissions: [],
  guildOnly: true,
  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);

    const user = await resolveUser(message, args[0]);
    const validationError = validateTarget(user, message.author);
    if (validationError) {
      return message.reply({
        components: [createResponse('warning', 'Warning', validationError, theme, client)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const imageUrl = await fetchKillImage();
    const container = createKillContainer(message.author, user, imageUrl, theme);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
