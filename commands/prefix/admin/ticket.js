import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js'

import GuildConfig from '../../../models/guildConfig.js';

const CATEGORIES = [
  {
    label: 'Donation',
    value: 'donation',
    emoji: { name: 'donate', id: '1537455876238213241' },
    emojiText: '<:15367551382057165311:1537455876238213241>',
    fallbackEmoji: '💵',
    description: 'Make a donation or ask about contributions'
  },
  {
    label: 'Pub',
    value: 'pub',
    emoji: { name: 'pub', id: '1537451407240728616' },
    emojiText: '<:15367531955299287861:1537451407240728616>',
    fallbackEmoji: '🟠',
    description: 'Advertising, partnerships, or promotions'
  },
  {
    label: 'Info',
    value: 'info',
    emoji: 'ℹ️',
    emojiText: 'ℹ️',
    fallbackEmoji: 'ℹ️',
    description: 'General questions and information'
  },
  {
    label: 'Bugs',
    value: 'bugs',
    emoji: { name: 'bugs', id: '1537451662321647666' },
    emojiText: '<:15367538686277797061:1537451662321647666>',
    fallbackEmoji: '🛠️',
    description: 'Report a bug or technical issue'
  },
  {
    label: 'Abuse',
    value: 'abuse',
    emoji: { name: 'abuse', id: '1537451961769664562' },
    emojiText: '<:15367549424115426381:1537451961769664562>',
    fallbackEmoji: '🔨',
    description: 'Report abuse, harassment, or rule violations'
  }
];

const ticketSeparator = () =>
  new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

function ticketCategorySection(category) {
  return new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${category.emojiText} ${category.label}\n` +
        `\`${category.description}\``
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId(`ticket_open_${category.value}`)
        .setLabel(`Open ${category.label}`)
        .setEmoji(category.emoji)
        .setStyle(ButtonStyle.Primary)
    );
}

