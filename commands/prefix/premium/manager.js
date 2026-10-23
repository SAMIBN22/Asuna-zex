import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
  name: "pmanager",
  description: "Manage managers list for your prime room (add, remove, list, clear).",
  category: "Premium",

  async execute(message, args, client) {
    const theme = await client.themeManager.getTheme(message.guild.id);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} __Access Denied__\n` +
                `> ${theme.emojis.star} __You must be in your prime room to manage managers.__`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const setup = await GuildSetup.findOne({ channelId: voiceChannel.id });
    if (!setup) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} __Access Denied__\n` +
                `> ${theme.emojis.star} __This room is not registered as a prime room.__`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (setup.ownerId !== message.author.id) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} __Permission Denied__\n` +
                `> ${theme.emojis.star} __Only the room owner can manage managers.__`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const subCommand = args[0]?.toLowerCase();
    const target = await resolveMember(message, args[0]);

    if (!subCommand || !["add", "remove", "list", "clear"].includes(subCommand)) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${theme.emojis.title} __Manager Command__\n` +
                `> ${theme.emojis.star} __Usage:__\n` +
                `> ${theme.emojis.star} \`pmanager add @user\` - Add a manager\n` +
                `> ${theme.emojis.star} \`pmanager remove @user\` - Remove a manager\n` +
                `> ${theme.emojis.star} \`pmanager list\` - Show current managers\n` +
                `> ${theme.emojis.star} \`pmanager clear\` - Clear all managers\n\n`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    setup.managers = Array.isArray(setup.managers) ? setup.managers : [];

    if (subCommand === "add") {
      if (!target) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## ${theme.emojis.title} __Error Occurred__\n` +
                  `> ${theme.emojis.star} __Please mention a valid user to add as manager.__`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (setup.managers.includes(target.id)) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.info} __Info__\n` +
                  `> ${theme.emojis.star} <@${target.id}> is already a manager.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      setup.managers.push(target.id);
      await setup.save();

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.emojis.yes} __Success__\n` +
            `> ${theme.emojis.star} __<@${target.id}> has been added as a manager.__`
          )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subCommand === "remove") {
      if (!target) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.title} __Error__\n` +
                  `> ${theme.emojis.star} Please mention a valid user to remove.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (!setup.managers.includes(target.id)) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.info} __Info__\n` +
                  `> ${theme.emojis.star} <@${target.id}> is not a manager.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      setup.managers = setup.managers.filter(id => id !== target.id);
      await setup.save();

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.emojis.yes} __Success__\n` +
            `> ${theme.emojis.star} __<@${target.id}> has been removed from managers.__`
          )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subCommand === "list") {
      const list = setup.managers.length
        ? setup.managers.map(id => `<@${id}>`).join("\n")
        : `> ${theme.emojis.star} No managers set.`;

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Managers List__\n> ${theme.emojis.star} ${list}`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subCommand === "clear") {
      if (setup.managers.length === 0) {
        const container = new ContainerBuilder()
          .setAccentColor(theme.color)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# ${theme.emojis.info} __Info__\n` +
                  `> ${theme.emojis.star} No managers to clear.`
                )
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
              )
          );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      setup.managers = [];
      await setup.save();

      const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.emojis.yes} __Success__\n` +
            `> ${theme.emojis.star} __All managers have been removed.__`
          )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
