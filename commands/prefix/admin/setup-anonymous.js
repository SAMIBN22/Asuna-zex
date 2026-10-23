import { EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import fs from 'fs/promises';
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store channel settings
const settingsPath = path.join(__dirname, '../../db/anonymous-settings.json');

// Ensure settings file exists
async function ensureSettingsFile() {
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify({}));
  }
}

// Load settings
async function loadSettings() {
  await ensureSettingsFile();
  const data = await fs.readFile(settingsPath, 'utf8');
  return JSON.parse(data);
}

// Save settings
async function saveSettings(settings) {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export default {
  name: "anon-setup",
  aliases: ["setup-anon", "anonymous-setup"],
  description: "Setup anonymous message system",
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

      // Create logs category if it doesn't exist
      let logsCategory = message.guild.channels.cache.find(c => 
        c.type === 4 && c.name.toLowerCase() === 'logs'
      );

      if (!logsCategory) {
        logsCategory = await message.guild.channels.create({
          name: 'LOGS',
          type: 4
        });
      }

      // Create anonymous-logs channel if it doesn't exist
      let logsChannel = message.guild.channels.cache.find(c => 
        c.name === 'anonymous-logs' && 
        c.parentId === logsCategory.id
      );

      if (!logsChannel) {
        logsChannel = await message.guild.channels.create({
          name: 'anonymous-logs',
          type: 0,
          parent: logsCategory,
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: message.guild.members.me.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            },
            {
              id: message.member.id,
              allow: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });
      }

      // Save settings
      const settings = await loadSettings();
      settings[message.guild.id] = {
        enabled: true,
        logsChannelId: logsChannel.id
      };
      await saveSettings(settings);

      // Send confirmation
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(`Setup complete!\n• Logs Channel: ${logsChannel}\n\nUse \`+tellelonim\` to show the anonymous message interface.`)
        ]
      });

    } catch (error) {
      console.error('Setup Error:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription("An error occurred while setting up the system!")
        ]
      });
    }
  }
}; 