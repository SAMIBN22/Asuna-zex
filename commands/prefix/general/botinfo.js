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
  ActionRowBuilder
} from 'discord.js';
import themeManager from '../../../themes/themeManager.js';
import config from '../../../config/config.js';

export default {
  name: 'botinfo',
  description: 'Show comprehensive information about the bot including stats, uptime, and system info',
  aliases: ['info', 'about', 'invite', 'stats'],
  category: 'General',
  usage: '+botinfo',
  async execute(message, args, client) {
    const guildId = message.guild.id;
    const theme = await client.themeManager.getTheme(guildId);
    const emojis = theme.emojis;
    const images = theme.images;
    const themeColor = client.themeManager.getRGBColor(theme.color);

    const loadingContainer = new ContainerBuilder()
      .setAccentColor(themeColor)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${emojis.title || ''} __Loading Information__\n\n` +
              `> ${emojis.star || ''} **__Collecting system__**\n` +
              `> ${emojis.star || ''} **__specifications...__**`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
          )
      );

    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [loadingContainer],
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

    const uptimeString = formatUptime(uptime);

    const themeImage = new MediaGalleryBuilder().addItems(
      mediaItem => mediaItem
        .setURL(images.main || client.user.displayAvatarURL())
    );

    const supportBtn = new ButtonBuilder()
      .setLabel("Support Server")
      .setStyle(ButtonStyle.Link)
      .setURL(config.supportServer);

    if (emojis.clouds) {
      const _m = String(emojis.clouds).match(/<a?:(\w+):(\d+)>/);
      if (_m) supportBtn.setEmoji({ name: _m[1], id: _m[2], animated: emojis.clouds.startsWith('<a:') });
      else supportBtn.setEmoji({ name: emojis.clouds });
    }

    const container = new ContainerBuilder()
      .setAccentColor(themeColor)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${emojis.title || ''} __${client.user.username} Info__\n\n` +
              `> ${emojis.star || ''} **__Guilds:__ \`${totalGuilds}\`**\n` +
              `> ${emojis.star || ''} **__Users:__ \`${totalUsers}\`**\n` +
              `> ${emojis.star || ''} **__Channels:__ \`${totalChannels}\`**\n` +
              `> ${emojis.star || ''} **__Uptime:__ \`${uptimeString}\`**\n` +
              `> ${emojis.star || ''} **__Memory:__ \`${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB\`**`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
          )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(themeImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${emojis.star || ''} **__Architecture__**\n` +
          `\`\`\`ansi\n${getSystemDetails(client.ws.ping, nodeVersion, platform, arch, pid, theme)}\n\`\`\``
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${emojis.info || ''} __Features__\n\n` +
              `> ${emojis.star || ''} **__Advanced Moderation & Jail Systems__**\n` +
              `> ${emojis.star || ''} **__Dynamic Theme Engine Integration__**\n` +
              `> ${emojis.star || ''} **__Voice Channel & Security Protection__**\n` +
              `> ${emojis.star || ''} **__Premium Personal Channel Tools__**`
            )
          )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> ${emojis.star || ''} **__Join our support community__**\n` +
              `> ${emojis.star || ''} **__for assistance and news!__**`
            )
          )
          .setButtonAccessory(supportBtn)
      );

    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { parse: [] },
    });
  },
};

function getThemeAnsiCode(theme) {
  const themeColors = {
    cyan: '34',
    red: '31',
    green: '32',
    gold: '33',
    yellow: '33',
    purple: '45',
    pink: '35',
    grey: '37',
    black: '30',
    white: '37'
  };
  try {
    const themes = themeManager.themes || {};
    const themeName = Object.keys(themes).find(name =>
      themes[name].color === theme.color
    );

    return themeColors[themeName] || '36';
  } catch (error) {
    return '36';
  }
}

function getSystemDetails(ping, nodeVersion, platform, arch, pid, theme) {
  const themeAnsiCode = getThemeAnsiCode(theme);

  return [
    `\u001b[${themeAnsiCode}m// Core Environment\u001b[0m`,
    `\u001b[${themeAnsiCode}mLatency     = ${Math.round(ping)}ms;\u001b[0m`,
    `\u001b[${themeAnsiCode}mNode.js     = "${nodeVersion}";\u001b[0m`,
    `\u001b[${themeAnsiCode}mRuntime     = "${platform} ${arch}";\u001b[0m`,
    `\u001b[${themeAnsiCode}mProcess ID  = ${pid};\u001b[0m`
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
