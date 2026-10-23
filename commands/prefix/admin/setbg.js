import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionsBitField
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cardsConfigPath = path.join(__dirname, '../../config/cards-config.json');
const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function getConfig() {
  try { return JSON.parse(fs.readFileSync(cardsConfigPath, 'utf8')); }
  catch { return { profileBg: '', rankBg: '' }; }
}

function saveConfig(data) {
  fs.writeFileSync(cardsConfigPath, JSON.stringify(data, null, 2));
}

export default {
  name: 'setbg',
  description: 'Set background image for profile (-p) or rank (-r) cards',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xED4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(' You need **Administrator** permission to use this command.'))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!args.length) {
      const cfg = getConfig();
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('##  __Card Background Settings__'))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              '**Usage:**\n' +
              '```\n-setbg profile <image_url>\n-setbg rank <image_url>\n-setbg clear profile\n-setbg clear rank\n```\n' +
              '**Current Settings:**\n' +
              ` Profile BG: ${cfg.profileBg ? `[set](${cfg.profileBg})` : ' Not set (using gradient)'}\n` +
              ` Rank BG: ${cfg.rankBg ? `[set](${cfg.rankBg})` : ' Not set (using gradient)'}`
            ))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const type = args[0].toLowerCase();
    const cfg  = getConfig();

    if (type === 'clear') {
      const which = (args[1] || '').toLowerCase();
      if (which === 'profile') {
        cfg.profileBg = '';
        saveConfig(cfg);
        return message.reply({
          components: [
            new ContainerBuilder().setAccentColor(0x57F287)
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(' Profile card background cleared — will use gradient now.'))
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      if (which === 'rank') {
        cfg.rankBg = '';
        saveConfig(cfg);
        return message.reply({
          components: [
            new ContainerBuilder().setAccentColor(0x57F287)
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(' Rank card background cleared — will use gradient now.'))
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return message.reply('Usage: `-setbg clear profile` or `-setbg clear rank`');
    }

    const url = args[1];
    if (!url || !/^https?:\/\/.+/i.test(url)) {
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xED4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(' Please provide a valid image URL.\n**Usage:** `-setbg profile <url>` or `-setbg rank <url>`'))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (type === 'profile') {
      cfg.profileBg = url;
      saveConfig(cfg);
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(` Profile card background updated!\n> ${url}`))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (type === 'rank') {
      cfg.rankBg = url;
      saveConfig(cfg);
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(` Rank card background updated!\n> ${url}`))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    return message.reply('Unknown type. Use `profile` or `rank`.');
  }
};
