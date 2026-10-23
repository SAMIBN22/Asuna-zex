import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js'

async function safeReply(message, opts) {
  try { return await message.reply(opts); } catch (e) { if (e.code !== 10008) throw e; }
}

export default {
  name: 'roleicon',
  aliases: ['ricon', 'role-icon', 'seticon'],
  description: 'Set role icon (requires Boost Level 2+).',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
          !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Permission Denied\n You need \`Manage Roles\` or \`Administrator\` to use this command.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (message.guild.premiumTier < 2) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder()
                .setContent(
                  `# Server Not Boosted\nThis feature requires:\n` +
                  `⤷ Server Boost Level **2** or higher\n\n` +
                  `**Current Level:** ${message.guild.premiumTier}\n` +
                  `**Boosts:** ${message.guild.premiumSubscriptionCount ?? 0}\n\n` +
                  `Role icons are a premium feature that requires server boosts.\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true }) || message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (args.length < 2) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder()
                .setContent(
                  `# Role Icon Help\n\n` +
                  `**Usage:** \`-roleicon [role] [emoji]\`\n\n` +
                  `**Examples:**\n` +
                  `- \`-roleicon @VIP \`\n` +
                  `- \`-roleicon VIP \`\n\n` +
                  `**Note:** Requires Server Boost Level 2+\n\n` +
                  `**Aliases:** roleicon, ricon, role-icon, seticon\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const emojiInput = args[args.length - 1];
      const roleArgs = args.slice(0, args.length - 1);

      const role = message.mentions.roles.first() ||
        message.guild.roles.cache.get(roleArgs[0]) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase() === roleArgs.join(' ').toLowerCase());

      if (!role) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Not Found\n Could not find the role. Try mentioning it, providing its ID, or its exact name.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Too High\n I cannot modify a role higher than or equal to my highest role.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const unicodeEmojiRegex = /\p{Emoji}/u;
      const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);

      let iconValue;
      if (customEmojiMatch) {
        iconValue = `https://cdn.discordapp.com/emojis/${customEmojiMatch[2]}.${emojiInput.startsWith('<a:') ? 'gif' : 'png'}`;
      } else if (unicodeEmojiRegex.test(emojiInput)) {
        iconValue = emojiInput;
      } else {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Invalid Emoji\n Please provide a valid emoji (unicode or custom server emoji).\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      await role.setIcon(iconValue, `Icon set by ${message.author.tag}`);

      return safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(
                `#  Role Icon Updated\n\n` +
                `** Role:** <@&${role.id}> (${role.name})\n` +
                `** New Icon:** ${emojiInput}\n` +
                `**By:** ${message.author}\n\n` +
                `**${message.guild.name}**`
              ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[ROLEICON]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n Failed to set role icon. Make sure the emoji is valid and I have the required permissions.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
