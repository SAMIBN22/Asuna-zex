import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  PermissionsBitField
} from 'discord.js';
import ClanConfig from '../../../models/clanConfig.js';
import config from '../../../config/clanConfig.js';

export default {
  name: "clans",
  aliases: ["clanslist", "listclans"],
  description: "Display all clans in the server with member count and top role",
  category: 'Clan',
  cooldown: 5,
  usage: "&clans",
  permissions: ["ManageGuild"],
  async execute(message) {
    try {
      // Permission check: Only those with Manage Guild or Administrator
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(" You do not have permission to use this command. (Requires Manage Guild)");
      }

      const clans = await ClanConfig.find({ guildId: message.guild.id });

      if (!clans || clans.length === 0) {
        const emptyContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(item => item.setURL("https://i.pinimg.com/originals/51/e4/2d/51e42d52a141365ed1d55580f3b1c60f.gif"))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("#  __No Clans Found__\n\nNo clans have been created yet.")
          );
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [emptyContainer] });
      }

      const clansList = clans.map((clan, index) => {
          const leaderMention = clan.leaders && clan.leaders.length > 0 ? `<@${clan.leaders[0]}>` : "None";
          const memberCount = (clan.leaders?.length || 0) + (clan.coLeaders?.length || 0) + (clan.members?.length || 0);
          
          // Determine the top role (roleId)
          let topRoleMention = "None";
          if (clan.roleId && clan.roleId !== "none") {
            topRoleMention = `<@&${clan.roleId}>`;
          }

          const avatarText = clan.avatar && clan.avatar.startsWith('http') ? ` [Avatar](${clan.avatar})` : "";
          
          return `${index + 1}. **${clan.name}** (ID: ${clan.clanId})${avatarText}\n` +
                 ` Leader: ${leaderMention}\n` +
                 ` Members: \`${memberCount}\`\n` +
                 ` Main Role: ${topRoleMention}`;
      }).join('\n\n');

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(item => item.setURL("https://i.pinimg.com/originals/51/e4/2d/51e42d52a141365ed1d55580f3b1c60f.gif"))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`#  __Server Clans__\nTotal: ${clans.length}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(clansList)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("clans_home")
              .setLabel("Home")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          )
        );

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [] }
      });
    } catch (error) {
      console.error("Error in clans command:", error);
      return message.reply("An error occurred while fetching the clans list.");
    }
  }
};
