import { resolveMember } from '../../../lib/resolveUser.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder
} from "discord.js";
import GuildConfig from "../../../models/clanConfig.js";
import config from "../../../config/clanConfig.js";

const urlRegex = /(https?:\/\/[^\s]+)/g;
const inviteRegex = /\b((?:www\.)?[a-z0-9-]+\.(?:gg|com|net|org|io|me|tv|co|be|ly|to|gl|gd|app|dev|us|uk|ca|info|biz|click|page|site|online|live|stream|fun|link|xyz)\b(?:\/[^\s]*)?)/gi;

export default {
  name: "dmclan",
  category: 'Clan',
  aliases: ["dm-clan"],
  description: "Send a direct message to all members, co-leaders, and leaders of your clan.",
  cooldown: 5000,

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

    const replyWithContainer = (header, content) => {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(header, content)],
        allowedMentions: { repliedUser: false }
      });
    };

    const handleError = (errorMessage) => {
      return replyWithContainer(`${theme.clouds} Clan DM`, errorMessage);
    };

    if (!guild) {
      return handleError(`> ${theme.dot} *This command cannot be used in DMs*\n> ${theme.dot} *Please use it in a server*`);
    }

    const userId = member.id;
    const clan = await GuildConfig.findOne({
      guildId: guild.id,
      $or: [{ leaders: userId }, { coLeaders: userId }]
    });

    if (!clan) {
      return handleError(`> ${theme.dot} *You are not a leader or co-leader of any clan*\n> ${theme.dot} *You need clan permissions to send DMs*`);
    }

    const dmMessage = args.join(" ");
    if (!dmMessage) {
      return handleError(`> ${theme.dot} *Please provide a message to send*\n> ${theme.dot} *Usage: \`${config.prefix}dm-clan your message here\`*`);
    }

    const urlMatch = dmMessage.match(urlRegex);
    const inviteMatch = dmMessage.match(inviteRegex);
    if (urlMatch || inviteMatch) {
      return handleError(`> ${theme.dot} *Links are not allowed in clan DMs*\n> ${theme.dot} *Only plain text messages can be sent (no server invites, YouTube links, or any other links)*`);
    }

    const recipients = [
      ...new Set([...(clan.members || []), ...(clan.coLeaders || []), ...(clan.leaders || [])])
    ];
    let sentCount = 0;

    for (const memberId of recipients) {
      const member = await resolveMember(message, memberId);
      if (member && member.user && !member.user.bot) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${theme.clouds} __Clan Notification__\n` +
              `> ${theme.dot} **Clan :** ${clan.name}\n` +
              `> ${theme.dot} **From :** ${message.author.tag}\n\n` +
              `${theme.arrow} *${dmMessage}*`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder());
        await member.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        sentCount++;
      }
    }

    const successMessage = `> ${theme.yes} Message sent to ${sentCount} member(s)\n> ${theme.dot} *DM broadcast completed*`;

    return replyWithContainer(`${theme.clouds} Clan DM`, successMessage);
  }
};