import { resolveMember } from '../../../lib/resolveUser.js';
import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags, 
  ButtonStyle, 
  ButtonBuilder, 
  ActionRowBuilder,
  SectionBuilder,
  ThumbnailBuilder
} from "discord.js";

import ClanConfig from "../../../models/clanConfig.js"; 
import GuildSetup from "../../../models/clanGuildSetup.js";
import Logger from "../../../utils/clanLogger.js";
import config from "../../../config/clanConfig.js"; 

export default {
  name: "add",
  category: 'Clan',
  aliases: ["useradd", "adduser"],
  description: "Add a member to your clan",
  cooldown: 5,
  async execute(message, args, client) {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    
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

    const sendToUser = async (header, content, chatFallback = null) => {
      const fallbackContent = chatFallback || content;
      const fallbackContainer = buildContainer(header, fallbackContent);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [fallbackContainer],
        allowedMentions: { repliedUser: false }
      });
    };

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    const handleError = async (errorMessage, chatMessage = null) => {
      return await sendToUser(`${theme.clouds} Clan Invite`, errorMessage, chatMessage);
    };


    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return await handleError(
        `> ${theme.dot} *The clan system has not been set up yet*\n> ${theme.dot} *Please configure the system first*`,
        `> ${theme.dot} *System not configured*\n> ${theme.dot} *Contact an admin to set up clans*`
      );
    }

    const clan = await ClanConfig.findOne({
      guildId: guild.id,
      $or: [{ leaders: member.id }, { coLeaders: member.id }],
    });

    if (!clan) {
      return await handleError(
        `> ${theme.dot} *You are not a leader or co-leader of any clan*\n> ${theme.dot} *You need clan permissions to invite members*`,
        `> ${theme.dot} *No clan permissions*\n> ${theme.dot} *Join a clan first*`
      );
    }

    const userArg = args[0];
    if (!userArg) {
      return await handleError(
        `> ${theme.dot} *Please provide a valid user*\n> ${theme.dot} *Usage: \`${config.prefix}add @member\` or \`${config.prefix}add userID\`*`,
        `> ${theme.dot} *Missing user argument*\n> ${theme.dot} *Usage: \`${config.prefix}add @user\`*`
      );
    }

    let targetMember;
    const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        targetMember = await resolveMember(message, args[0]);
      } else {
        
      }
    
    if (!targetMember) {
      return await handleError(
        `> ${theme.dot} *Could not find the member*\n> ${theme.dot} *Please check the user mention or ID*`,
        `> ${theme.dot} *User not found*\n> ${theme.dot} *Check the user mention*`
      );
    }

    if ([...clan.members, ...clan.leaders, ...clan.coLeaders].includes(targetMember.id)) {
      return await handleError(
        `> ${theme.dot} *This member is already in your clan*\n> ${theme.dot} *They're already part of the team*`,
        `> ${theme.dot} *Already in clan*\n> ${theme.dot} *Member is already part of your team*`
      );
    }


    const dmInviteContent = 
      `# __${theme.clouds} Clan Invite__\n\n` +
      `> ${theme.dot} ${member} has invited you to join **${clan.name}**\n` +
      `> ${theme.dot} please accept or decline the invitation below`;

    const chatInviteContent = 
      `# __${theme.clouds} Clan Invite__\n\n` +
      `> ${theme.dot} ${member} invited ${targetMember} to **${clan.name}**\n` +
      `> ${theme.dot} ${targetMember} please accept or decline below`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('acceptInvite')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('denyInvite')
        .setLabel('Decline')
        .setStyle(ButtonStyle.Secondary)
    );

    const inviteContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(dmInviteContent)
      );

    const chatContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(chatInviteContent)
      );

    let inviteMessage;
    try {
      inviteMessage = await targetMember.send({ 
        flags: MessageFlags.IsComponentsV2,
        components: [inviteContainer, row]
      });
      await message.react(theme.yes);
    } catch (error) {
      inviteMessage = await message.channel.send({ 
        flags: MessageFlags.IsComponentsV2,
        components: [chatContainer, row]
      });
      await message.react(theme.yes);
    }

    const collector = inviteMessage.createMessageComponentCollector({
      time: 30000,
      max: 1,
      filter: i => i.user.id === targetMember.id,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.channel.type !== 1) {
        await interaction.deferUpdate();
      }
      
      if (interaction.customId === 'acceptInvite') {
        clan.members.push(targetMember.id);
        await clan.save();
        const role = guild.roles.cache.get(clan.roleId);
        if (role) {
          await targetMember.roles.add(role);
        }

        const userThumbnail = new ThumbnailBuilder()
          .setURL(targetMember.user.displayAvatarURL({ extension: "png", size: 512 }))
          .setDescription(`${targetMember.user.username} Avatar`);

        const accepted = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.title} Welcome__\n\n` +
                  `> ${theme.arrow} You're now part of our amazing team\n` +
                  `> ${theme.arrow} Enjoy your time in **${clan.name}**`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );

        if (interaction.channel.type === 1) {
          await interaction.reply({ components: [accepted], flags: MessageFlags.IsComponentsV2 });
        } else {
          await interaction.editReply({ components: [accepted] });
        }
        
        const logger = new Logger(client);
        await logger.logMemberAdded(guild.id, member, targetMember, clan.name);
      } else if (interaction.customId === 'denyInvite') {
        const declined = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# __${theme.clouds} Info__\n\n` +
              `> ${theme.info} ${targetMember} declined the invitation`
            )
          );

        if (interaction.channel.type === 1) {
          await interaction.reply({ components: [declined], flags: MessageFlags.IsComponentsV2 });
        } else {
          await interaction.editReply({ components: [declined] });
        }
      }
      
      if (interaction.channel.type !== 1) {
        await inviteMessage.delete();
      }
    });

     collector.on('end', async collected => {
       if (!collected.size) {
         const expired = new ContainerBuilder()
           .setAccentColor(0xFF0000)
           .addTextDisplayComponents(
             new TextDisplayBuilder().setContent(
               `# __${theme.clouds} Info__\n\n` +
               `> ${theme.info} The invitation has expired`
             )
           );
         await message.channel.send({ components: [expired] });
         setTimeout(() => inviteMessage.delete(), 5000);
       }
     });
  }
};