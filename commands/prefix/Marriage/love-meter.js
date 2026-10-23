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

function calcLove(id1, id2) {
  const combined = (BigInt(id1) + BigInt(id2)).toString();
  let hash = 0;
  for (const ch of combined) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return 60 + (Math.abs(hash) % 41);
}

function buildBar(pct) {
  const filled = Math.round(pct / 10);
  return ''.repeat(filled) + ''.repeat(10 - filled);
}

export default {
  name: 'love-meter',
  aliases: ['lovemeter', 'lm'],
  description: 'Show love compatibility meter with your partner.',
  async execute(message, args) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    let target;
    if (args[0]) {
      target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    } else if (marriage) {
      target = await message.client.users.fetch(marriage.partner).catch(() => null);
    }

    if (!target) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFF6B9D)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  No Target\nYou are not married and didn't mention anyone!\nUse \`-love-meter @user\` or get married first.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const pct = calcLove(message.author.id, target.id);
    const bar = buildBar(pct);
    const label = pct >= 90 ? ' Soulmates!' : pct >= 75 ? ' Deep Love' : pct >= 60 ? ' Strong Bond' : ' Growing Love';
    const married = marriage && marriage.partner === target.id;

    const container = new ContainerBuilder()
      .setAccentColor(0xFF6B9D)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Love Meter__\n` +
              `*Measuring the love between souls...*\n\n` +
              `${message.author}  ${target}\n\n` +
              `${bar}\n\n` +
              `**Love Score: __${pct}%__ — ${label}**` +
              (married ? `\n\n>  *You two are officially married — forever bound!*` : '')
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          pct >= 90
            ? ` *Your bond is unbreakable. The universe brought you two together.*`
            : pct >= 75
            ? ` *You have something truly special. Cherish every moment together.*`
            : ` *Love grows stronger with time. Keep nurturing your connection.*`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
