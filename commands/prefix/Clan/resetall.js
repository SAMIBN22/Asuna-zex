import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js';

import GuildSetup from '../../../models/clanGuildSetup.js'; 
import ClanConfig from '../../../models/clanConfig.js'; 

export default {
  name: 'reset',
  category: 'Clan',
  aliases: ['resetall'],
  description: 'Reset the bot setup and all clans for this server',
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

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You need administrator permissions to use this command*\n> ${theme.dot} *Only admins can reset the bot*`);
    }

    const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      return replyWithContainer(`${theme.clouds} Reset System`, `> ${theme.dot} *Server is not setup yet*\n> ${theme.dot} *Nothing to reset*`);
    }

    const clans = await ClanConfig.find({ guildId: guild.id });
    const clanCount = clans.length;

    const confirmationContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# __${theme.title} Reset Confirmation__\n\n` +
              `> ${theme.dot}**This will permanently delete:**\n` +
              `> *${theme.arrow} All clan roles and channels*\n` +
              `> *${theme.arrow} All clan data (${clanCount} clans)*\n` +
              `> *${theme.arrow} Server setup configuration*` 
            )
          )
          .setThumbnailAccessory(userThumbnail)
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('reset_confirm')
        .setLabel('Yes, Delete Everything')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reset_cancel')
        .setLabel('No, Keep Data')
        .setStyle(ButtonStyle.Secondary)
    );

    const confirmationMessage = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [confirmationContainer, row],
      allowedMentions: { repliedUser: false }
    });

    const collector = confirmationMessage.createMessageComponentCollector({
      time: 30000,
      max: 1,
      filter: i => i.user.id === member.id,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'reset_confirm') {
        await interaction.deferUpdate();
        
        const progressContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.title} Resetting System...__\n\n` +
                  `> ${theme.arrow} Deleting clan roles and channels...\n` +
                  `> ${theme.arrow} Clearing database...\n` +
                  `> ${theme.arrow} Removing setup configuration...`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );

        await interaction.editReply({ components: [progressContainer] });

        let deletedRoles = 0;
        let deletedChannels = 0;

        for (const clan of clans) {
          try {
            const role = guild.roles.cache.get(clan.roleId);
            if (role) {
              await role.delete();
              deletedRoles++;
            }

            const textChannel = guild.channels.cache.get(clan.channels?.text);
            if (textChannel) {
              await textChannel.delete();
              deletedChannels++;
            }

            const voiceChannel = guild.channels.cache.get(clan.channels?.voice);
            if (voiceChannel) {
              await voiceChannel.delete();
              deletedChannels++;
            }
          } catch (error) {
            console.log(`Error deleting clan ${clan.name}:`, error.message);
          }
        }

        await GuildSetup.deleteOne({ guildId: guild.id });
        await ClanConfig.deleteMany({ guildId: guild.id });

        const finalContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# __${theme.title} System Reset Complete__\n\n`
                `> ${theme.arrow} **Roles Deleted:** \`${deletedRoles}\`\n` +
                `> ${theme.arrow} **Channels Deleted:** \`${deletedChannels}\`\n` +
                `> ${theme.arrow} **Clans Removed:** \`${clanCount}\`\n` +
                `> ${theme.arrow} **Database:** \`Cleared\`\n` +
                `> ${theme.arrow} **Status:** \`Complete\``
              )
            )
            .setThumbnailAccessory(userThumbnail)
          );

        await interaction.editReply({ components: [finalContainer] });

      } else if (interaction.customId === 'reset_cancel') {
        await interaction.deferUpdate();
        
        const cancelContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.title} Reset Cancelled__\n\n` +
                  `> ${theme.arrow} *Reset cancelled successfully*\n` +
                  `> ${theme.arrow} *All clan data has been preserved*\n` +
                  `> ${theme.arrow} *Server setup remains intact*\n` +
                  `> ${theme.arrow} *No changes were made*`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );

        await interaction.editReply({ components: [cancelContainer] });
      }
    });

    collector.on('end', async collected => {
      if (!collected.size) {
        const expiredContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# __${theme.title} Reset Timeout__\n\n` +
                  `> ${theme.arrow} *Confirmation expired*\n` +
                  `> ${theme.arrow} *No changes were made* \n` +
                  `> ${theme.arrow} *All data remains safe*`
                )
              )
              .setThumbnailAccessory(userThumbnail)
          );

        await confirmationMessage.edit({ components: [expiredContainer] });
      }
    });
  }
};