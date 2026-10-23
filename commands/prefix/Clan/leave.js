import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags
} from "discord.js";

import GuildSetup from '../../../models/clanGuildSetup.js'; 
import ClanConfig from '../../../models/clanConfig.js';
import config from "../../../config/clanConfig.js"; 

export default {
  name: "leave",
  category: 'Clan',
  description: "Leave your clan.",
  cooldown: 5,
  async execute(message, args, client) {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

    const userThumbnail = new ThumbnailBuilder()
      .setURL(member.user.displayAvatarURL({ extension: "png", size: 512 }))
      .setDescription(`${member.user.username}'s Avatar`);

    const buildContainer = (header, content) => {
      return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
            )
            .setThumbnailAccessory(userThumbnail)
        );
    };

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *The clan system is not set up yet*\n> ${theme.dot} *Please configure the system first*`);
    }

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      $or: [
        { leaders: member.id },
        { coLeaders: member.id },
        { members: member.id }
      ]
    });

    if (!clan) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.info} *You are not in any clan*\n> ${theme.dot} *Join a clan first to use this command*`);
    }

    const bannerImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: images.banner },
        title: `${theme.dot} Leave Clan Confirmation`,
        subtitle: "Are you sure you want to leave?"
      }
    ]);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} Leave Clan__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(bannerImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Confirmation Required__**\n` +
              `> ${theme.dot} *Are you sure you want to leave **${clan.name}**?*\n` +
              `> ${theme.info} *This action cannot be undone*`
            )
          )
          .setThumbnailAccessory(userThumbnail)
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('leave_confirm')
        .setLabel('Confirm Leave')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('leave_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const leaveMessage = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container, row],
      allowedMentions: { repliedUser: false }
    });

    const collector = leaveMessage.createMessageComponentCollector({
      max: 1,
      time: 30000,
      filter: i => i.user.id === member.id
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      if (interaction.customId === 'leave_confirm') {
        clan.members = clan.members.filter(id => id !== member.id);
        clan.leaders = clan.leaders.filter(id => id !== member.id);
        clan.coLeaders = clan.coLeaders.filter(id => id !== member.id);
        await clan.save();
        const role = guild.roles.cache.get(clan.roleId);
        if (role) await member.roles.remove(role);

        const successContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.clouds} Success__\n\n` +
                  `> ${theme.yes} *You have left **${clan.name}***\n` +
                  `> ${theme.dot} *You are no longer a member of this clan*`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );
        await message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [successContainer],
          allowedMentions: { repliedUser: false }
        });
      } else {
        const cancelContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.clouds} Info__\n\n` +
                  `> ${theme.info} *Leave action cancelled*\n` +
                  `> ${theme.dot} *You are still a member of **${clan.name}***`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );
        await message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [cancelContainer],
          allowedMentions: { repliedUser: false }
        });
      }
      leaveMessage.delete();
    });

    collector.on('end', collected => {
      if (!collected.size) leaveMessage.delete();
    });
  }
};
