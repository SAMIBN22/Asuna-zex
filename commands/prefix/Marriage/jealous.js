import { resolveUser } from '../../../lib/resolveUser.js';
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

const JEALOUS_MSGS = [
  `They're **MINE** and everyone better know it! `,
  `Back off! We're married and I'm not sharing! `,
  `*stares intensely* That's MY partner you're talking to. `,
  `Excuse me? Do you see this ring? They're taken! `,
  `*protectively holds partner's hand* Mine. End of discussion. `,
  `Oh you thought? No no no, they belong to ME. `,
  `I'm not jealous, I'm just protective. Okay maybe a little jealous. `,
  `My love radar went off. Who's getting too close to my partner? `,
];

export default {
  name: 'jealous',
  aliases: ['jelly', 'possessive'],
  description: 'Express jealousy when someone gets too close to your partner.',
  async execute(message, args) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFF4500)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Not Married\nYou need a partner to be jealous about!\nUse \`-marry @user\` to propose.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    const rival = await resolveUser(message, args[0], client);
    const jealousMsg = JEALOUS_MSGS[Math.floor(Math.random() * JEALOUS_MSGS.length)];

    const container = new ContainerBuilder()
      .setAccentColor(0xFF4500)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Jealousy Activated!__\n\n` +
              `${message.author} is getting jealous over ${partner}!\n\n` +
              (rival ? `*Looking at ${rival}...*\n\n` : '') +
              jealousMsg
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `>  *Married couples protect what's theirs.*\n` +
          `> *It's not jealousy — it's love in overdrive!*`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
