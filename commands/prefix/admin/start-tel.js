import { EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import fs from 'fs/promises';
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings path
const settingsPath = path.join(__dirname, '../../db/anonymous-settings.json');

// Load settings
async function loadSettings() {
  try {
    const data = await fs.readFile(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save settings
async function saveSettings(settings) {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export default {
  name: "start-tel",
  description: "Enable anonymous messaging system",
  async execute(message, args) {
    try {
      // Check if user has admin permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFFFFF')
              .setDescription("You need **Administrator** permission to use this command!")
          ]
        });
      }

      // Enable the system
      const settings = await loadSettings();
      settings[message.guild.id] = {
        enabled: true
      };
      await saveSettings(settings);

      // Send confirmation
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription("Anonymous messaging system has been enabled!")
        ]
      });

    } catch (error) {
      console.error('Error in start-tel command:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription("An error occurred while enabling the system!")
        ]
      });
    }
  }
}; 