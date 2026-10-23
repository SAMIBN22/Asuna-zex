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
const VOWS_PATH = './db/marriage-vows.json';

const loadMarriageData = () => {
  if (fs.existsSync(MARRIAGE_PATH)) {
    try { return JSON.parse(fs.readFileSync(MARRIAGE_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

const loadVows = () => {
  if (fs.existsSync(VOWS_PATH)) {
    try { return JSON.parse(fs.readFileSync(VOWS_PATH, 'utf-8')); } catch { return {}; }
  }
  return {};
};

const saveVows = (data) => fs.writeFileSync(VOWS_PATH, JSON.stringify(data, null, 2));

export default {
  name: 'marriage-vow',
  aliases: ['vow', 'set-vow', 'myvow'],
  description: 'Write or view your personal marriage vow to your partner.',
  async execute(message, args) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xC084FC)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`##  Not Married\nYou must be married to write a vow!\nUse \`-marry @user\` to propose.`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    const vows = loadVows();

    if (!args.length) {
      const myVow = vows[message.author.id];
      const partnerVow = vows[marriage.partner];

      const container = new ContainerBuilder()
        .setAccentColor(0xC084FC)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  __Marriage Vows__\n\n` +
                `**Your vow to ${partner?.username || 'your partner'}:**\n` +
                (myVow ? `> *"${myVow}"*` : `> *No vow written yet. Use \`-vow <your vow>\` to write one.*`) +
                `\n\n**${partner?.username || 'Partner'}'s vow to you:**\n` +
                (partnerVow ? `> *"${partnerVow}"*` : `> *They haven't written a vow yet.*`)
              )
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(partner ? partner.displayAvatarURL({ size: 256 }) : message.author.displayAvatarURL({ size: 256 }))
            )
        );

      return message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    }

    const vow = args.join(' ');
    if (vow.length > 200) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xC084FC)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`##  Too Long\nYour vow must be **200 characters or less**.\nCurrent: \`${vow.length}\` characters.`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    vows[message.author.id] = vow;
    saveVows(vows);

    const container = new ContainerBuilder()
      .setAccentColor(0xC084FC)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Vow Saved!__\n\n` +
              `Your vow to **${partner?.username || 'your partner'}**:\n\n` +
              `> *"${vow}"*\n\n` +
              ` *Beautiful words, beautifully meant.*`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(partner ? partner.displayAvatarURL({ size: 256 }) : message.author.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> Use \`-vow\` (no text) to view both vows.`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
