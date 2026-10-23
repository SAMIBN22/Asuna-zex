import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js'

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

async function safeReply(message, opts) {
  try { return await message.reply(opts); } catch (e) { if (e.code !== 10008) throw e; }
}

export default {
  name: 'muteall',
  aliases: ['mute-all', 'servermuteall', 'mutevoice'],
  description: 'Server mute everyone in your current voice channel.',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers) &&
          !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Permission Denied\n You need \`Mute Members\` or \`Administrator\` to use this command.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers)) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Bot Permission Error\n I need \`Mute Members\` permission to do this.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Not In Voice\n You need to be in a voice channel to use this command.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const prompt = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `#  Mute All — Choose an Option\n\n` +
                `** Channel:** ${voiceChannel.name}\n` +
                `** Members:** ${voiceChannel.members.size - 1}\n\n` +
                `**${message.guild.name}**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))
            )
        )
        .addSeparatorComponents(sep())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `>  **Mute Now** — Mute everyone currently in the voice channel.\n` +
            `>  **Auto-Mute** — Mute anyone who joins the voice channel automatically.`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('muteall_now')
              .setLabel('Mute Now')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('muteall_auto')
              .setLabel('Auto-Mute on Join')
              .setStyle(ButtonStyle.Primary)
          )
        );

      return safeReply(message, {
        components: [prompt],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[MUTEALL]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n An error occurred. Please try again.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
