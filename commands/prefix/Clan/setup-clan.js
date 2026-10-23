import { 
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SeparatorSpacingSize
} from "discord.js";

import GuildSetup from '../../../models/clanGuildSetup.js';
import config from "../../../config/clanConfig.js"; 
import { enforceClanRoleHierarchy } from '../../../lib/clanRoleHierarchy.js';

export default {
  name: 'setup-clan',
  category: 'Clan',
  description: "Setup server settings (roles, channels, categories, prefix)",
  cooldown: 5,
  permissions: ['Administrator'],
  _activeSessions: new Map(),
  _sessionTimeout: 300000,
  async execute(message, args, client) {
    try {
    const { member, guild } = message;
    const theme = client.clanThemes?.emojis?.main || {};
    const images = client.clanThemes?.images?.main || {};

      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        const container = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${theme.clouds} Permissions\n` +
              `> ${theme.dot} *You need administrator permissions to use this command*\n` +
              `> ${theme.dot} *Only admins can setup the bot*`
            )
          );

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      // Handle traditional prefix command arguments
      if (args[0]) {
        return await this._handleTraditionalSetup(message, args, theme);
      }

      const sessionKey = `${guild.id}-${member.id}`;
      if (this._activeSessions.has(sessionKey)) {
        const existingSession = this._activeSessions.get(sessionKey);
        if (Date.now() - existingSession.timestamp < this._sessionTimeout) {
          const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ${theme.clouds} Active Session Detected\n` +
                `You already have an active setup session. Please complete it first.`
              )
            );

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
          return;
        }
      }

      const settings = await this._loadGuildSettings(guild.id);
      const container = this._buildMainContainer(settings, theme, images, guild);

      const sent = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      this._activeSessions.set(sessionKey, {
        messageId: sent.id,
        timestamp: Date.now(),
        guildId: guild.id,
        userId: member.id
      });

      this._setupEventHandlers(sent, message, settings, theme, images);

    } catch (error) {
      await this._handleCriticalError(message, error);
    }
  },

  async _loadGuildSettings(guildId) {
    try {
      return await GuildSetup.findOne({ guildId });
    } catch (error) {
      console.error(`[Setup] Failed to load settings for guild ${guildId}:`, error);
      return null;
    }
  },

  async _handleTraditionalSetup(message, args, theme) {
    const { guild } = message;
    const subCommand = args[0].toLowerCase();
    const value = args.slice(1).join(' ').trim();

    if (!value) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.clouds} Setup Commands\n` +
            `> ${theme.dot} *Please provide a value*\n` +
            `> ${theme.dot} *Usage: \`${currentPrefix}setup-clan ${subCommand} [value]\`*`
          )
        );

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }

    let guildSetup = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildSetup) {
      guildSetup = new GuildSetup({
        guildId: guild.id,
        prefix: config.prefix,
        roles: {},
        members: []
      });
    }

    const currentPrefix = guildSetup.prefix || config.prefix;

    const buildContainer = (header, content) => {
      return new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
        );
    };

    if (subCommand === "manager") {
      const role = guild.roles.cache.get(value.replace(/[<@&>]/g, ''));
      if (!role) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [buildContainer(`${theme.clouds} Setup Commands`, `> ${theme.no} *Role not found*\n> ${theme.dot} *Please provide a valid role mention or ID*`)]
        });
      }
      guildSetup.roles.manager = role.id;
      await guildSetup.save();
      await enforceClanRoleHierarchy(guild, guildSetup.roles);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(`${theme.clouds} Setup Commands`, `> ${theme.yes} *Manager role set to ${role.name}*\n> ${theme.dot} *Managers can now create and manage clans*`)]
      });
    }


    if (subCommand === "log") {
      const channel = guild.channels.cache.get(value.replace(/[<#>]/g, ''));
      if (!channel || channel.type !== 0) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [buildContainer(`${theme.clouds} Setup Commands`, `> ${theme.no} *Channel not found*\n> ${theme.dot} *Please provide a valid text channel mention or ID*`)]
        });
      }
      guildSetup.logChannelId = channel.id;
      await guildSetup.save();
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildContainer(`${theme.clouds} Setup Commands`, `> ${theme.yes} *Log channel set to ${channel.name}*\n> ${theme.dot} *Bot logs will be sent to this channel*`)]
      });
    }


    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [buildContainer(`${theme.clouds} Setup Commands`, `> ${theme.dot} *Invalid setup command*\n> ${theme.dot} *Usage: \`${currentPrefix}setup-clan [manager|log] [value]\`*`)]
    });
  },

  _buildMainContainer(settings, theme, images, guild) {
    const managerStatus = settings?.roles?.manager ? 
      `<@&${settings.roles.manager}>` : 'Not Configured';
    const chatStatus = settings?.categoryId ? 
      `<#${settings.categoryId}>` : 'Not Configured';
    const logStatus = settings?.logChannelId ? 
      `<#${settings.logChannelId}>` : 'Not Configured';
    const voiceStatus = settings?.categoryVoiceId ? 
      `<#${settings.categoryVoiceId}>` : 'Not Configured';
    const leaderStatus = settings?.roles?.leader ? 
      `<@&${settings.roles.leader}>` : 'Not Configured';
    const coLeaderStatus = settings?.roles?.coLeader ? 
      `<@&${settings.roles.coLeader}>` : 'Not Configured';
    const currentPrefix = settings?.prefix || config.prefix;

    const thumbnail = new ThumbnailBuilder()
      .setURL(images.thumbnail)
      .setDescription('Server Setup Status');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_main_action')
      .setPlaceholder('Select a setting to configure')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('Manager Role')
          .setDescription('Set the role that can manage clans')
          .setValue('manager_role'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Log Channel')
          .setDescription('Set the channel for bot logs')
          .setValue('log_channel'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Voice Category')
          .setDescription('Set the category for voice channels')
          .setValue('voice_category'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Leader Role')
          .setDescription('Set the leader role')
          .setValue('leader_role'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Co-Leader Role')
          .setDescription('Set the co-leader role')
          .setValue('coleader_role'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Chat Category')
          .setDescription('Set the category for chat channels')
          .setValue('chat_category')
      ]);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${theme.clouds} Server Setup`)
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# __${theme.star} Current Configuration__\n\n` +
              `> ${theme.dot} **Manager Role**: ${managerStatus}\n` +
              `> ${theme.dot} **Leader Role**: ${leaderStatus}\n` +
              `> ${theme.dot} **Co-Leader Role**: ${coLeaderStatus}\n` +
              `> ${theme.dot} **Chat Category**: ${chatStatus}\n` +
              `> ${theme.dot} **Voice Category**: ${voiceStatus}\n` +
              `> ${theme.dot} **Log Channel**: ${logStatus}\n` +
              `> ${theme.dot} **Bot Prefix**: \`${currentPrefix}\`\n\n` +
              `Please select a setting to configure:`
            )
          )
          .setThumbnailAccessory(thumbnail)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the reset button to reset all settings`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_reset')
              .setLabel('Reset All')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    return container;
  },

  _setupEventHandlers(sent, message, settings, theme, images) {
    const filter = (interaction) =>
      interaction.user.id === message.author.id &&
      this._isValidInteraction(interaction.customId);

    const collector = sent.createMessageComponentCollector({
      filter,
      time: this._sessionTimeout
    });

    collector.on('collect', async (interaction) => {
      try {
        await this._handleInteraction(interaction, message, settings, theme, images);
      } catch (error) {
        await this._handleInteractionError(interaction, error, theme);
      }
    });

    collector.on('end', async () => {
      await this._handleSessionEnd(sent, theme);
      this._cleanupSession(message.guild.id, message.author.id);
    });
  },

  _isValidInteraction(customId) {
    const validIds = [
      'setup_main_action',
      'setup_role_select',
      'setup_channel_select',
      'setup_category_select',
      'setup_voice_category_select',
      'setup_chat_category_select',
      'setup_reset',
      'setup_back_main'
    ];
    return validIds.includes(customId) ||
      customId.startsWith('setup_role_back_') ||
      customId.startsWith('setup_role_next_') ||
      customId.startsWith('setup_channel_back_') ||
      customId.startsWith('setup_channel_next_') ||
      customId.startsWith('setup_category_back_') ||
      customId.startsWith('setup_category_next_') ||
      customId.startsWith('setup_voice_category_back_') ||
      customId.startsWith('setup_voice_category_next_') ||
      customId.startsWith('setup_chat_category_back_') ||
      customId.startsWith('setup_chat_category_next_');
  },

  async _handleInteraction(interaction, message, settings, theme, images) {
    const { customId } = interaction;

    switch (customId) {
      case 'setup_main_action':
        await this._handleMainAction(interaction, message, settings, theme, images);
        break;
      case 'setup_role_select':
        await this._handleRoleSelection(interaction, message, settings, theme);
        break;
      case 'setup_channel_select':
        await this._handleChannelSelection(interaction, message, settings, theme);
        break;
      case 'setup_category_select':
        await this._handleCategorySelection(interaction, message, settings, theme);
        break;
      case 'setup_voice_category_select':
        await this._handleVoiceCategorySelection(interaction, message, settings, theme);
        break;
      case 'setup_chat_category_select':
        await this._handleChatCategorySelection(interaction, message, settings, theme);
        break;
      case 'setup_reset':
        await this._handleReset(interaction, message, settings, theme);
        break;
      case 'setup_back_main':
        await this._returnToMain(interaction, message, settings, theme, images);
        break;
      default:
        if (customId.startsWith('setup_role_back_') || customId.startsWith('setup_role_next_')) {
          const page = parseInt(customId.split('_').pop());
          const sessionKey = `${message.guild.id}-${message.author.id}`;
          const existingSession = this._activeSessions.get(sessionKey);
          const roleType = existingSession?.currentRoleType || 'manager';
          await this._showRoleSelector(interaction, message, settings, theme, roleType, page);
        } else if (customId.startsWith('setup_channel_back_') || customId.startsWith('setup_channel_next_')) {
          const page = parseInt(customId.split('_').pop());
          await this._showChannelSelector(interaction, message, settings, theme, page);
        } else if (customId.startsWith('setup_category_back_') || customId.startsWith('setup_category_next_')) {
          const page = parseInt(customId.split('_').pop());
          await this._showCategorySelector(interaction, message, settings, theme, page);
        } else if (customId.startsWith('setup_voice_category_back_') || customId.startsWith('setup_voice_category_next_')) {
          const page = parseInt(customId.split('_').pop());
          await this._showVoiceCategorySelector(interaction, message, settings, theme, page);
        } else if (customId.startsWith('setup_chat_category_back_') || customId.startsWith('setup_chat_category_next_')) {
          const page = parseInt(customId.split('_').pop());
          await this._showChatCategorySelector(interaction, message, settings, theme, page);
        }
        break;
    }
  },

  async _handleMainAction(interaction, message, settings, theme, images) {
    const action = interaction.values[0];

    switch (action) {
      case 'manager_role':
        await this._showRoleSelector(interaction, message, settings, theme, 'manager');
        break;
      case 'log_channel':
        await this._showChannelSelector(interaction, message, settings, theme);
        break;
      case 'voice_category':
        await this._showVoiceCategorySelector(interaction, message, settings, theme);
        break;
      case 'leader_role':
        await this._showRoleSelector(interaction, message, settings, theme, 'leader');
        break;
      case 'coleader_role':
        await this._showRoleSelector(interaction, message, settings, theme, 'coleader');
        break;
      case 'chat_category':
        await this._showChatCategorySelector(interaction, message, settings, theme);
        break;
    }
  },

  async _showRoleSelector(interaction, message, settings, theme, roleType = 'manager', page = 0) {
    const sessionKey = `${message.guild.id}-${message.author.id}`;
    const existingSession = this._activeSessions.get(sessionKey);
    this._activeSessions.set(sessionKey, {
      ...(existingSession || {}),
      guildId: message.guild.id,
      userId: message.author.id,
      timestamp: Date.now(),
      currentRoleType: roleType
    });

    const allRoles = message.guild.roles.cache
      .filter(role => !role.managed && role.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(role => ({
        label: role.name,
        value: role.id,
        description: `Position: ${role.position}`
      }));

    const rolesPerPage = 25;
    const totalPages = Math.ceil(allRoles.length / rolesPerPage);
    const startIndex = page * rolesPerPage;
    const endIndex = Math.min(startIndex + rolesPerPage, allRoles.length);
    const roles = allRoles.slice(startIndex, endIndex);

    if (roles.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.no} No Roles Available\n` +
            `No roles found in this server.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_role_select')
      .setPlaceholder(`Select a role... (Page ${page + 1}/${totalPages})`)
      .addOptions(roles);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${theme.star} ${roleType.charAt(0).toUpperCase() + roleType.slice(1)} Role Configuration\n` +
          `Select the ${roleType} role.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${theme.star} **__Available Roles__**`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      );

    if (totalPages > 1) {
      const paginationRow = new ActionRowBuilder();

      if (page > 0) {
        paginationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`setup_role_back_${page - 1}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (page < totalPages - 1) {
        paginationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`setup_role_next_${page + 1}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      container.addActionRowComponents(paginationRow);
    }

    container.addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _showChannelSelector(interaction, message, settings, theme, page = 0) {
    const allChannels = message.guild.channels.cache
      .filter(channel => channel.type === 0)
      .sort((a, b) => a.position - b.position)
      .map(channel => ({
        label: `#${channel.name}`,
        value: channel.id,
        description: `Category: ${channel.parent?.name || 'No Category'}`
      }));

    const channelsPerPage = 25;
    const totalPages = Math.ceil(allChannels.length / channelsPerPage);
    const startIndex = page * channelsPerPage;
    const endIndex = Math.min(startIndex + channelsPerPage, allChannels.length);
    const channels = allChannels.slice(startIndex, endIndex);

    if (channels.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.no} No Channels Available\n` +
            `No text channels found in this server.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_channel_select')
      .setPlaceholder(`Select a channel... (Page ${page + 1}/${totalPages})`)
      .addOptions(channels);

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${theme.star} Log Channel Configuration\n` +
          `Select the channel for bot logs.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${theme.star} **__Available Channels__**`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      );

    if (totalPages > 1) {
      const paginationRow = new ActionRowBuilder();

      if (page > 0) {
        paginationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`setup_channel_back_${page - 1}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (page < totalPages - 1) {
        paginationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`setup_channel_next_${page + 1}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      container.addActionRowComponents(paginationRow);
    }

    container.addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _showCategorySelector(interaction, message, settings, theme, page = 0) {
    const allCategories = message.guild.channels.cache
      .filter(channel => channel.type === 4)
      .sort((a, b) => a.position - b.position)
      .map(category => ({
        label: category.name,
        value: category.id,
        description: `ID: ${category.id}`
      }));

    const categoriesPerPage = 25;
    const totalPages = Math.ceil(allCategories.length / categoriesPerPage);
    const startIndex = page * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, allCategories.length);
    const categories = allCategories.slice(startIndex, endIndex);

    let container;

    if (categories.length === 0) {
      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.no} No Categories Available\n` +
            `No categories found in this server.`
          )
        );
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_category_select')
        .setPlaceholder(`Select a category... (Page ${page + 1}/${totalPages})`)
        .addOptions(categories);

      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.star} Clan Category Configuration\n` +
            `Select the category for clan channels.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.star} **__Available Categories__**`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(selectMenu)
        );

      if (totalPages > 1) {
        const paginationRow = new ActionRowBuilder();

        if (page > 0) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_category_back_${page - 1}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        if (page < totalPages - 1) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_category_next_${page + 1}`)
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        container.addActionRowComponents(paginationRow);
      }
    }

    container.addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _showVoiceCategorySelector(interaction, message, settings, theme, page = 0) {
    const allCategories = message.guild.channels.cache
      .filter(channel => channel.type === 4)
      .sort((a, b) => a.position - b.position)
      .map(category => ({
        label: category.name,
        value: category.id,
        description: `ID: ${category.id}`
      }));

    const categoriesPerPage = 25;
    const totalPages = Math.ceil(allCategories.length / categoriesPerPage);
    const startIndex = page * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, allCategories.length);
    const categories = allCategories.slice(startIndex, endIndex);

    let container;

    if (categories.length === 0) {
      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.no} No Categories Available\n` +
            `No categories found in this server.`
          )
        );
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_voice_category_select')
        .setPlaceholder(`Select a voice category... (Page ${page + 1}/${totalPages})`)
        .addOptions(categories);

      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.star} Voice Category Configuration\n` +
            `Select the category for voice channels.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.star} **__Available Categories__**`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(selectMenu)
        );

      if (totalPages > 1) {
        const paginationRow = new ActionRowBuilder();

        if (page > 0) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_voice_category_back_${page - 1}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        if (page < totalPages - 1) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_voice_category_next_${page + 1}`)
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        container.addActionRowComponents(paginationRow);
      }
    }

    container.addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _showChatCategorySelector(interaction, message, settings, theme, page = 0) {
    const allCategories = message.guild.channels.cache
      .filter(channel => channel.type === 4)
      .sort((a, b) => a.position - b.position)
      .map(category => ({
        label: category.name,
        value: category.id,
        description: `ID: ${category.id}`
      }));

    const categoriesPerPage = 25;
    const totalPages = Math.ceil(allCategories.length / categoriesPerPage);
    const startIndex = page * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, allCategories.length);
    const categories = allCategories.slice(startIndex, endIndex);

    let container;

    if (categories.length === 0) {
      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.no} No Categories Available\n` +
            `No categories found in this server.`
          )
        );
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_chat_category_select')
        .setPlaceholder(`Select a chat category... (Page ${page + 1}/${totalPages})`)
        .addOptions(categories);

      container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.star} Chat Category Configuration\n` +
            `Select the category for chat channels.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${theme.star} **__Available Categories__**`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(selectMenu)
        );

      if (totalPages > 1) {
        const paginationRow = new ActionRowBuilder();

        if (page > 0) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_chat_category_back_${page - 1}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        if (page < totalPages - 1) {
          paginationRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`setup_chat_category_next_${page + 1}`)
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        container.addActionRowComponents(paginationRow);
      }
    }

    container.addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _handleRoleSelection(interaction, message, settings, theme) {
    const roleId = interaction.values[0];
    const role = message.guild.roles.cache.get(roleId);

    if (!role) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Selected role not found.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    const sessionKey = `${message.guild.id}-${message.author.id}`;
    const session = this._activeSessions.get(sessionKey);
    const roleType = session?.currentRoleType || 'manager';

    const updateData = {};
    switch (roleType) {
      case 'manager':
        updateData['roles.manager'] = role.id;
        break;
      case 'leader':
        updateData['roles.leader'] = role.id;
        break;
      case 'coleader':
        updateData['roles.coLeader'] = role.id;
        break;
    }

    try {
      const updatedSetup = await GuildSetup.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          $set: updateData
        },
        { upsert: true, new: true }
      );

      const hierarchyResult = await enforceClanRoleHierarchy(message.guild, updatedSetup.roles);

      const roleTypeName = roleType.charAt(0).toUpperCase() + roleType.slice(1);
      const hierarchyNote = hierarchyResult.reordered
        ? `\n> ${theme.dot} *Role hierarchy updated: Leader > Co-Leader > Manager*`
        : (hierarchyResult.skipped && hierarchyResult.skipped.length > 0
          ? `\n> ${theme.dot} *Note: could not reorder ${hierarchyResult.skipped.join(', ')} — move it below my highest role to enable automatic hierarchy ordering*`
          : '');
      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.yes} ${roleTypeName} Role Configuration Complete\n` +
            `${roleTypeName} role has been set to ${role}\n` +
            `> ${theme.dot} *${roleTypeName}s can now access their permissions*${hierarchyNote}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('[Setup] Error saving role:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Failed to save role configuration. Please try again.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }
  },

  async _handleChannelSelection(interaction, message, settings, theme) {
    const channelId = interaction.values[0];
    const channel = message.guild.channels.cache.get(channelId);

    if (!channel) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Selected channel not found.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    try {
      await GuildSetup.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          $set: { 
            logChannelId: channel.id 
          } 
        },
        { upsert: true, new: true }
      );

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.yes} Log Channel Configuration Complete\n` +
            `Log channel has been set to ${channel}\n` +
            `> ${theme.dot} *Bot logs will be sent to this channel*`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('[Setup] Error saving channel:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Failed to save channel configuration. Please try again.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }
  },

  async _handleCategorySelection(interaction, message, settings, theme) {
    const categoryId = interaction.values[0];
    const category = message.guild.channels.cache.get(categoryId);

    if (!category) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Selected category not found.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    try {
      await GuildSetup.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          $set: { 
            categoryId: category.id 
          } 
        },
        { upsert: true, new: true }
      );

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.yes} Clan Category Configuration Complete\n` +
            `Clan category has been set to ${category}\n` +
            `> ${theme.dot} *New clans will be created in this category*`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('[Setup] Error saving category:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Failed to save category configuration. Please try again.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }
  },

  async _handleVoiceCategorySelection(interaction, message, settings, theme) {
    const categoryId = interaction.values[0];
    const category = message.guild.channels.cache.get(categoryId);

    if (!category) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Selected category not found.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    try {
      await GuildSetup.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          $set: { 
            categoryVoiceId: category.id 
          } 
        },
        { upsert: true, new: true }
      );

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.yes} Voice Category Configuration Complete\n` +
            `Voice category has been set to ${category}\n` +
            `> ${theme.dot} *Voice channels will be created in this category*`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('[Setup] Error saving voice category:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Failed to save voice category configuration. Please try again.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }
  },


  async _handleReset(interaction, message, settings, theme) {
    await GuildSetup.deleteOne({ guildId: message.guild.id });

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${theme.no} System Reset Complete\n` +
          `All server settings have been reset to default values.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('setup_back_main')
              .setLabel('Main')
              .setStyle(ButtonStyle.Secondary)
          )
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _returnToMain(interaction, message, settings, theme, images) {
    const updatedSettings = await this._loadGuildSettings(message.guild.id);
    const container = this._buildMainContainer(updatedSettings, theme, images, message.guild);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async _handleCriticalError(message, error) {
    console.error('[Setup] Critical error:', error);
    await message.reply({
      content: `${message.client.clanThemes?.emojis?.main?.no} **Critical Error**: Setup system encountered an error. Please try again later.`,
      flags: MessageFlags.SuppressEmbeds
    });
  },

  async _handleInteractionError(interaction, error, theme) {
    console.error('[Setup] Interaction error:', error);
    try {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${theme.no} An error occurred while processing your request. Please try again.`)
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    } catch (updateError) {
      console.error('[Setup] Failed to update interaction:', updateError);
    }
  },

  async _handleSessionEnd(sent, theme) {
    try {
      const expiredContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.info} Session Expired\n` +
            `This setup session has expired. Use \`${config.prefix}setup-clan\` to start a new one.`
          )
        );

      await sent.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [expiredContainer]
      });
    } catch (error) {
      console.error('[Setup] Failed to update expired message:', error);
    }
  },

  async _handleChatCategorySelection(interaction, message, settings, theme) {
    const categoryId = interaction.values[0];
    const category = message.guild.channels.cache.get(categoryId);

    if (!category) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Selected category not found.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    try {
      await GuildSetup.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          $set: { 
            categoryId: category.id 
          } 
        },
        { upsert: true, new: true }
      );

      const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${theme.yes} Chat Category Configuration Complete\n` +
            `Chat category has been set to ${category}\n` +
            `> ${theme.dot} *Chat channels will be created in this category*`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('[Setup] Error saving chat category:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${theme.no} Failed to save chat category configuration. Please try again.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`> -# ${theme.heart} Press the Main button to back`)
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('setup_back_main')
                .setLabel('Main')
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }
  },

  _cleanupSession(guildId, userId) {
    const sessionKey = `${guildId}-${userId}`;
    this._activeSessions.delete(sessionKey);
  }
};