export default {
  name: 'ticket',
  aliases: ['ticketpanel', 'openticket'],
  description: 'Manage the ticket system',
  category: 'Admin',
  usage: '-ticket setup | -ticket panel',
  cooldown: 5,

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const err = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Permission Denied\nYou need **Administrator** permission to use this command.`)
        );
      return message.reply({ components: [err], flags: [MessageFlags.IsComponentsV2] });
    }

    const sub = args[0]?.toLowerCase();

    // ── -ticket setup ────────────────────────────────────────────
    if (sub === 'setup') {
      return handleSetup(message, args);
    }

    // ── -ticket panel  (or just -ticket) ─────────────────────────
    return handlePanel(message);
  }
};

// ─────────────────────────────────────────────────────────────────
// SETUP: -ticket setup <#panel-channel> <#category> <@role> <#log-channel> [imageUrl]
// ─────────────────────────────────────────────────────────────────
async function handleSetup(message, args) {
  // Show help if not enough args
  if (args.length < 5) {
    const help = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `#  Ticket Setup\n` +
          `**Usage:**\n` +
          `\`\`\`\n-ticket setup #panel-channel #tickets-category @support-role #log-channel [imageUrl]\n\`\`\`\n` +
          `**Example:**\n` +
          `\`\`\`\n-ticket setup #tickets 1234567890 @Staff #ticket-logs\n\`\`\`\n` +
          `**Arguments:**\n` +
          `• \`#panel-channel\` — where the ticket panel will be posted\n` +
          `• \`#tickets-category\` — the category ID where ticket channels will be created\n` +
          `• \`@support-role\` — role that can see tickets\n` +
          `• \`#log-channel\` — where ticket actions are logged\n` +
          `• \`imageUrl\` — (optional) banner image URL for the panel`
        )
      );
    return message.reply({ components: [help], flags: [MessageFlags.IsComponentsV2] });
  }

  // Parse channel mention or ID
  const panelChannel =
    message.mentions.channels.first() ||
    message.guild.channels.cache.get(args[1]?.replace(/[<#>]/g, ''));

  const categoryId = args[2]?.replace(/[<#>]/g, '');
  const categoryChannel = message.guild.channels.cache.get(categoryId);

  const supportRole =
    message.mentions.roles.first() ||
    message.guild.roles.cache.get(args[3]?.replace(/[<@&>]/g, ''));

  const logChannel =
    message.mentions.channels.at(1) ||
    message.guild.channels.cache.get(args[4]?.replace(/[<#>]/g, ''));

  const imageUrl = args[5] || null;

  // Validate
  const errors = [];
  if (!panelChannel) errors.push(' Invalid panel channel. Mention a text channel.');
  if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory)
    errors.push(' Invalid category. Provide a valid category channel ID.');
  if (!supportRole) errors.push(' Invalid role. Mention a role or provide its ID.');
  if (!logChannel) errors.push(' Invalid log channel. Mention a text channel.');

  if (errors.length > 0) {
    const errContainer = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Setup Failed\n${errors.join('\n')}\n\n` +
          `**Usage:** \`-ticket setup #panel-channel #category-id @role #log-channel [imageUrl]\``
        )
      );
    return message.reply({ components: [errContainer], flags: [MessageFlags.IsComponentsV2] });
  }

  // Save settings to MongoDB
  await GuildConfig.findOneAndUpdate(
    { guildId: message.guild.id },
    {
      $set: {
        ticketChannelId:      panelChannel.id,
        ticketCategoryId:     categoryChannel.id,
        ticketAdminRoleIds:   [supportRole.id],
        ticketLogsChannelId:  logChannel.id,
        ticketBannerUrl:      imageUrl,
      }
    },
    { upsert: true, new: true }
  );

  const success = new ContainerBuilder()
    .setAccentColor(0xFFFFFF)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `#  Ticket System Configured\n` +
        `**Panel Channel:** <#${panelChannel.id}>\n` +
        `**Tickets Category:** ${categoryChannel.name}\n` +
        `**Support Role:** <@&${supportRole.id}>\n` +
        `**Log Channel:** <#${logChannel.id}>\n` +
        `${imageUrl ? `**Image:** set\n` : ''}` +
        `\n-# Run \`-ticket panel\` to post the ticket panel.`
      )
    );
  return message.reply({ components: [success], flags: [MessageFlags.IsComponentsV2] });
}

// ─────────────────────────────────────────────────────────────────
// PANEL: sends the ticket panel to the configured channel
// ─────────────────────────────────────────────────────────────────
async function handlePanel(message) {
  const guildSettings = await GuildConfig.findOne({ guildId: message.guild.id });

  if (!guildSettings?.ticketChannelId) {
    const err = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Not Configured\nRun \`-ticket setup\` first to configure the ticket system for this server.`
        )
      );
    return message.reply({ components: [err], flags: [MessageFlags.IsComponentsV2] });
  }

  const targetChannel =
    message.guild.channels.cache.get(guildSettings.ticketChannelId) || message.channel;
  const serverName = message.guild.name?.trim() || 'Discord Server';

  // Remove only previous bot-authored ticket panels so the channel always
  // shows one current panel with the server's live name.
  const previousMessages = await targetChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (previousMessages) {
    const oldPanels = previousMessages.filter(previousMessage => {
      if (previousMessage.author?.id !== message.client.user.id) return false;
      const serialized = JSON.stringify(previousMessage.toJSON?.() ?? previousMessage);
      return /Support Tickets|Asuna|明日奈|aid-app|gg#7440/i.test(serialized);
    });
    for (const oldPanel of oldPanels.values()) {
      await oldPanel.delete().catch(() => {});
    }
  }

  // Build a text-first public panel inspired by the uploaded reference.
  // A configured banner is optional and is rendered only when an administrator
  // explicitly saves a valid image/GIF URL in the ticket settings.
  const container = new ContainerBuilder().setAccentColor(0x8ED6F7)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# __${serverName}__\n` +
        `### Support Tickets\n` +
        `\n` +
        `> **Our support team is here to help.**\n` +
        `> Choose the category that best matches your request below.\n\n` +
        `-# Private tickets are for serious requests only.`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Large));

  const bannerUrl = typeof guildSettings.ticketBannerUrl === 'string'
    ? guildSettings.ticketBannerUrl.trim()
    : '';
  if (bannerUrl) {
    container
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(bannerUrl)
            .setDescription(`${serverName} Support Tickets`)
        )
      )
      .addSeparatorComponents(ticketSeparator());
  }

  for (const category of CATEGORIES) {
    container
      .addSectionComponents(ticketCategorySection(category))
      .addSeparatorComponents(ticketSeparator());
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## Open a private ticket\n` +
      `Select **Open** beside the category that best describes your request.`
    )
  );

  try {
    await targetChannel.send({
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });

    if (targetChannel.id !== message.channel.id) {
      const confirm = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(` Ticket panel sent to <#${targetChannel.id}>`)
        );
      await message.reply({ components: [confirm], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await message.react('').catch(() => {});
    }

    console.log(`[TICKET] Panel sent by ${message.author.tag} in ${message.guild.name}`);
  } catch (error) {
    console.error('[TICKET] Error sending panel:', error);
    const err = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Error\nFailed to send the ticket panel. Check bot permissions.`)
      );
    await message.reply({ components: [err], flags: [MessageFlags.IsComponentsV2] });
  }
}
