import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

export default {
  name: 'clanping',
  category: 'Clan',
  aliases: ['p', 'latency'],
  description: 'Show bot performance and connection status',
  cooldown: 5,
  async execute(message, args, client) {
    const { guild } = message;

    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.coooldown} **__Bot is analyzing connection...__**`
            )
          )
      ],
      allowedMentions: { repliedUser: false }
    });

    const latency = Math.max(sent.createdTimestamp - message.createdTimestamp, 1);
    const apiLatency = Math.round(client.ws.ping);
    const uptime = formatUptime(client.uptime);
    
    const helpImage = images.banner;
    const thumbnailImage = images.thumbnail;
    
    const themeImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: helpImage },
        title: `${theme.dot} Bot Performance`,
        subtitle: "Advanced Discord Utility Bot"
      }
    ]);

    const container = buildPingContainer(client, latency, apiLatency, uptime, themeImage, thumbnailImage);

    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });

    const collector = sent.createMessageComponentCollector({
      time: 300000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on("collect", async (interaction) => {
      if (interaction.isButton() && interaction.customId === "ping_refresh") {
        const refreshStart = Date.now();
        const newApiLatency = Math.round(client.ws.ping);
        const newUptime = formatUptime(client.uptime);

        const processingTime = Date.now() - refreshStart;
        const newLatency = Math.max(processingTime, 1);

        const refreshContainer = buildPingContainer(client, newLatency, newApiLatency, newUptime, themeImage, thumbnailImage);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [refreshContainer],
          allowedMentions: { repliedUser: false }
        });
      }
    });
  }
};

function buildPingContainer(client, latency, apiLatency, uptime, themeImage, thumbnailImage) {
  const theme = client.clanThemes?.emojis?.main || {};
  
  return new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# __${theme.title} Bot Performance__`)
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(themeImage)
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.star} **__Performance Metrics__**\n` +
            `> ${theme.arrow} **Response Speed:** \`${latency}ms\`\n` +
            `> ${theme.arrow} **Discord API:** \`${apiLatency}ms\`\n` +
            `> ${theme.arrow} **Uptime:** \`${uptime}\``
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(thumbnailImage)
        )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${theme.star} **__Bot Status__**\n` +
        `\`\`\`ansi\n${getStatusInfo(latency, apiLatency, uptime)}\n\`\`\``
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> ${theme.clouds} *Bot is ready to serve*`
          )
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel("Refresh")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("ping_refresh")
        )
    );
}

function getStatusInfo(latency, apiLatency, uptime) {
  return [
    `\u001b[33m// Discord API Status\u001b[0m`,
    `\u001b[33mStatus     = "${apiLatency < 200 ? 'Optimal' : apiLatency < 400 ? 'Stable' : 'Slow'}";\u001b[0m`,
    `\u001b[33mLatency    = ${apiLatency}ms;\u001b[0m`,
    ``,
    `\u001b[33m// Bot Performance\u001b[0m`,
    `\u001b[33mStatus     = "${latency < 100 ? 'Peak Performance' : latency < 200 ? 'Good Response' : 'Needs Attention'}";\u001b[0m`,
    `\u001b[33mLatency    = ${latency}ms;\u001b[0m`,
    `\u001b[33mUptime     = "${uptime}";\u001b[0m`
  ].join('\n');
}

function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
