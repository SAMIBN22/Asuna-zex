import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  MessageFlags
} from "discord.js";

import ClanConfig from "../../../models/clanConfig.js"; 
import GuildSetup from "../../../models/clanGuildSetup.js";
import config from "../../../config/clanConfig.js";

export default {
  name: "giveclan",
  category: 'Clan',
  aliases: ['give-clan', 'transfer'],
  description: "Transfer clan leadership to another member.",
  cooldown: 10,
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

    if (!guild) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.dot} *This command cannot be used in DMs*\n> ${theme.dot} *Please use it in a server*`);
    }

    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *The clan system is not set up yet*\n> ${theme.dot} *Please configure the system first*`);
    }

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      leaders: member.id
    });

    if (!clan) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.dot} *You must be a clan leader to transfer leadership*\n> ${theme.dot} *Only leaders can transfer clan ownership*`);
    }

    const userIdOrMention = args[0];
    if (!userIdOrMention) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.dot} *Please provide a user to transfer leadership to*\n> ${theme.dot} *Usage: \`${config.prefix}giveclan @user\`*`);
    }

    let targetMember;
    const mentionMatch = userIdOrMention.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      targetMember = await resolveMember(message, args[0]);
    } else {
      targetMember = await resolveMember(message, args[0]);
    }
    
    if (!targetMember) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.no} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`);
    }

    if (targetMember.id === member.id) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.info} *You cannot transfer leadership to yourself*\n> ${theme.dot} *Please choose a different member*`);
    }

    if (!clan.members.includes(targetMember.id) && !clan.coLeaders.includes(targetMember.id)) {
      return replyWithContainer(`${theme.clouds} Transfer Clan`, `> ${theme.info} *This member is not in your clan*\n> ${theme.dot} *They must be a clan member to receive leadership*`);
    }

    const bannerImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: images.banner },
        title: `${theme.dot} Transfer Clan Leadership`,
        subtitle: "Are you sure you want to transfer?"
      }
    ]);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} Transfer Clan Leadership__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(bannerImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Confirmation Required__**\n` +
              `> ${theme.dot} *Are you sure you want to transfer **${clan.name}** leadership to ${targetMember.user.tag}?*\n` +
              `> ${theme.info} *This action cannot be undone*\n` +
              `> ${theme.warning} *You will lose leader permissions*`
            )
          )
          .setThumbnailAccessory(userThumbnail)
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('transfer_confirm')
        .setLabel('Confirm Transfer')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('transfer_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const transferMessage = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container, row],
      allowedMentions: { repliedUser: false }
    });

    const collector = transferMessage.createMessageComponentCollector({
      max: 1,
      time: 30000,
      filter: i => i.user.id === member.id
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      if (interaction.customId === 'transfer_confirm') {
        clan.leaders = [targetMember.id];
        if (clan.coLeaders.includes(targetMember.id)) {
          clan.coLeaders = clan.coLeaders.filter(id => id !== targetMember.id);
        }
        clan.coLeaders.push(member.id);
        await clan.save();

        const successContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.clouds} Success__\n\n` +
                  `> ${theme.yes} *Leadership transferred to ${targetMember.user.tag}*\n` +
                  `> ${theme.dot} *You are now a co-leader of **${clan.name}***`
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
                  `> ${theme.info} *Transfer cancelled*\n` +
                  `> ${theme.dot} *You remain the leader of **${clan.name}***`
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
      transferMessage.delete();
    });

    collector.on('end', collected => {
      if (!collected.size) transferMessage.delete();
    });
  }
};