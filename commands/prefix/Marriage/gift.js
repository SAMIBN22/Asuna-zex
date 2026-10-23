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
const GIFTS_PATH = './db/marriage-gifts.json';

const loadMarriageData = () => {
  if (fs.existsSync(MARRIAGE_PATH)) {
    try { return JSON.parse(fs.readFileSync(MARRIAGE_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

const loadGifts = () => {
  if (fs.existsSync(GIFTS_PATH)) {
    try { return JSON.parse(fs.readFileSync(GIFTS_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

const saveGifts = (data) => {
  fs.writeFileSync(GIFTS_PATH, JSON.stringify(data, null, 2));
};

const GIFTS = [
  { emoji: '', name: 'Bouquet of Roses', msg: 'A beautiful bouquet of roses, straight from the heart.' },
  { emoji: '', name: 'Diamond Ring', msg: 'A sparkling diamond ring — a symbol of eternal love.' },
  { emoji: '', name: 'Box of Chocolates', msg: 'Sweet chocolates for the sweetest person in your life.' },
  { emoji: '', name: 'Teddy Bear', msg: 'A fluffy teddy bear to hold when you miss them.' },
  { emoji: '', name: 'Single Red Rose', msg: 'One perfect rose, because sometimes less is more.' },
  { emoji: '', name: 'Mystery Gift', msg: 'A wrapped surprise — the best kind of gift!' },
  { emoji: '', name: 'Love Letter', msg: 'Words from the soul, sealed with love.' },
  { emoji: '', name: 'Romantic Candles', msg: 'Candles to set the mood for a perfect evening.' },
  { emoji: '', name: 'Love Song', msg: 'A song dedicated just for you two.' },
  { emoji: '', name: 'A Star', msg: 'A star named after your love — yours forever.' },
];

const cooldowns = new Map();

export default {
  name: 'gift',
  aliases: ['send-gift', 'givegift'],
  description: 'Send a romantic gift to your partner.',
  async execute(message, args) {
    if (cooldowns.has(message.author.id)) {
      return message.react('');
    }
    cooldowns.set(message.author.id, true);
    setTimeout(() => cooldowns.delete(message.author.id), 30000);

    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFF85A1)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`##  Not Married\nYou need to be married to send a gift!\nUse \`-marry @user\` to propose.`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const gift = GIFTS[Math.floor(Math.random() * GIFTS.length)];

    const giftsData = loadGifts();
    if (!giftsData[marriage.partner]) giftsData[marriage.partner] = [];
    giftsData[marriage.partner].push({ from: message.author.id, gift: gift.name, date: Date.now() });
    saveGifts(giftsData);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF85A1)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${gift.emoji} __Gift Sent!__\n\n` +
              `${message.author} sent **${partner}** a gift!\n\n` +
              `**${gift.emoji} ${gift.name}**\n` +
              `*"${gift.msg}"*`
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
          ` *A notification has been sent to your partner's DMs.*\n` +
          `> Use \`-gift\` again in **30 seconds** to send another gift.`
        )
      );

    await message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });

    try {
      const dmContainer = new ContainerBuilder()
        .setAccentColor(0xFF85A1)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${gift.emoji} __You Received a Gift!__\n\n` +
                `Your partner **${message.author.tag}** sent you:\n\n` +
                `**${gift.emoji} ${gift.name}**\n` +
                `*"${gift.msg}"*`
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 256 }))
            )
        );
      await partner.send({ components: [dmContainer], flags: [MessageFlags.IsComponentsV2] });
    } catch {}
  }
};
