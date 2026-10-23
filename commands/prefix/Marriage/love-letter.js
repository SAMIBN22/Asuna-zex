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
  name: 'love-letter',
  aliases: ['loveletter', 'letter', 'writeLetter'],
  description: 'Send a beautiful love letter to your partner via DM.',
  async execute(message, args) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFDA4AF)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`##  Not Married\nYou must be married to send a love letter!\nUse \`-marry @user\` to propose.`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    if (!args.length) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFDA4AF)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  __How to Write a Love Letter__\n\n` +
                `**Usage:** \`-love-letter <your message>\`\n\n` +
                `**Example:**\n` +
                `\`-love-letter Every moment with you feels like a dream I never want to wake up from.\`\n\n` +
                `>  *Max 500 characters. Your letter will be sent to your partner's DMs.*`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const letterText = args.join(' ');
    if (letterText.length > 500) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFDA4AF)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `##  Letter Too Long\nYour letter must be **500 characters or less**.\nCurrent: \`${letterText.length}\` characters.`
              )
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const timestamp = Math.floor(Date.now() / 1000);

    const dmContainer = new ContainerBuilder()
      .setAccentColor(0xFDA4AF)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __You Received a Love Letter!__\n\n` +
              `*From your beloved:* **${message.author.username}**\n` +
              `*Sent at:* <t:${timestamp}:f>`
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
          `*"${letterText}"*`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `>  *Written with love, sealed with a kiss.*`
        )
      );

    let sent = false;
    try {
      await partner.send({ components: [dmContainer], flags: [MessageFlags.IsComponentsV2] });
      sent = true;
    } catch {}

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(0xFDA4AF)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `##  __Letter Sent!__\n\n` +
              `Your love letter was sent to **${partner.username}**.\n\n` +
              (sent
                ? ` *They received it in their DMs.*`
                : ` *Their DMs are closed. Letter could not be delivered.*`)
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(partner.displayAvatarURL({ size: 256 }))
          )
      );

    message.channel.send({ components: [confirmContainer], flags: [MessageFlags.IsComponentsV2] });
  }
};
