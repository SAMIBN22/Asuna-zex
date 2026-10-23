import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import emojis from '../../emojis.js';
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
  name: "kick",
  aliases: ["kickuser", "removeuser"],
  description: "Kick a user from the server",
  category: "Admin",
  usage: "+kick <user_id/mention> [reason]",

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const theme = await client.themeManager.getTheme(guildId);
    const emojis = theme.emojis;
    const themeColor = client.themeManager.getRGBColor(theme.color);

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                `> ${emojis.star || ''} **__You need the Kick Members permission__**\n` +
                `> ${emojis.star || ''} **__to use this command correctly.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }


    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                `> ${emojis.star || ''} **__I need the Kick Members permission__**\n` +
                `> ${emojis.star || ''} **__to perform this action in this server.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    if (!targetId) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __How To Use__\n\n` +
                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}kick <@user> [reason]\`\n` +
                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}kick ${message.author.id} Disrespect\``
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const targetMember = await resolveMember(message, args[0]);
    if (!targetMember) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Member Not Found__\n\n` +
                `> ${emojis.star || ''} **__Could not find that member.__**\n` +
                `> ${emojis.star || ''} **__They may not be in this server.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (targetId === message.author.id || targetId === message.guild.ownerId) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Target Error__\n\n` +
                `> ${emojis.star || ''} **__You cannot kick yourself__**\n` +
                `> ${emojis.star || ''} **__or the server owner.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                `> ${emojis.star || ''} **__You cannot kick someone with a__**\n` +
                `> ${emojis.star || ''} **__higher or equal role than yours.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                `> ${emojis.star || ''} **__I cannot kick this member because__**\n` +
                `> ${emojis.star || ''} **__their role is higher or equal to mine.__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    try {
      const dmContainer = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.lock} __Kicked Status__\n\n` +
                `> ${emojis.star || ''} **__Server:__** **${message.guild.name}**\n` +
                `> ${emojis.star || ''} **__Reason:__** **${reason}**\n\n` +
                `> ${emojis.clouds} *If you believe this was an error, please contact administrators.*`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
            )
        );
      await targetMember.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
    } catch (e) {

    }

    try {
      await targetMember.kick(reason);
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${emojis.yes || ''} __Kick Success__\n\n` +
                `> ${emojis.star || ''} **__Successfully kicked <@${targetId}>__**\n` +
                `> ${emojis.star || ''} **__Reason: ${reason}__**`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
            )
        );

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error('[Kick Command Error]:', error);
      const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${emojis.info || ''} __Kick Error__\n\n` +
                `> ${emojis.star || ''} **__Failed to kick user:__**\n` +
                `> ${emojis.star || ''} **__${error.message}__**`
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
