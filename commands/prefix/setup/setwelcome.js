import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';
import { buildWelcomeCard } from '../../../lib/welcomeCard.js';

export default {
    name: 'setwelcome',
    description: 'Welcome & Boost System Configuration',
    usage: '&setwelcome',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],
    _sessionTimeout: 300000,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await themeManager.getTheme(guildId);
            const themeColor = Number(theme.color) || 0x010101;
            const settings = await GuildConfig.findOne({ guildId });

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [this._buildMain(settings, theme, client, message.guild)]
            });

            this._setupCollector(sent, message, theme, themeColor, client);
        } catch (err) {
            console.error('[WelcomeSetup] Error:', err);
            await message.reply({ content: ' An error occurred. Please try again.' });
        }
    },

    _buildMain(settings, theme, client, guild) {
        const themeColor  = Number(theme.color) || 0x010101;
        const welcomeCh   = settings?.welcomeChannelId  ? `<#${settings.welcomeChannelId}>` : '`Not set`';
        const boostCh     = settings?.boostChannelId    ? `<#${settings.boostChannelId}>`   : '`Not set`';
        const welcomeMsg  = settings?.welcomeMsg?.title ? ` **${settings.welcomeMsg.title}**` : '`Not set`';
        const bannerSet   = settings?.welcomeBannerUrl  ? ' Banner set' : ' No banner set';
        const bannerUrl   = settings?.welcomeBannerUrl  || getPanelBanner(guild, client);
        const cardBgSet   = settings?.welcomeCardBackground ? ' Custom background set' : ' Using default background';

        const welcomeChSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setwelcome_channel')
            .setPlaceholder('Select Welcome Channel')
            .setChannelTypes(ChannelType.GuildText);

        const boostChSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setwelcome_boost_channel')
            .setPlaceholder('Select Boost Announcement Channel')
            .setChannelTypes(ChannelType.GuildText);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(bannerUrl)
                        .setDescription('Welcome & Boost Setup')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __Welcome & Boost Setup__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Welcome Channel:__** ${welcomeCh}\n` +
                            `> ${theme.emojis?.star || ''} **__Boost Channel:__** ${boostCh}\n` +
                            `> ${theme.emojis?.star || ''} **__Welcome Message:__** ${welcomeMsg}\n` +
                            `> ${theme.emojis?.star || ''} **__Panel Banner:__** ${bannerSet}\n` +
                            `> ${theme.emojis?.star || ''} **__Welcome Card Background:__** ${cardBgSet}\n` +
                            `> -# When a member joins, a welcome card is auto-generated with their avatar, username & server name`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(new ActionRowBuilder().addComponents(welcomeChSelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(boostChSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.title || ''} **__Welcome Message__**\n` +
                            `> -# Set a custom title & message (supports {user} and {server})`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setwelcome_set_message')
                            .setLabel('Set Message')
                            .setStyle(ButtonStyle.Secondary)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setwelcome_set_card_bg')
                        .setLabel(settings?.welcomeCardBackground ? ' Change Card Background' : ' Set Card Background')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setwelcome_preview_card')
                        .setLabel(' Preview Card')
                        .setStyle(ButtonStyle.Secondary)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            // ── Bottom buttons: Set Banner + Send Panel + Done ────────────
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setwelcome_set_banner')
                        .setLabel(settings?.welcomeBannerUrl ? ' Change Banner' : ' Set Banner')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setwelcome_send_panel')
                        .setLabel(' Send Welcome Card')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('setwelcome_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Secondary)
                )
            );
    },

    _setupCollector(sent, message, theme, themeColor, client) {
        const filter = i =>
            i.user.id === message.author.id &&
            i.customId.startsWith('setwelcome_');

        const collector = sent.createMessageComponentCollector({ filter, time: this._sessionTimeout });

        collector.on('collect', async interaction => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;

                // ── Done ──────────────────────────────────────────────────
                if (customId === 'setwelcome_done') {
                    collector.stop('done');
                    const done = new ContainerBuilder().setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis?.yes || ''} __Setup Complete__\n` +
                                        `> Welcome & Boost system saved.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                                )
                        );
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [done] });
                }

                // ── Welcome channel ───────────────────────────────────────
                if (customId === 'setwelcome_channel') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId }, { $set: { welcomeChannelId: interaction.values[0] } }, { upsert: true }
                    );
                }

                // ── Boost channel ─────────────────────────────────────────
                if (customId === 'setwelcome_boost_channel') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId }, { $set: { boostChannelId: interaction.values[0] } }, { upsert: true }
                    );
                }

                // ── Set Welcome Message (modal) ───────────────────────────
                if (customId === 'setwelcome_set_message') {
                    const modal = new ModalBuilder()
                        .setCustomId('setwelcome_msg_modal')
                        .setTitle('Set Welcome Message');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wm_title').setLabel('Title')
                                .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wm_body')
                                .setLabel('Message (use {user} and {server})')
                                .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wm_image').setLabel('Image URL (optional)')
                                .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(512)
                        )
                    );

                    await interaction.showModal(modal);

                    const modalRes = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === interaction.user.id && i.customId === 'setwelcome_msg_modal',
                        time: 120_000
                    }).catch(() => null);

                    if (!modalRes) return;

                    const title    = modalRes.fields.getTextInputValue('wm_title').trim();
                    const body     = modalRes.fields.getTextInputValue('wm_body').trim();
                    const imgRaw   = modalRes.fields.getTextInputValue('wm_image').trim();
                    const imageUrl = /^https?:\/\//i.test(imgRaw) ? imgRaw : null;

                    await GuildConfig.findOneAndUpdate(
                        { guildId }, { $set: { welcomeMsg: { title, body, imageUrl } } }, { upsert: true }
                    );

                    await modalRes.deferUpdate().catch(() => {});
                    const updated = await GuildConfig.findOne({ guildId });
                    return modalRes.message.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    }).catch(() => {});
                }

                // ── Set Banner (modal) ────────────────────────────────────
                if (customId === 'setwelcome_set_banner') {
                    const cur = await GuildConfig.findOne({ guildId });

                    const urlInput = new TextInputBuilder()
                        .setCustomId('welcome_banner_url')
                        .setLabel('GIF / Image URL for Welcome Panel')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://example.com/banner.gif')
                        .setRequired(true)
                        .setMaxLength(512);

                    if (cur?.welcomeBannerUrl) urlInput.setValue(cur.welcomeBannerUrl);

                    const modal = new ModalBuilder()
                        .setCustomId('setwelcome_banner_modal')
                        .setTitle('Set Welcome Panel Banner')
                        .addComponents(new ActionRowBuilder().addComponents(urlInput));

                    await interaction.showModal(modal);

                    const modalRes = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === interaction.user.id && i.customId === 'setwelcome_banner_modal',
                        time: 120_000
                    }).catch(() => null);

                    if (!modalRes) return;

                    const url = modalRes.fields.getTextInputValue('welcome_banner_url').trim();
                    await GuildConfig.findOneAndUpdate(
                        { guildId }, { $set: { welcomeBannerUrl: url } }, { upsert: true }
                    );

                    await modalRes.deferUpdate().catch(() => {});
                    const updated = await GuildConfig.findOne({ guildId });
                    return modalRes.message.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    }).catch(() => {});
                }

                // ── Set Card Background (modal) ───────────────────────────
                if (customId === 'setwelcome_set_card_bg') {
                    const cur = await GuildConfig.findOne({ guildId });

                    const urlInput = new TextInputBuilder()
                        .setCustomId('welcome_card_bg_url')
                        .setLabel('Image URL for Welcome Card Background')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://example.com/background.png (leave empty for default)')
                        .setRequired(false)
                        .setMaxLength(512);

                    if (cur?.welcomeCardBackground) urlInput.setValue(cur.welcomeCardBackground);

                    const modal = new ModalBuilder()
                        .setCustomId('setwelcome_card_bg_modal')
                        .setTitle('Set Welcome Card Background')
                        .addComponents(new ActionRowBuilder().addComponents(urlInput));

                    await interaction.showModal(modal);

                    const modalRes = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === interaction.user.id && i.customId === 'setwelcome_card_bg_modal',
                        time: 120_000
                    }).catch(() => null);

                    if (!modalRes) return;

                    const url = modalRes.fields.getTextInputValue('welcome_card_bg_url').trim();
                    await GuildConfig.findOneAndUpdate(
                        { guildId }, { $set: { welcomeCardBackground: url || null } }, { upsert: true }
                    );

                    await modalRes.deferUpdate().catch(() => {});
                    const updated = await GuildConfig.findOne({ guildId });
                    return modalRes.message.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    }).catch(() => {});
                }

                // ── Preview Welcome Card ──────────────────────────────────
                if (customId === 'setwelcome_preview_card') {
                    await interaction.deferReply({ ephemeral: true }).catch(() => {});

                    const cur = await GuildConfig.findOne({ guildId });
                    const accentColor = '#' + (Number(themeColor) || 0xA78BFA).toString(16).padStart(6, '0');

                    try {
                        const buffer = await buildWelcomeCard({
                            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
                            username: interaction.member?.displayName || interaction.user.username,
                            serverName: message.guild.name,
                            memberCount: message.guild.memberCount,
                            backgroundURL: cur?.welcomeCardBackground || null,
                            accentColor
                        });

                        const attachment = new AttachmentBuilder(buffer, { name: 'welcome-preview.png' });
                        await interaction.editReply({
                            content: ' Preview of the welcome card that new members will see:',
                            files: [attachment]
                        }).catch(() => {});
                    } catch (err) {
                        await interaction.editReply({
                            content: ` Failed to generate preview: ${err.message}`
                        }).catch(() => {});
                    }
                    return;
                }

                // ── Send Welcome Card to Channel ──────────────────────────
                if (customId === 'setwelcome_send_panel') {
                    const channelSelect = new ChannelSelectMenuBuilder()
                        .setCustomId('setwelcome_panel_channel')
                        .setPlaceholder('Select channel to send the welcome card')
                        .setChannelTypes(ChannelType.GuildText);

                    const cur = await GuildConfig.findOne({ guildId });
                    const bannerUrl = cur?.welcomeBannerUrl || getPanelBanner(message.guild, client);

                    const selector = new ContainerBuilder().setAccentColor(themeColor)
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Welcome Card')
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('##  Send Welcome Card\n> Select the channel where a live preview of the welcome card will be posted.')
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));

                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [selector] });
                }

                if (customId === 'setwelcome_panel_channel') {
                    const channelId = interaction.values[0];
                    const channel   = message.guild.channels.cache.get(channelId);
                    if (!channel) return interaction.deferUpdate().catch(() => {});

                    await interaction.deferUpdate().catch(() => {});
                    const cur = await GuildConfig.findOne({ guildId });

                    // Permission pre-check so failures are surfaced instead of silently dropped
                    const perms = channel.permissionsFor(client.user);
                    if (!perms?.has(PermissionFlagsBits.ViewChannel) || !perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.AttachFiles)) {
                        const updated = await GuildConfig.findOne({ guildId });
                        return interaction.editReply({
                            flags: MessageFlags.IsComponentsV2,
                            components: [this._buildMain(updated, theme, client, message.guild)]
                        }).catch(() => {}).finally(() => {
                            interaction.followUp({
                                content: ` I don't have permission to send messages/attachments in <#${channel.id}>. Please grant **View Channel**, **Send Messages** and **Attach Files**, then try again.`,
                                ephemeral: true
                            }).catch(() => {});
                        });
                    }

                    // Build and send the actual welcome card exactly as new members will see it
                    let sendError = null;
                    try {
                        const accentColor = '#' + (Number(themeColor) || 0xA78BFA).toString(16).padStart(6, '0');
                        const buffer = await buildWelcomeCard({
                            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
                            username: interaction.member?.displayName || interaction.user.username,
                            serverName: message.guild.name,
                            memberCount: message.guild.memberCount,
                            backgroundURL: cur?.welcomeCardBackground || null,
                            accentColor
                        });

                        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
                        const welcomeTitle = cur?.welcomeMsg?.title
                            ?.replace('{user}', interaction.user.username)
                            ?.replace('{server}', message.guild.name);
                        const welcomeBody = cur?.welcomeMsg?.body
                            ?.replace('{user}', `<@${interaction.user.id}>`)
                            ?.replace('{server}', message.guild.name);

                        const publicPanel = new ContainerBuilder().setAccentColor(themeColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${welcomeTitle ? `## ${welcomeTitle}` : `## ${theme.emojis?.title || ''} Welcome!`}\n` +
                                    `${welcomeBody || `> This is a preview of the welcome card new members will receive when they join **${message.guild.name}**.`}`
                                )
                            )
                            .addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems(
                                    mediaGalleryItem => mediaGalleryItem
                                        .setURL('attachment://welcome.png')
                                        .setDescription('Welcome Card')
                                )
                            );

                        await channel.send({
                            files: [attachment],
                            components: [publicPanel],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } catch (err) {
                        sendError = err;
                        console.error('[WelcomeSetup] Failed to send welcome card to channel:', err);
                    }

                    const updated = await GuildConfig.findOne({ guildId });
                    await interaction.editReply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    }).catch(() => {});

                    return interaction.followUp({
                        content: sendError
                            ? ` Failed to send the welcome card to <#${channel.id}>: ${sendError.message}`
                            : ` Welcome card sent to <#${channel.id}>.`,
                        ephemeral: true
                    }).catch(() => {});
                }

                // ── Refresh panel for select menus ────────────────────────
                if (!['setwelcome_set_message', 'setwelcome_set_banner', 'setwelcome_send_panel', 'setwelcome_panel_channel'].includes(customId)) {
                    const updated = await GuildConfig.findOne({ guildId });
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    });
                }

            } catch (err) {
                console.error('[WelcomeSetup] Collector error:', err);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch {}
            }
        });
    }
};
