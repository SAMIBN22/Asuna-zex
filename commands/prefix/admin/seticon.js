import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';

export default {
  name: "seticon",
  aliases: ["roleicon", "setroleicon"],
  description: "Set a role icon from a custom emoji",
  category: "Admin",
  usage: "+seticon <@role> <emoji>",

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const theme = await client.themeManager.getTheme(guildId);
    const emojis = theme.emojis;
    const themeColor = client.themeManager.getRGBColor(theme.color);

    // Permission check (user)
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                `> ${emojis.star || ''} **__You need the Manage Roles permission__**\n` +
                `> ${emojis.star || ''} **__to use this command correctly.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // Permission check (bot)
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                `> ${emojis.star || ''} **__I need the Manage Roles permission__**\n` +
                `> ${emojis.star || ''} **__to perform this action in this server.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    const emojiArg = args[1];

    if (!role || !emojiArg) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __How To Use__\n\n` +
                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}seticon <@role> <emoji>\`\n` +
                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}seticon @Music \``
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // Validate Hierarchy
    if (role.position >= message.guild.members.me.roles.highest.position) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                `> ${emojis.star || ''} **__I cannot modify this role because__**\n` +
                `> ${emojis.star || ''} **__it is higher or equal to my highest role.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                `> ${emojis.star || ''} **__You cannot modify this role because__**\n` +
                `> ${emojis.star || ''} **__it is higher or equal to your highest role.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const match = emojiArg.match(/<a?:([\w]+):(\d+)>/);
    if (!match) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Invalid Emoji__\n\n` +
                `> ${emojis.star || ''} **__Please provide a valid custom emoji.__**\n` +
                `> ${emojis.star || ''} **__Nitro-style or server emojis work best.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const isAnimated = emojiArg.startsWith('<a:');
    if (isAnimated) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Type Error__\n\n` +
                `> ${emojis.star || ''} **__Role icons do not support__**\n` +
                `> ${emojis.star || ''} **__animated emojis (GIFs).__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const emojiUrl = `https://cdn.discordapp.com/emojis/${match[2]}.png`;

    try {
      await role.setIcon(emojiUrl);
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${emojis.yes || ''} __Icon Updated__\n\n` +
                `> ${emojis.star || ''} **__Successfully updated the icon__**\n` +
                `> ${emojis.star || ''} **__for the <@&${role.id}> role.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(emojiUrl)
            )
        );

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error('[SetBotIcon Error]:', error);
      const isBoostError = error.code === 50101;
      const errorText = isBoostError
        ? `> ${emojis.star || ''} **__Role icons require Server Boost Level 2.__**\n` +
          `> ${emojis.star || ''} **__This server does not have enough boosts.__**`
        : `> ${emojis.star || ''} **__Failed to set role icon:__**\n` +
          `> ${emojis.star || ''} **__${error.message}__**`;
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Update Failed__\n\n` +
                errorText
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
