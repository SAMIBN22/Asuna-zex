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

const DATE_IDEAS = [
  { emoji: '', title: 'Pizza Movie Night', desc: 'Order your favorite pizza and binge-watch a movie series together under cozy blankets.' },
  { emoji: '', title: 'Stargazing Night', desc: 'Lay outside under the stars, make wishes, and talk about your dreams together.' },
  { emoji: '', title: 'Gaming Tournament', desc: 'Challenge each other to your favorite games — loser does the dishes!' },
  { emoji: '', title: 'Cook Together', desc: 'Pick a new recipe and cook a meal from scratch — the messier the better!' },
  { emoji: '', title: 'Midnight Walk', desc: 'Take a long peaceful walk together, no phones, just conversation and fresh air.' },
  { emoji: '', title: 'Art Date', desc: 'Paint portraits of each other — no talent required, just laughter.' },
  { emoji: '', title: 'Book Club Night', desc: 'Read the same book then discuss it over hot chocolate.' },
  { emoji: '', title: 'Sunrise Watch', desc: 'Wake up early and watch the sunrise together with coffee in hand.' },
  { emoji: '', title: 'Living Room Dance', desc: 'Clear the furniture, put on your favorite songs, and dance like no one is watching.' },
  { emoji: '', title: 'Film Festival', desc: 'Each pick 2 movies you love and have a mini home film festival together.' },
  { emoji: '', title: 'Baking Night', desc: 'Bake cupcakes or cookies together and decorate them however you want!' },
  { emoji: '', title: 'Beach/Park Picnic', desc: 'Pack a basket and spend a relaxing day outdoors, just the two of you.' },
];

export default {
  name: 'date-night',
  aliases: ['datenight', 'date-idea', 'ourdate'],
  description: 'Get a random romantic date night idea for you and your partner.',
  async execute(message) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFF6B6B)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Not Married\nYou need a partner to plan a date with!\nUse \`-marry @user\` to propose.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const idea = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)];

    const container = new ContainerBuilder()
      .setAccentColor(0xFF6B6B)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${idea.emoji} __Tonight's Date Night!__\n\n` +
              `${message.author}  ${partner}\n\n` +
              `**${idea.emoji} ${idea.title}**\n\n` +
              `${idea.desc}`
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
          `>  *Not feeling this idea? Use \`-date-night\` again for another suggestion!*\n` +
          `>  *Every date is a new memory — make it count.*`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
