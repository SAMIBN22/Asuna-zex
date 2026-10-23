import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import GuildSetup from '../../../models/clanGuildSetup.js';
import config from '../../../config/clanConfig.js';
import mainConfig from '../../../config/config.js';

export default {
  name: 'clanbotinfo',
  description: 'Show comprehensive information about the clan bot',
  aliases: ['aboutbot', 'invitebot'],
  category: 'Clan',
  cooldown: 10,
  async execute(message, args) {
    const { guild, client } = message;
    const { theme, images, botName } = this.getThemeAssets(client);

    let guildPrefix = config.prefix;
    if (guild) {
      try {
        const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
        if (guildSetup && guildSetup.prefix) {
          guildPrefix = guildSetup.prefix;
        }
      } catch (error) {
        console.error('Error fetching guild prefix:', error);
      }
    }

    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.title} **${botName} is gathering system information...**`
            )
          ),
      ],
      allowedMentions: { parse: [] },
    });

    const uptime = Date.now() - client.readyTimestamp;
    const memoryUsage = process.memoryUsage();
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.users.cache.size;
    const totalChannels = client.channels.cache.size;
    const totalCommands = client.prefixCommands?.size || 0;
    const totalSlashCommands = client.slashCommands?.size || 0;
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    const pid = process.pid;

    const uptimeString = this.formatUptime(uptime);
    
    const gallery = new MediaGalleryBuilder()
      .addItems(item => item
        .setDescription(`${botName} System Information`)
        .setURL(images.banner)
      );

    const container = this.buildBotInfoContainer(client, {
      uptimeString,
      memoryUsage,
      totalGuilds,
      totalUsers,
      totalChannels,
      totalCommands,
      totalSlashCommands,
      nodeVersion,
      platform,
      arch,
      pid,
      gallery,
      images,
      guildPrefix
    });
    
    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { parse: [] },
    });
  },

  getThemeAssets(client) {
    return {
      theme: client.clanThemes?.emojis?.main,
      images: client.clanThemes?.images?.main,
      botName: "Mayurichibi"
    };
  },

  buildBotInfoContainer(client, data) {
    const {
      uptimeString,
      memoryUsage,
      totalGuilds,
      totalUsers,
      totalChannels,
      totalCommands,
      totalSlashCommands,
      nodeVersion,
      platform,
      arch,
      pid,
      gallery,
      images,
      guildPrefix
    } = data;

    const { theme, botName } = this.getThemeAssets(client);

    return new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${theme.title} __${botName} Information__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(gallery)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${theme.star} __System Statistics__\n` +
              `> ${theme.arrow} **Servers:** \`${totalGuilds}\`\n` +
              `> ${theme.arrow} **Users:** \`${totalUsers}\`\n` +
              `> ${theme.arrow} **Channels:** \`${totalChannels}\`\n` +
              `> ${theme.arrow} **Commands:** \`${totalCommands + totalSlashCommands}\`\n` +
              `> ${theme.arrow} **Prefix:** \`${guildPrefix}\`\n` +
              `> ${theme.arrow} **Uptime:** \`${uptimeString}\`\n` +
              `> ${theme.arrow} **Memory:** \`${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB\``
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(images.thumbnail)
          )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${theme.star} __System Details__\n` +
          `\`\`\`ansi\n${this.getSystemDetails(client.ws.ping, nodeVersion, platform, arch, pid)}\n\`\`\``
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${theme.star} __Clan Bot Capabilities__\n` +
          `> ${theme.dot} **Clan Management & Organization**\n` +
          `> ${theme.dot} **Member Controls & Role Management**\n` +
          `> ${theme.dot} **Leader & Co-leader Tools**\n` +
          `> ${theme.dot} **Server Setup & Configuration**\n` +
          `> ${theme.dot} **Advanced Help System**`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> ${theme.heart} *${botName} is ready to help manage ${totalGuilds} servers and ${totalUsers} users*`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setLabel("Support Server")
              .setStyle(ButtonStyle.Link)
              .setURL(mainConfig.supportServer)
          )
      );
  },

  getSystemDetails(ping, nodeVersion, platform, arch, pid) {
    return [
      `\u001b[33m// System Information\u001b[0m`,
      `\u001b[33mPing        = ${ping}ms;\u001b[0m`,
      `\u001b[33mNode.js     = "${nodeVersion}";\u001b[0m`,
      `\u001b[33mPlatform    = "${platform} ${arch}";\u001b[0m`,
      `\u001b[33mProcess ID  = ${pid};\u001b[0m`
    ].join('\n');
  },

  formatUptime(uptime) {
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
};
