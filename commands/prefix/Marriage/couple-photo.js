import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
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
  name: 'couple-photo',
  aliases: ['couplephoto', 'ourphoto', 'couple'],
  description: 'Show a beautiful couple card with both partner avatars.',
  async execute(message) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xF472B6)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Not Married\nYou need to be married to show a couple photo!\nUse \`-marry @user\` to propose.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const timestamp = Math.floor(marriage.date / 1000);
    const days = Math.floor((Date.now() - marriage.date) / (1000 * 60 * 60 * 24));

    const container = new ContainerBuilder()
      .setAccentColor(0xF472B6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `##  __Couple Card__\n*Together and forever* `
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              ` **${message.author.username}**\n` +
              `*The one who proposed* `
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              ` **${partner.username}**\n` +
              `*The one who said yes* `
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
          ` **Married since:** <t:${timestamp}:D>\n` +
          ` **Together for:** \`${days}\` day${days !== 1 ? 's' : ''}\n\n` +
          `> *"Two hearts, one soul, endless love."* `
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
