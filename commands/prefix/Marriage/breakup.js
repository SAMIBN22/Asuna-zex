import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
const saveMarriageData = (data) => fs.writeFileSync(MARRIAGE_PATH, JSON.stringify(data, null, 2));

export default {
  name: 'breakup',
  aliases: ['separate', 'trial-divorce'],
  description: 'Request a mutual divorce confirmation before ending the marriage.',
  async execute(message) {
    const marriageData = loadMarriageData();
    const marriage = marriageData[message.author.id];

    if (!marriage) {
      return message.channel.send({
        components: [
          new ContainerBuilder()
            .setAccentColor(0x6B7280)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`##  Not Married\nYou are not currently married.`)
            )
        ],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const partner = await message.client.users.fetch(marriage.partner).catch(() => null);
    if (!partner) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`breakup_confirm_${message.author.id}_${marriage.partner}`)
        .setLabel('Confirm Breakup')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`breakup_cancel_${message.author.id}`)
        .setLabel('Stay Together')
        .setStyle(ButtonStyle.Success)
    );

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(0x6B7280)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `##  __Breakup Confirmation__\n\n` +
          `Are you sure you want to end your marriage with **${partner.username}**?\n\n` +
          `*This is different from \`-divorce\` — it requires mutual confirmation.*`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`>  *Think carefully before ending something beautiful.*`)
      )
      .addActionRowComponents(row);

    const msg = await message.channel.send({ components: [confirmContainer], flags: [MessageFlags.IsComponentsV2] });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'This is not your decision to make.', flags: 64 });
      }

      if (interaction.customId.startsWith('breakup_cancel_')) {
        await interaction.update({
          components: [
            new ContainerBuilder()
              .setAccentColor(0x22C55E)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `##  __Staying Together!__\n\nYou chose to stay with **${partner.username}**.\n*Love wins! *`
                )
              )
          ],
          flags: [MessageFlags.IsComponentsV2]
        });
        collector.stop();
      } else if (interaction.customId.startsWith('breakup_confirm_')) {
        const data = loadMarriageData();
        delete data[message.author.id];
        delete data[marriage.partner];
        saveMarriageData(data);

        await interaction.update({
          components: [
            new ContainerBuilder()
              .setAccentColor(0xEF4444)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `##  __Marriage Ended__\n\nYou and **${partner.username}** are no longer married.\n*Sometimes love fades — that's okay. *`
                )
              )
          ],
          flags: [MessageFlags.IsComponentsV2]
        });

        try {
          await partner.send({
            components: [
              new ContainerBuilder()
                .setAccentColor(0xEF4444)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `##  __Marriage Ended__\n\n**${message.author.username}** has ended your marriage.\n*Take care of yourself. *`
                  )
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
          });
        } catch {}
        collector.stop();
      }
    });
  }
};
