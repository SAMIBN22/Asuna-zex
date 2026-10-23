import {
  ContainerBuilder,
  TextDisplayBuilder,
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
  name: 'couple-rank',
  aliases: ['couplerank', 'top-couples', 'topcouples'],
  description: 'Show the top 10 couples ranked by marriage duration.',
  async execute(message) {
    const marriageData = loadMarriageData();
    const seen = new Set();
    const couples = [];

    for (const [userId, data] of Object.entries(marriageData)) {
      const pairKey = [userId, data.partner].sort().join('-');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      couples.push({ user1: userId, user2: data.partner, date: data.date });
    }

    if (couples.length === 0) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFFB347)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  No Couples Yet\nNo one is married in this bot yet!\nBe the first — use \`-marry @user\`.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    couples.sort((a, b) => a.date - b.date);
    const top10 = couples.slice(0, 10);

    const medals = ['', '', '', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', ''];
    const now = Date.now();

    let board = '';
    let rank = 0;
    for (const couple of top10) {
      const days = Math.floor((now - couple.date) / (1000 * 60 * 60 * 24));
      const u1 = await message.client.users.fetch(couple.user1).catch(() => null);
      const u2 = await message.client.users.fetch(couple.user2).catch(() => null);
      if (!u1 || !u2) continue;
      board += `${medals[rank]} **${u1.username}**  **${u2.username}** — \`${days}\` day${days !== 1 ? 's' : ''}\n`;
      rank++;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xFFB347)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`##  __Top Couples Leaderboard__\n*Ranked by time married together*`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(board || '*No valid couple data found.*')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          ` **Total couples:** \`${couples.length}\`\n` +
          `> Use \`-marry @user\` to start your love story!`
        )
      );

    message.channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
};
