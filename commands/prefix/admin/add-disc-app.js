import fs from 'fs'
import path from 'path'
import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'add-disc-app',
  aliases: ['-add-disc-app'],
  description: 'Add a description for the +app command (admin only)',
  usage: '-add-disc-app',
  category: 'Admin',
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Permission Denied\nYou need Administrator permission to use this command.')
        );
      return message.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
    }

    const promptContainer = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(' Please reply with the description you want to set for the +app command. (You have 60 seconds)')
      );
    await message.reply({ components: [promptContainer], flags: [MessageFlags.IsComponentsV2] });

    const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id;
    try {
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const desc = collected.first().content;

      const filePath = path.join(__dirname, '../../db/app-descriptions.json');
      let data = { app: '', selfrole: '' };
      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      data.app = desc;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      const successContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(' Description for +app has been set!')
        );
      await message.reply({ components: [successContainer], flags: [MessageFlags.IsComponentsV2] });
    } catch (err) {
      const timeoutContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(' No description received. Command cancelled.')
        );
      await message.reply({ components: [timeoutContainer], flags: [MessageFlags.IsComponentsV2] });
    }
  }
}; 