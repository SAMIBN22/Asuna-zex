import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags
} from 'discord.js';

import GuildSetup from "../../../models/clanGuildSetup.js"; 
import ClanConfig from "../../../models/clanConfig.js";
import config from "../../../config/clanConfig.js"; 

export default {
  name: 'create',
  category: 'Clan',
  description: 'Create a new clan with role, text & voice channels',
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

    const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *Server is not setup yet*\n> ${theme.dot} *Please run \`${config.prefix}setup\` first*`);
    }

    const managerRoleId = guildSetup.roles?.manager;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isManager = managerRoleId && member.roles.cache.has(managerRoleId);
    if (!isAdmin && !isManager) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can create clans*`);
    }

    if (!args[0]) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.dot} *Please provide a clan name and owner*\n> ${theme.dot} *Usage: \`${config.prefix}create <clanName> <@user|userID>\`*`);
    }

    if (args.length < 2) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.dot} *Please provide both clan name and owner*\n> ${theme.dot} *Usage: \`${config.prefix}create <clanName> <@user|userID>\`*`);
    }

    const clanName = args[0];
    const ownerArg = args[1];
    
    if (clanName.length > 50) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.dot} *Clan name must be 50 characters or less*\n> ${theme.dot} *Please provide a shorter name*`);
    }

    let ownerMember;
    const mentionMatch = ownerArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      const userId = mentionMatch[1];
      if (/^\d{17,19}$/.test(userId)) {
        ownerMember = guild.members.cache.get(userId);
        if (!ownerMember) {
          try {
            ownerMember = await guild.members.fetch(userId);
          } catch (error) {
            ownerMember = null;
          }
        }
      }
    } else if (/^\d{17,19}$/.test(ownerArg)) {
      ownerMember = guild.members.cache.get(ownerArg);
      if (!ownerMember) {
        try {
          ownerMember = await guild.members.fetch(ownerArg);
        } catch (error) {
          ownerMember = null;
        }
      }
    } else {
      ownerMember = guild.members.cache.get(ownerArg);
    }

    if (!ownerMember) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.no} *User not found*\n> ${theme.dot} *Please provide a valid user mention or ID*`);
    }

    const existingClanByName = await ClanConfig.findOne({
      guildId: guild.id,
      name: clanName
    });

    if (existingClanByName) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.info} *A clan with this name already exists*\n> ${theme.dot} *Please choose a different name*`);
    }

    const existingClanByLeader = await ClanConfig.findOne({
      guildId: guild.id,
      leaders: ownerMember.id
    });

    if (existingClanByLeader) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.no} *User is already a leader of a clan*\n> ${theme.dot} *Each user can only lead one clan*`);
    }

    const textCategory = guild.channels.cache.get(guildSetup.categoryId);
    const voiceCategory = guild.channels.cache.get(guildSetup.categoryVoiceId);
    
    if (!textCategory) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.no} *Text category not found*\n> ${theme.dot} *Please check the server setup*`);
    }
    
    if (!voiceCategory) {
      return replyWithContainer(`${theme.clouds} Clan Creation`, `> ${theme.no} *Voice category not found*\n> ${theme.dot} *Please check the server setup*`);
    }

    const getCategoryRoles = (category) => 
      Array.from(category.permissionOverwrites.cache.values())
        .filter(overwrite => overwrite?.type === 0 && overwrite.id)
        .map(overwrite => guild.roles.cache.get(overwrite.id))
        .filter(role => role?.id);

    const categoryRoles = [...getCategoryRoles(textCategory), ...getCategoryRoles(voiceCategory)];
    const uniqueCategoryRoles = [...new Map(categoryRoles.map(role => [role.id, role])).values()];

    const role = await guild.roles.create({
      name: clanName,
      permissions: []
    });

    const createChannelPermissions = (categoryRoles) => [
      { id: guild.roles.everyone.id, deny: ['Connect'] },
      ...categoryRoles.map(role => ({ id: role.id, deny: ['ViewChannel', 'Connect'] }))
    ];

    const [textChannel, voiceChannel] = await Promise.all([
      guild.channels.create({
        name: `${clanName.toLowerCase().replace(/\s+/g, '-')}`,
        type: 0,
        parent: textCategory.id,
        permissionOverwrites: createChannelPermissions(uniqueCategoryRoles)
      }),
      guild.channels.create({
        name: `${clanName} Voice`,
        type: 2,
        parent: voiceCategory.id,
        permissionOverwrites: createChannelPermissions(uniqueCategoryRoles)
      })
    ]);

    const setupPermissions = async () => {
      const clanPermissions = {
        text: { ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true, AddReactions: true },
        voice: { ViewChannel: true, Connect: true, Speak: true }
      };

      await Promise.all([
        textChannel.permissionOverwrites.create(role, clanPermissions.text),
        voiceChannel.permissionOverwrites.create(role, clanPermissions.voice)
      ]);
    };

    await setupPermissions();

    const generateClanId = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const newClanId = generateClanId();
    
    const clan = new ClanConfig({
      guildId: guild.id,
      clanId: newClanId,
      name: clanName,
      leaders: [ownerMember.id],
      coLeaders: [],
      members: [],
      roleId: role.id,
      channels: { text: textChannel.id, voice: voiceChannel.id },
      createdAt: new Date()
    });

    await Promise.all([clan.save(), ownerMember.roles.add(role)]);

    const bannerImage = new MediaGalleryBuilder().addItems([
      {
        media: { url: images.banner },
        title: `${theme.dot} Clan Created Successfully`,
        subtitle: `${clanName} is now ready`
      }
    ]);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# __${theme.title} Clan Created__`)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(bannerImage)
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.star} **__Clan Details__**\n` +
              `> ${theme.arrow} **Name:** ${clanName}\n` +
              `> ${theme.arrow} **Role:** <@&${role.id}>\n` +
              `> ${theme.arrow} **Text Channel:** <#${textChannel.id}>\n` +
              `> ${theme.arrow} **Voice Channel:** <#${voiceChannel.id}>\n` +
              `> ${theme.arrow} **Leader:** ${ownerMember.user.tag}`
            )
          )
          .setThumbnailAccessory(userThumbnail)
      );

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false }
    });
  }
};