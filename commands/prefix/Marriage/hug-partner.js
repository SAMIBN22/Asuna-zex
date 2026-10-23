import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js'
import fs from 'fs'
const MARRIAGE_PATH = './marriages.json';

const loadMarriageData = () => {
  if (fs.existsSync(MARRIAGE_PATH)) {
    try { return JSON.parse(fs.readFileSync(MARRIAGE_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

const HUG_GIFS = [
  'https://media1.tenor.com/m/BbRLnrjJRgwAAAAC/anime-hug.gif',
  'https://media1.tenor.com/m/Od3HkBHRgHAAAAAC/anime-couple.gif',
  'https://media1.tenor.com/m/u7P_BkXGMkQAAAAC/anime-hug.gif',
  'https://media1.tenor.com/m/lh8FGA-hkRYAAAAC/yor-anya.gif',
  'https://media1.tenor.com/m/NtCcqJdpAfkAAAAC/oshi-no-ko-aqua.gif',
];

const HUG_MSGS = [
  `wraps their arms around you and holds tight `,
  `sneaks up and gives you the biggest surprise hug! `,
  `pulls you close and refuses to let go `,
  `hugs you so warmly your heart melts `,
  `gives you a long, soft, loving hug `,
];

const cooldowns = new Map();

export default {
  name: 'hug-partner',
  aliases: ['hugpartner', 'wifehug', 'husbhug'],
  description: 'Send a warm romantic hug to your partner with an anime GIF.',
  async execute(message) {
    if (cooldowns.has(message.author.id)) return message.react('');
    cooldowns.set(message.author.id, true);
    setTimeout(() => cooldowns.delete(message.author.id), 10000);

    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFAD0C4)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Not Married\nYou need a partner to hug!\nUse \`-marry @user\` to propose.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const gif = HUG_GIFS[Math.floor(Math.random() * HUG_GIFS.length)];
    const msg = HUG_MSGS[Math.floor(Math.random() * HUG_MSGS.length)];

    const container = new ContainerBuilder()
      .setAccentColor(0xFAD0C4)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Hug Time!__\n\n` +
              `${message.author} ${msg}\n\n` +
              `**For:** ${partner} `
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(partner.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(gif).setDescription('Couple hug')
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `>  *The best hugs are the ones that never want to end.*`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
