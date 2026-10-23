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
  name: 'permitall',
  aliases: ['allowrole', 'permitspeakrole', 'permitrole'],
  description: 'Allow a specific role to speak in the current channel.',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) &&
          !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Permission Denied\n You need \`Manage Channels\` or \`Administrator\` to use this command.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (!args.length) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder()
                .setContent(
                  `# Permit All Help\n\n` +
                  `**Usage:** \`-permitall @role\`\n\n` +
                  `**Description:**\nAllows a specific role to speak/send messages in the current channel by adding a permission override.\n\n` +
                  `**Aliases:** permitall, allowrole, permitrole\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const roleArg = args[0];
      let role = message.mentions.roles.first() ||
        message.guild.roles.cache.get(roleArg) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());

      if (!role) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Not Found\n Please mention a role, provide its ID, or type its name.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const channel = message.channel;

      await channel.permissionOverwrites.edit(role, {
        SendMessages: true,
        Speak: true,
        Connect: true
      }, { reason: `Role permitted by ${message.author.tag}` });

      return safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(
                `#  Role Permitted\n\n` +
                `** Role:** <@&${role.id}> | \`${role.id}\`\n` +
                `** Channel:** ${channel}\n` +
                `** Allowed:** Send Messages, Speak, Connect\n` +
                `**By:** ${message.author}\n\n` +
                `**${message.guild.name}**`
              ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[PERMITALL]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n An error occurred. Please check my permissions.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
