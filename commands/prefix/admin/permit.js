import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
  OverwriteType,
  MessageFlags
} from 'discord.js'

async function safeReply(message, opts) {
  try { return await message.reply(opts); } catch (e) { if (e.code !== 10008) throw e; }
}

export default {
  name: 'permit',
  aliases: ['allowspeak', 'unmutechannel', 'permitspeak'],
  description: 'Allow a specific member to speak in the current channel.',
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
                  `# Permit Help\n\n` +
                  `**Usage:** \`-permit @user\`\n\n` +
                  `**Description:**\nAllows a specific member to speak/send messages in the current channel by adding a permission override.\n\n` +
                  `**Aliases:** permit, allowspeak, permitspeak\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      let target = await resolveMember(message, args[0]);
      if (!target && args[0] && /^\d+$/.test(args[0]))
        target = await resolveMember(message, args[0]);

      if (!target) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# User Not Found\n Please mention a valid user or provide their ID.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const channel = message.channel;

      await channel.permissionOverwrites.edit(target, {
        SendMessages: true,
        Speak: true,
        Connect: true
      }, { reason: `Permitted by ${message.author.tag}` });

      return safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(
                `#  Member Permitted\n\n` +
                `** User:** ${target} | \`${target.id}\`\n` +
                `** Channel:** ${channel}\n` +
                `** Allowed:** Send Messages, Speak, Connect\n` +
                `**By:** ${message.author}\n\n` +
                `**${message.guild.name}**`
              ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ dynamic: true }))))],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[PERMIT]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n An error occurred. Please check my permissions.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
