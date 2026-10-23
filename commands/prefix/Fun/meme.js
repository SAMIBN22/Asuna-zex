import { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

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

const createMemeContainer = (data, theme) => {
  const container = new ContainerBuilder()
    .setAccentColor(theme.color || 0x010101)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `# ${theme.emojis.title || ''} __Meme__\n` +
      `> ${theme.emojis.star || ''} **__Title:__** ${data.title}\n` +
      `> ${theme.emojis.star || ''} **__Author:__** ${data.author}\n` +
      `> ${theme.emojis.star || ''} **__Score:__** ${data.ups || 0}  | ${data.downs || 0}  | ${data.num_comments || 0} `
    ));

  if (data.url && (data.url.includes('.jpg') || data.url.includes('.png') || data.url.includes('.gif'))) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder()
        .addItems(item => item.setURL(data.url))
    );
  }

  return container;
};

const createNextButton = () => new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('get_next_meme')
      .setLabel('Get Next')
      .setStyle(ButtonStyle.Danger)
  );

const fetchMeme = async () => {
  const response = await fetch('https://meme-api.com/gimme/dankmemes');
  const data = await response.json();

  if (!data || !data.url) {
    return null;
  }

  return {
    title: data.title || 'Random Meme',
    author: data.author || 'Unknown',
    url: data.url,
    ups: data.ups || 0,
    downs: 0,
    num_comments: 0
  };
};

export default {
  name: "meme",
  aliases: ["memes", "randomeme", "funny", "joke"],
  description: "Get a random hilarious meme from Reddit with interactive navigation",
  category: "Fun",
  usage: "+meme",
  examples: [
    "+meme",
    "+memes",
    "+randomeme"
  ],
  permissions: [],
  guildOnly: true,
  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);

    const memeData = await fetchMeme();
    if (!memeData) {
      return message.reply({
        components: [createResponse('warning', 'Warning', 'No meme found. Try again later!', theme, client)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = createMemeContainer(memeData, theme);
    const button = createNextButton();

    const sentMessage = await message.reply({
      components: [container, button],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = sentMessage.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 300000
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'get_next_meme') {
        const newMemeData = await fetchMeme();
        if (!newMemeData) {
          await interaction.update({
            components: [createResponse('warning', 'Warning', 'No meme found. Try again later!', theme, client)],
            flags: MessageFlags.IsComponentsV2
          });
          return;
        }

        const newContainer = createMemeContainer(newMemeData, theme);
        const newButton = createNextButton();

        await interaction.update({
          components: [newContainer, newButton],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });

    collector.on('end', async () => {
      await sentMessage.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    });
  }
};
