import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  SectionBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  ThumbnailBuilder, 
  MessageFlags, 
  PermissionFlagsBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ComponentType 
} from 'discord.js'
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

// Gradient colors (from light blue to dark blue)
const gradientColors = [
  0x00E1FF, // Light blue (#00E1FF)
  0x00BFFF, // Deep sky blue
  0x1E90FF, // Dodger blue
  0x4169E1, // Royal blue
  0x0000FF, // Blue
  0x00008B  // Dark blue (#00008B)
];

export default {
  name: 'tellelonim',
  description: 'Show anonymous message interface',
  async execute(message, args) {
    try {
      // Check if user has admin permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Permission Denied\nYou need Administrator permission to use this command!`)
          );

        return message.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      // Load settings to check if enabled
      const settings = await loadSettings();
      const guildSettings = settings[message.guild.id] || {};

      if (!guildSettings.enabled) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Anonymous Messaging Disabled\nAnonymous messaging is currently disabled! Use +start-tel to enable it.`)
          );

        return message.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      // Create the button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('send_anonymous')
            .setLabel('Send Anonymous Message')
            .setStyle(ButtonStyle.Primary)
        );

      // Function to create container with fixed red color
      const createContainer = () => {
        const container = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`# Anonymous Message System\nWrite your anonymous message below\n` +
                              `Click the button to open a text field and send your message.\n` +
                              `Your identity will only be visible to administrators in the logs.`)
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder()
                  .setURL(message.guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
              )
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
          )
          .addActionRowComponents(row);

        return container;
      };

      // Send the initial interface message
      await message.channel.send({
        components: [createContainer()],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (error) {
      console.error('Interface Error:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Error\nAn error occurred while setting up the interface!`)
        );

      await message.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
    }
  },
  async interactionHandler(interaction, client) {
    if (!interaction.isButton() || interaction.customId !== 'send_anonymous') return;

    // Create modal for anonymous message input
    const modal = new ModalBuilder()
      .setCustomId('anonymous_message_modal')
      .setTitle('Send Anonymous Message')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('anonymous_message_input')
            .setLabel('Your Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter your anonymous message here...')
            .setRequired(true)
            .setMaxLength(2000)
        )
      );

    // Show the modal
    await interaction.showModal(modal);
  },
  async modalHandler(interaction, client) {
    if (!interaction.isModalSubmit() || interaction.customId !== 'anonymous_message_modal') return;

    const messageContent = interaction.fields.getTextInputValue('anonymous_message_input');
    const settings = await loadSettings();
    const guildSettings = settings[interaction.guild.id] || {};

    if (!guildSettings.enabled || !guildSettings.channelId) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Error\nAnonymous messaging is disabled or no channel is configured!`)
        );

      return interaction.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2], flags: [64] });
    }

    try {
      // Send anonymous message to the configured channel
      const targetChannel = interaction.guild.channels.cache.get(guildSettings.channelId);
      if (!targetChannel) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Error\nThe configured channel for anonymous messages was not found!`)
          );

        return interaction.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2], flags: [64] });
      }

      const anonymousContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Anonymous Message\n${messageContent}`)
        );

      await targetChannel.send({ components: [anonymousContainer], flags: [MessageFlags.IsComponentsV2] });

      // Log the message with user identity
      const logChannel = interaction.guild.channels.cache.get('1388986967240478780'); // Replace with actual log channel ID
      if (logChannel) {
        const logContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Anonymous Message Log\n` +
                          `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
                          `**Message:** ${messageContent}\n` +
                          `**Channel:** ${targetChannel}\n` +
                          `**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`)
          );

        await logChannel.send({ components: [logContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      // Confirm to user
      const successContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Message Sent\nYour anonymous message has been sent successfully!`)
        );

      await interaction.reply({ components: [successContainer], flags: [MessageFlags.IsComponentsV2], flags: [64] });

    } catch (error) {
      console.error('Anonymous Message Error:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Error\nAn error occurred while sending your anonymous message!`)
        );

      await interaction.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2], flags: [64] });
    }
  }
};