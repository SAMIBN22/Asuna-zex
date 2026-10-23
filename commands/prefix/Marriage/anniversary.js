import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from 'discord.js'
import fs from 'fs'
const MARRIAGE_PATH = './marriages.json';

const loadMarriageData = () => {
  if (fs.existsSync(MARRIAGE_PATH)) {
    try { return JSON.parse(fs.readFileSync(MARRIAGE_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

export default {
  name: 'anniversary',
  aliases: ['anni', 'married-since'],
  description: 'View your marriage anniversary and how long you\'ve been together.',
  async execute(message) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xE91E8C)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Not Married\nYou are not currently married.\nUse \`-marry @user\` to propose!`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xE91E8C)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`##  Error\nCould not find your partner's data.`))
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const now = Date.now();
    const marriedAt = marriage.date;
    const diff = now - marriedAt;

    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    const durationParts = [];
    if (years > 0) durationParts.push(`**${years}** year${years > 1 ? 's' : ''}`);
    if (months > 0) durationParts.push(`**${months}** month${months > 1 ? 's' : ''}`);
    if (days > 0) durationParts.push(`**${days}** day${days > 1 ? 's' : ''}`);
    if (durationParts.length === 0) durationParts.push('**Less than a day**');

    const timestamp = Math.floor(marriedAt / 1000);
    const medal = years >= 1 ? '' : months >= 6 ? '' : months >= 1 ? '' : '';

    const container = new ContainerBuilder()
      .setAccentColor(0xE91E8C)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Marriage Anniversary__\n\n` +
              `${message.author}  ${partner}\n\n` +
              ` **Married on:** <t:${timestamp}:D>\n` +
              ` **Married for:** ${durationParts.join(', ')}\n` +
              ` **Relative:** <t:${timestamp}:R>\n\n` +
              `${medal} **Total days together: __${totalDays}__ days**`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(partner.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          years >= 1
            ? ` *A full year together — your love has stood the test of time!*`
            : months >= 1
            ? ` *Month by month, your love grows stronger. Keep going!*`
            : ` *Every great love story starts with a single day. Yours has begun!*`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
