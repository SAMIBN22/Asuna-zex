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
  name: "antibot",
  aliases: ["antibots", "botprotection", "blockbots", "botfilter"],
  description: "Enable or disable the AntiBot system to prevent bot spam",
  category: "Security",
  usage: "+antibot <enable/disable>",
  examples: [
    "+antibot enable",
    "+antibot disable",
    "+antibot status"
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

    if (!option || !["on", "off", "enable", "disable", "status"].includes(option)) {
      const isEnabled = settings.antiBot === 1;
      const status = isEnabled ? 'Enabled' : 'Disabled';

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Bot Protection__`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} **__Current Status__**\n` +
                `> ${theme.emojis.star} **State:** \`${status}\`\n\n` +
                `## ${theme.emojis.title} **__Configuration Usage__**\n` +
                `> ${theme.emojis.star} \`antibot enable\` - Enable protection\n` +
                `> ${theme.emojis.star} \`antibot disable\` - Disable protection`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
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
      const isEnabled = settings.antiBot === 1;
      return message.reply({
        components: [createResponse('info', 'Anti-Bot Status', `Protection is currently **${isEnabled ? "Enabled" : "Disabled"}**`)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const isEnabled = (option === "on" || option === "enable") ? 1 : 0;
    await client.saveSettings(message.guild.id, "antiBot", isEnabled);

    return message.reply({
      components: [createResponse('success', 'Success', `Anti-Bot Protection is now **${isEnabled ? "Enabled" : "Disabled"}**`)],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
