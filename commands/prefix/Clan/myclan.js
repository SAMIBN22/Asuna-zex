import { 
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags
} from 'discord.js';

import ClanConfig from "../../../models/clanConfig.js"; 
import GuildSetup from '../../../models/clanGuildSetup.js'; 
import config from "../../../config/clanConfig.js"; 

export default {
  name: 'myclan',
  category: 'Clan',
  description: 'Display your clan information',
  cooldown: 3,
  async execute(message, args, client) {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

    const clan = await ClanConfig.findOne({ 
      guildId: guild.id, 
      $or: [
        { leaders: member.id },
        { coLeaders: member.id },
        { members: member.id }
      ]
    });

    if (!clan) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# __${theme.clouds} My Clan__\n\n> ${theme.info} *You are not in any clan*\n> ${theme.dot} *Join a clan first to use this command*`)
              )
          )
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const clanThumbnail = new ThumbnailBuilder()
      .setURL(clan.avatar && clan.avatar.startsWith('http') ? clan.avatar : member.user.displayAvatarURL({ extension: "png", size: 512 }))
      .setDescription(`${clan.name} Icon`);

    const buildContainer = (header, content) => {
      let clanColor = 0xEBC210;
      if (clan.color && clan.color.startsWith('#')) {
        try {
          clanColor = parseInt(clan.color.replace('#', ''), 16);
        } catch (e) {
          clanColor = 0xEBC210;
        }
      }
      return new ContainerBuilder()
        .setAccentColor(clanColor)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
            )
            .setThumbnailAccessory(clanThumbnail)
        );
    };

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    const roleMention = clan.roleId ? `<@&${clan.roleId}>` : 'Not Set';
    const textChannelMention = clan.channels?.text ? `<#${clan.channels.text}>` : 'Not Set';
    const voiceChannelMention = clan.channels?.voice ? `<#${clan.channels.voice}>` : 'Not Set';

    const leaders = (clan.leaders || []).map(id => `<@${id}>`).join(', ');
    const coLeaders = (clan.coLeaders?.length > 0) 
        ? clan.coLeaders.map(id => `<@${id}>`).join(', ') 
        : 'None';

    const allMembersSet = new Set([
      ...(clan.leaders || []),
      ...(clan.coLeaders || []),
      ...(clan.members || [])
    ]);
    const membersCount = allMembersSet.size;

    const bannerImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: (clan.banner && clan.banner.startsWith('http')) ? clan.banner : images.banner },
        title: `${theme.dot} ${clan.name} Information`,
        subtitle: "Your Clan Details"
      }
    ]);

    let clanColor = 0xEBC210;
    if (clan.color && clan.color.startsWith('#')) {
      try {
        clanColor = parseInt(clan.color.replace('#', ''), 16);
      } catch (e) {
        clanColor = 0xEBC210;
      }
    }
    const container = new ContainerBuilder()
      .setAccentColor(clanColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} ${clan.name}__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(bannerImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Clan Information__**\n` +
              `> ${theme.arrow} **Name:** ${clan.name}\n` +
              `> ${theme.arrow} **ID:** \`${clan.clanId}\`\n` +
              `> ${theme.arrow} **Role:** ${roleMention}\n` +
              `> ${theme.arrow} **Text Channel:** ${textChannelMention}\n` +
              `> ${theme.arrow} **Voice Channel:** ${voiceChannelMention}\n` +
              `> ${theme.arrow} **Total Members:** ${membersCount}\n`
            )
          )
          .setThumbnailAccessory(clanThumbnail)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${theme.star} **__Leadership__**\n` +
          `> ${theme.dot} **Leaders:** ${leaders}\n` +
          `> ${theme.dot} **Co-Leaders:** ${coLeaders}`
        )
      );

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });
  }
};
