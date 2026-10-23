import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} from 'discord.js';
import config from '../../../config/config.js';

export default {
  name: "antilink",
  aliases: ["antilinks", "linkprotection", "blocklinks", "linkfilter"],
  description: "Enable or disable the AntiLink system with whitelist roles",
  category: "Security",
  usage: "+antilink <enable/disable> [role]",
  examples: [
    "+antilink enable",
    "+antilink disable",
    "+antilink enable @Moderator"
  ],
  permissions: ["ManageGuild"],
  guildOnly: true,
  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);

    // Helper for simple responses
    const createResponse = (type, header, content) => new ContainerBuilder()
      .setAccentColor(theme.color)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `# ${theme.emojis[type === 'info' ? 'title' : type === 'success' ? 'yes' : 'slap']} __${header}__\n` +
            `> ${theme.emojis.star} ${content}`
          ))
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
          )
      );

    // Permission Check
    if (message.author.id !== message.guild.ownerId && !client.config.devIds.includes(message.author.id)) {
      return message.reply({
        components: [new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${theme.emojis.slap || ''} __Permission Denied__\n` +
                `> ${theme.emojis.star || ''} You do not have enough permissions to use this command.`
              ))
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          )],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const settings = await client.getSettings(message.guild.id);
    const option = args[0]?.toLowerCase();

    if (!option || !["on", "off", "enable", "disable", "status", "whitelist", "unwhitelist", "wl", "unwl"].includes(option)) {
      const isEnabled = settings.antiLink === 1;
      const status = isEnabled ? 'Enabled' : 'Disabled';
      const whitelist = settings.whitelistedRoles || [];

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Link Protection__`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} **__Current Status__**\n` +
                `> ${theme.emojis.star} **State:** \`${status}\`\n` +
                `> ${theme.emojis.star} **Whitelist:** ${whitelist.length > 0 ? whitelist.map(r => `<@&${r}>`).join(", ") : "None"}`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.emojis.title} **__Configuration Usage__**\n` +
            `> ${theme.emojis.star} \`antilink enable\` - Enable protection\n` +
            `> ${theme.emojis.star} \`antilink disable\` - Disable protection\n` +
            `> ${theme.emojis.star} \`antilink wl @role\` - Whitelist a role\n` +
            `> ${theme.emojis.star} \`antilink unwl @role\` - Remove role from whitelist`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> ${theme.emojis.title} *__Need more assistance? Join our support community below__*`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setLabel("Support")
                .setStyle(ButtonStyle.Link)
                .setURL(config.supportServer)
            )
        );

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (option === "status") {
      const isEnabled = settings.antiLink === 1;
      const whitelist = settings.whitelistedRoles || [];
      return message.reply({
        components: [createResponse('info', 'Anti-Link Status',
          `**State:** ${isEnabled ? "Enabled" : "Disabled"}\n` +
          `**Whitelist:** ${whitelist.length > 0 ? whitelist.map(r => `<@&${r}>`).join(", ") : "None"}`
        )],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (["on", "off", "enable", "disable"].includes(option)) {
      const isEnabled = (option === "on" || option === "enable") ? 1 : 0;
      await client.saveSettings(message.guild.id, "antiLink", isEnabled);

      return message.reply({
        components: [createResponse('success', 'Success', `Anti-Link Protection is now **${isEnabled ? "Enabled" : "Disabled"}**`)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (["whitelist", "unwhitelist", "wl", "unwl"].includes(option)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) {
        return message.reply({
          components: [createResponse('error', 'Invalid Role', 'Please mention a role or provide a valid Role ID.')],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const whitelist = settings.whitelistedRoles || [];
      const isWhitelisting = (option === "whitelist" || option === "wl");

      if (isWhitelisting) {
        if (whitelist.includes(role.id)) {
          return message.reply({
            components: [createResponse('info', 'Warning', `Role <@&${role.id}> is already whitelisted.`)],
            flags: MessageFlags.IsComponentsV2
          });
        }
        whitelist.push(role.id);
      } else {
        if (!whitelist.includes(role.id)) {
          return message.reply({
            components: [createResponse('info', 'Warning', `Role <@&${role.id}> is not in the whitelist.`)],
            flags: MessageFlags.IsComponentsV2
          });
        }
        whitelist.splice(whitelist.indexOf(role.id), 1);
      }

      await client.saveSettings(message.guild.id, "whitelistedRoles", whitelist);

      return message.reply({
        components: [createResponse('success', 'Success', `Role <@&${role.id}> has been ${isWhitelisting ? "added to" : "removed from"} the whitelist.`)],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
