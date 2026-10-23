import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder
} from 'discord.js';
import SelfRoleConfig from '../../../models/selfRoleConfig.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';
import { getSafeEmoji } from '../../../utils/emoji.js';

const CATEGORY_OPTIONS = {
    gender: [
        { id: 'male', name: 'Male', },
        { id: 'female', name: 'Female', },
        { id: 'nonbinary', name: 'Non-Binary', },
        { id: 'other_gender', name: 'Other', }
    ],
    games: [
        { id: 'freefire', name: 'Free Fire', emoji: '🔥' },
        { id: 'valorant', name: 'Valorant', emoji: '🎯' },
        { id: 'fortnite', name: 'Fortnite', emoji: '🚌' },
        { id: 'minecraft', name: 'Minecraft', emoji: '⛏️' },
        { id: 'roblox', name: 'Roblox', emoji: '🟥' },
        { id: 'cod', name: 'Call of Duty', emoji: '🔫' },
        { id: 'codm', name: 'Call of Duty Mobile', emoji: '📱' },
        { id: 'pubg', name: 'PUBG', emoji: '🪖' },
        { id: 'pubgm', name: 'PUBG Mobile', emoji: '📱' },
        { id: 'lol', name: 'League of Legends', emoji: '⚔️' },
        { id: 'wildrift', name: 'League of Legends: Wild Rift', emoji: '🌌' },
        { id: 'amongus', name: 'Among Us', emoji: '🔴' },
        { id: 'gta', name: 'GTA V', emoji: '🚗' },
        { id: 'coc', name: 'Clash of Clans', emoji: '🏰' },
        { id: 'cr', name: 'Clash Royale', emoji: '👑' },
        { id: 'brawlstars', name: 'Brawl Stars', emoji: '⭐' },
        { id: 'hayday', name: 'Hay Day', emoji: '🌾' },
        { id: 'apex', name: 'Apex Legends', emoji: '🏹' },
        { id: 'apexmobile', name: 'Apex Legends Mobile', emoji: '📱' },
        { id: 'csgo', name: 'CS:GO', emoji: '💣' },
        { id: 'cs2', name: 'Counter-Strike 2', emoji: '💥' },
        { id: 'overwatch', name: 'Overwatch', emoji: '🛡️' },
        { id: 'overwatch2', name: 'Overwatch 2', emoji: '🦾' },
        { id: 'cyberpunk', name: 'Cyberpunk 2077', emoji: '🌃' }
    ],
    continent: [
        { id: 'africa', name: 'Africa', },
        { id: 'europe', name: 'Europe', },
        { id: 'asia', name: 'Asia', },
        { id: 'north_america', name: 'North America', emoji: '🇺🇸' },
        { id: 'south_america', name: 'South America', },
        { id: 'oceania', name: 'Oceania', }
    ],
    age: [
        { id: 'under18', name: 'Under 18', },
        { id: '18_25', name: '18-25', },
        { id: '26_35', name: '26-35', },
        { id: '36_50', name: '36-50', },
        { id: 'over18', name: 'Over 18', }
    ],
    personality: [
        { id: 'introvert', name: 'Introvert', },
        { id: 'extrovert', name: 'Extrovert', },
        { id: 'ambivert', name: 'Ambivert', },
        { id: 'creative', name: 'Creative', },
        { id: 'analytical', name: 'Analytical', },
        { id: 'funny', name: 'Funny', }
    ],
    situation: [
        { id: 'student', name: 'Student', },
        { id: 'worker', name: 'Worker', },
        { id: 'unemployed', name: 'Unemployed', },
        { id: 'gamer', name: 'Gamer', },
        { id: 'streamer', name: 'Streamer', },
        { id: 'developer', name: 'Developer', }
    ]
};

const CATEGORY_INFO = {
    // Use a broadly supported Unicode emoji in component option payloads.
    // Some Discord clients reject the previous gender symbol as an invalid
    // select-menu emoji and prevent the entire dashboard from being edited.
    gender: { name: 'Gender Roles', emoji: '👥' },
    games: { name: 'Game Roles', emoji: '🎮' },
    continent: { name: 'Continent Roles', emoji: '🌍' },
    age: { name: 'Age Roles', emoji: '🎂' },
    personality: { name: 'Personality Roles', emoji: '🧠' },
    situation: { name: 'Situation Roles', emoji: '💭' }
};

const PRESENTATION_DEFAULTS = {
    placement: 'standalone',
    displayMode: 'buttons',
    sortOrder: 'configured'
};

function getCategoryOptions(category, mappings = []) {
    const builtInOptions = CATEGORY_OPTIONS[category] || [];
    const builtInIds = new Set(builtInOptions.map((option) => option.id));
    const customOptions = (mappings || [])
        .filter((mapping) => mapping?.optionId && !builtInIds.has(mapping.optionId))
        .map((mapping) => ({
            id: mapping.optionId,
            name: mapping.optionName || mapping.optionId,
            emoji: mapping.emoji || null,
            custom: true
        }));

    return [...builtInOptions, ...customOptions];
}

function getCategoryOption(category, optionId, mappings = []) {
    return getCategoryOptions(category, mappings).find((option) => option.id === optionId);
}

function parseCategoryOptionId(encoded) {
    if (encoded.includes('__')) {
        const separatorIndex = encoded.indexOf('__');
        return {
            category: encoded.slice(0, separatorIndex),
            optionId: encoded.slice(separatorIndex + 2)
        };
    }

    // Backwards-compatible parsing for setup messages created before the
    // double-underscore separator was introduced.
    const category = Object.keys(CATEGORY_INFO)
        .find((key) => encoded === key || encoded.startsWith(`${key}_`));
    return category
        ? { category, optionId: encoded.slice(category.length + 1) }
        : { category: null, optionId: encoded };
}

function normalizePresentationSettings(settings = {}) {
    return {
        // Every category is opened from the main dashboard as its own role view.
        // Keep the field for backwards-compatible database documents.
        placement: 'standalone',
        displayMode: ['buttons', 'select', 'emoji'].includes(settings.displayMode)
            ? settings.displayMode
            : PRESENTATION_DEFAULTS.displayMode,
        sortOrder: ['configured', 'name_asc', 'name_desc'].includes(settings.sortOrder)
            ? settings.sortOrder
            : PRESENTATION_DEFAULTS.sortOrder
    };
}

function sortMappings(mappings, sortOrder) {
    const ordered = [...mappings];
    if (sortOrder === 'name_asc') {
        return ordered.sort((a, b) => a.optionName.localeCompare(b.optionName));
    }
    if (sortOrder === 'name_desc') {
        return ordered.sort((a, b) => b.optionName.localeCompare(a.optionName));
    }
    return ordered;
}

export default {
    name: 'selfroles',
    description: 'Configure the self-assignable roles system with predefined options',
    usage: '&selfroles',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    _sessionTimeout: 300000,
    _tempData: {},

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;

            const theme = await client.themeManager.getTheme(guildId);
            const themeColor = Number(theme.color) || 0x010101;
            const settings = await SelfRoleConfig.findOne({ guildId });
            if (!this._tempData[guildId] || (Object.keys(this._tempData[guildId].mappings).length === 0 && !this._tempData[guildId].channel)) {
                const mappings = {};
                const categories = ['gender', 'games', 'continent', 'age', 'personality', 'situation'];
                const settingsObj = settings?.toObject() || {};

                for (const catKey of categories) {
                    mappings[catKey] = settingsObj.categories?.[catKey]?.mappings || [];
                }

                this._tempData[guildId] = {
                    mappings: mappings,
                    categorySettings: Object.fromEntries(
                        categories.map((catKey) => [
                            catKey,
                            normalizePresentationSettings(settingsObj.categories?.[catKey])
                        ])
                    ),
                    channel: settings?.channelId || null,
                    bannerUrl: settings?.bannerUrl || null,
                    currentCategory: null,
                    currentOption: null,
                    selectedSendCategory: null
                };
            }

            const container = this._buildMainContainer(settings, theme, client, guildId);

            const sent = await message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            this._setupCollector(sent, message, theme, themeColor, client, guildId);

        } catch (error) {
            console.error('[SelfRoles] Critical error:', error);
            await message.reply({ content: ' An unexpected error occurred. Please try again.', flags: MessageFlags.SuppressEmbeds });
        }
    },

    _buildMainContainer(settings, theme, client, guildId) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const tempData = this._tempData[guildId] || { mappings: {}, categorySettings: {}, channel: null };

        const channel = tempData.channel ? `<#${tempData.channel}>` : (settings?.channelId ? `<#${settings.channelId}>` : '`Not set`');
        const configuredCategories = Object.entries(tempData.mappings || {})
            .filter(([, mappings]) => mappings?.length > 0)
            .map(([category]) => {
                const presentation = normalizePresentationSettings(tempData.categorySettings?.[category]);
                return `> ${CATEGORY_INFO[category]?.emoji || theme.emojis?.star || '•'} **${CATEGORY_INFO[category]?.name || category}:** Separate role view · ${presentation.displayMode}`;
            });



        // Category select menu
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('selfroles_select_category')
            .setPlaceholder('Select a category to configure options')
            .addOptions(
                Object.entries(CATEGORY_INFO).map(([key, info]) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(info.name)
                        .setEmoji(getSafeEmoji(theme.emojis?.title, info.emoji, client, guildId))
                        .setDescription(`Configure ${info.name.toLowerCase()}`)
                        .setValue(key)
                )
            );


        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('selfroles_channel')
            .setPlaceholder('Select channel for self roles panel')
            .setChannelTypes(ChannelType.GuildText);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis.title} __Self Roles Setup__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.title}  **__Channel:__** ${channel}\n\n` +
                            ` ${theme.emojis.star} __Select a category below to configure options.___`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(tempData.bannerUrl || getPanelBanner(client.guilds.cache.get(guildId), client, theme))
                        .setDescription('Self Roles Control Center')
                )
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(categorySelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${theme.emojis?.star || '•'} **Configured categories**\n` +
                    `${configuredCategories.length > 0 ? configuredCategories.join('\n') : '> `No categories configured yet`'}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> **__Panel Banner__**\n` +
                            `> -# ${tempData.bannerUrl ? ` Banner set` : ' No banner set — click to add a GIF/image URL'}`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('selfroles_set_banner')
                            .setLabel('Set Banner')
                            .setStyle(ButtonStyle.Secondary)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> **__Publish Public Panel__**\n` +
                            `> -# Select a dashboard after choosing a channel, then publish only the panel you need.`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('selfroles_send')
                            .setLabel('Choose Dashboard')
                            .setEmoji('📤')
                            .setStyle(ButtonStyle.Success)
                    )
            );
    },

    _buildSendPanelContainer(theme, client, guildId) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const tempData = this._tempData[guildId] || {};
        const configuredCategories = Object.entries(tempData.mappings || {})
            .filter(([, mappings]) => mappings?.some((mapping) => mapping?.roleId))
            .map(([category]) => category)
            .filter((category) => CATEGORY_INFO[category]);
        const selectedCategory = tempData.selectedSendCategory;

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || '🎛️'} __Choose a Dashboard to Send__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${theme.emojis?.star || '•'} **Channel:** <#${tempData.channel}>\n` +
                    `> Select one dashboard below. Each category is sent as its own independent panel.\n` +
                    `> You can return here later to update another dashboard.`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder());

        if (configuredCategories.length === 0) {
            return container
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '> No category has a mapped server role yet. Configure at least one role before sending a dashboard.'
                    )
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Return to the setup dashboard.'))
                        .setButtonAccessory(
                            new ButtonBuilder()
                                .setCustomId('selfroles_back_main')
                                .setLabel('Back')
                                .setEmoji('↩️')
                                .setStyle(ButtonStyle.Secondary)
                        )
                );
        }

        const dashboardSelect = new StringSelectMenuBuilder()
            .setCustomId('selfroles_send_category')
            .setPlaceholder('Select the dashboard to send')
            .addOptions(
                configuredCategories.map((category) => {
                    const info = CATEGORY_INFO[category];
                    const mappingCount = (tempData.mappings[category] || []).filter((mapping) => mapping?.roleId).length;
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(info.name)
                        .setEmoji(getSafeEmoji(info.emoji, '📋', client, guildId))
                        .setDescription(`${mappingCount} role button${mappingCount === 1 ? '' : 's'} · Send independently`)
                        .setValue(category)
                        .setDefault(selectedCategory === category);
                })
            );

        return container
            .addActionRowComponents(new ActionRowBuilder().addComponents(dashboardSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    selectedCategory
                        ? `> **Selected dashboard:** ${CATEGORY_INFO[selectedCategory].emoji} **${CATEGORY_INFO[selectedCategory].name}**\n` +
                          '> Click **Send Selected Dashboard** to post or update only this panel.'
                        : '> **Selected dashboard:** `None`'
                )
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '> Each category has its own message. Sending one dashboard will not send or replace the others.'
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('selfroles_confirm_send')
                            .setLabel('Send Selected Dashboard')
                            .setEmoji('📨')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(!selectedCategory)
                    )
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Return to the setup dashboard.'))
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('selfroles_back_main')
                            .setLabel('Back')
                            .setEmoji('↩️')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
    },

    _buildCategoryPresentationContainer(theme, client, guildId, category) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const tempData = this._tempData[guildId] || {};
        const catInfo = CATEGORY_INFO[category];
        const current = normalizePresentationSettings(tempData.categorySettings?.[category]);

        const displaySelect = new StringSelectMenuBuilder()
            .setCustomId(`selfroles_set_display_${category}`)
            .setPlaceholder('Choose how members will select roles')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Labeled buttons')
                    .setValue('buttons')
                    .setDescription('Clear buttons with role names and optional emojis')
                    .setDefault(current.displayMode === 'buttons'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Select menu')
                    .setValue('select')
                    .setDescription('A compact dropdown for all roles in this category')
                    .setDefault(current.displayMode === 'select'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Emoji buttons')
                    .setValue('emoji')
                    .setDescription('A visual grid of emoji-only role buttons')
                    .setDefault(current.displayMode === 'emoji')
            );

        const orderSelect = new StringSelectMenuBuilder()
            .setCustomId(`selfroles_set_order_${category}`)
            .setPlaceholder('Choose the role order')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Configured order')
                    .setValue('configured')
                    .setDescription('Keep the order used while mapping roles')
                    .setDefault(current.sortOrder === 'configured'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Alphabetical (A–Z)')
                    .setValue('name_asc')
                    .setDescription('Sort role options from A to Z')
                    .setDefault(current.sortOrder === 'name_asc'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Reverse alphabetical (Z–A)')
                    .setValue('name_desc')
                    .setDescription('Sort role options from Z to A')
                    .setDefault(current.sortOrder === 'name_desc')
            );

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __${catInfo.name} Presentation__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(tempData.bannerUrl || getPanelBanner(client.guilds.cache.get(guildId), client, theme))
                        .setDescription(`${catInfo.name} role panel`)
                )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${theme.emojis?.star || '•'} **Design this category before mapping its roles.**\n` +
                    `> You can change these settings at any time. Every role in this category will follow the same presentation.`
                )
            )
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '### Panel behavior\n> This category always opens as a separate role panel from the main dashboard.'
            ))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Interaction style'))
            .addActionRowComponents(new ActionRowBuilder().addComponents(displaySelect))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Role order'))
            .addActionRowComponents(new ActionRowBuilder().addComponents(orderSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> The main dashboard only shows categories.\n` +
                            `> Members click a category to open its dedicated role panel, then use the controls inside it.`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`selfroles_configure_options_${category}`)
                            .setLabel('Continue to Role Mapping')
                            .setStyle(ButtonStyle.Primary)
                    )
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('> Return to the category list')
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('selfroles_back_main')
                            .setLabel('Back')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
    },

    _buildOptionsContainer(theme, client, guildId, category) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const tempData = this._tempData[guildId];
        const catInfo = CATEGORY_INFO[category];
        const presentation = normalizePresentationSettings(tempData.categorySettings?.[category]);
        const configuredMappings = tempData.mappings[category] || [];
        const options = getCategoryOptions(category, configuredMappings);
        let configuredText = '';
        if (configuredMappings.length > 0) {
            configuredText = configuredMappings.map(m => `> ${m.emoji || theme.emojis.star} **${m.optionName}** → <@&${m.roleId || '`Not set`'}>`).join('\n');
        } else {
            configuredText = '> `No options configured yet`';
        }

        const optionsSelect = new StringSelectMenuBuilder()
            .setCustomId(`selfroles_select_option_${category}`)
            .setPlaceholder(`Select a ${catInfo.name} option to map`)
            .addOptions(
                options.slice(0, 25).map(opt => {
                    const mapping = configuredMappings.find(m => m.optionId === opt.id);
                    const isConfigured = !!mapping;
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(opt.name)
                        .setEmoji(getSafeEmoji(
                            mapping?.emoji || opt.emoji || theme.emojis?.title,
                            getSafeEmoji(opt.emoji, '✨', client, guildId),
                            client,
                            guildId
                        ))
                        .setDescription(isConfigured ? `Mapped to: ${mapping.roleId ? 'Role' : 'No role'} - Click to change` : 'Click to assign a role')
                        .setValue(opt.id);
                })
            );

        const backButton = new ButtonBuilder()
            .setCustomId(`selfroles_back_to_category_${category}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis.title || ''} __${catInfo.name}__`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> **Panel:** Separate role view · ` +
                    `**Style:** ${presentation.displayMode} · **Order:** ${presentation.sortOrder}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star} **__Currently Configured:__**\n${configuredText}\n\n` +
                            `> ${theme.emojis.title} **__Select an option to assign a server role to it.__**`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(optionsSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '> Need a game or category that is not listed? Add a custom option with its own name and emoji.'
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`selfroles_add_option_${category}`)
                            .setLabel('Add Custom Option')
                            .setEmoji('➕')
                            .setStyle(ButtonStyle.Primary)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis?.title || ''} **__If you want to go back click on back__**`)
                    )
                    .setButtonAccessory(backButton)
            );
    },

    _buildRoleMappingContainer(theme, client, guildId, category, optionId, interaction) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const tempData = this._tempData[guildId];
        const catInfo = CATEGORY_INFO[category];
        const option = getCategoryOption(category, optionId, tempData.mappings[category] || []);
        const configuredMappings = tempData.mappings[category] || [];
        const existingMapping = configuredMappings.find(m => m.optionId === optionId);

        let statusText = '';
        if (existingMapping) {
            statusText = `Currently mapped to: <@&${existingMapping.roleId}>`;
        } else {
            statusText = 'Not configured yet - select a role below';
        }

        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`selfroles_map_role_${category}__${optionId}`)
            .setPlaceholder(`Select server role for ${option.name}`);

        if (existingMapping?.roleId) {
            roleSelect.addDefaultRoles(interaction?.guild?.roles?.cache?.get(existingMapping.roleId)?.id || existingMapping.roleId);
        }

        const backButton = new ButtonBuilder()
            .setCustomId(`selfroles_back_to_options_${category}`)
            .setLabel('Back to Options')
            .setStyle(ButtonStyle.Secondary);

        const emojiButton = new ButtonBuilder()
            .setCustomId(`selfroles_add_emoji_${category}__${optionId}`)
            .setLabel(existingMapping?.emoji ? 'Change Emoji' : 'Set Emoji')
            .setEmoji(getSafeEmoji(existingMapping?.emoji || option.emoji, '✨', client, guildId))
            .setStyle(ButtonStyle.Secondary);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __${option.name}__`)
                    )
                    .setButtonAccessory(emojiButton)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star} **__Category:__** ${catInfo.name}\n` +
                            `> ${theme.emojis.star} **__Option:__** ${option.name}\n\n` +
                            `> ${theme.emojis.title} **__Select a server role to assign to this option:__**`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis?.title || ''} **__If you want to go back click on back__**`)
                    )
                    .setButtonAccessory(backButton)
            );
    },

    _setupCollector(sent, message, theme, themeColor, client, guildId) {
        const filter = (interaction) =>
            interaction.user.id === message.author.id &&
            interaction.customId.startsWith('selfroles_');

        const collector = sent.createMessageComponentCollector({
            filter,
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;

                // Return to the category list from any setup step.
                if (customId === 'selfroles_back_main' || customId === 'selfroles_back') {
                    const settings = await SelfRoleConfig.findOne({ guildId });
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildMainContainer(settings, theme, client, guildId)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (
                    customId.startsWith('selfroles_set_placement_') ||
                    customId.startsWith('selfroles_set_display_') ||
                    customId.startsWith('selfroles_set_order_')
                ) {
                    const settingMatch = customId.match(/^selfroles_set_(placement|display|order)_(.+)$/);
                    if (!settingMatch) return;

                    const [, settingType, category] = settingMatch;
                    const settingKey = {
                        placement: 'placement',
                        display: 'displayMode',
                        order: 'sortOrder'
                    }[settingType];
                    const selectedValue = interaction.values[0];
                    const allowed = {
                        placement: ['combined', 'standalone'],
                        displayMode: ['buttons', 'select', 'emoji'],
                        sortOrder: ['configured', 'name_asc', 'name_desc']
                    };
                    if (!allowed[settingKey]?.includes(selectedValue)) return;

                    this._tempData[guildId].categorySettings ||= {};
                    this._tempData[guildId].categorySettings[category] = {
                        ...normalizePresentationSettings(this._tempData[guildId].categorySettings[category]),
                        [settingKey]: selectedValue
                    };

                    await this._autoSave(guildId, theme, client, message);
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildCategoryPresentationContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId.startsWith('selfroles_configure_options_')) {
                    const category = customId.replace('selfroles_configure_options_', '');
                    this._tempData[guildId].currentCategory = category;
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildOptionsContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId.startsWith('selfroles_back_to_category_')) {
                    const category = customId.replace('selfroles_back_to_category_', '');
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildCategoryPresentationContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId.startsWith('selfroles_add_option_')) {
                    const category = customId.replace('selfroles_add_option_', '');
                    if (!CATEGORY_INFO[category]) return;

                    const modal = new ModalBuilder()
                        .setCustomId(`selfroles_custom_option_modal_${category}`)
                        .setTitle(`Add ${CATEGORY_INFO[category].name} Option`);

                    const nameInput = new TextInputBuilder()
                        .setCustomId('option_name')
                        .setLabel('Option name')
                        .setPlaceholder('e.g. Elden Ring or Content Creator')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(80);

                    const emojiInput = new TextInputBuilder()
                        .setCustomId('option_emoji')
                        .setLabel('Emoji (optional)')
                        .setPlaceholder('e.g. 🎮 or <:custom:123456789012345678>')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(100);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(nameInput),
                        new ActionRowBuilder().addComponents(emojiInput)
                    );

                    await interaction.showModal(modal);
                    const modalInteraction = await interaction.awaitModalSubmit({
                        filter: (i) =>
                            i.user.id === interaction.user.id &&
                            i.customId === `selfroles_custom_option_modal_${category}`,
                        time: 60000
                    }).catch(() => null);

                    if (modalInteraction) {
                        const optionName = modalInteraction.fields.getTextInputValue('option_name').trim();
                        const optionEmoji = modalInteraction.fields.getTextInputValue('option_emoji').trim();
                        const existingNames = (this._tempData[guildId].mappings[category] || [])
                            .map((mapping) => mapping.optionName?.toLowerCase());

                        if (!optionName) {
                            await modalInteraction.reply({
                                content: 'Option name cannot be empty.',
                                ephemeral: true
                            }).catch(() => {});
                            return;
                        }
                        if (existingNames.includes(optionName.toLowerCase())) {
                            await modalInteraction.reply({
                                content: 'An option with this name already exists in this category.',
                                ephemeral: true
                            }).catch(() => {});
                            return;
                        }

                        const optionId = `custom_${Date.now().toString(36)}`;
                        this._tempData[guildId].mappings[category] ||= [];
                        this._tempData[guildId].mappings[category].push({
                            optionId,
                            optionName,
                            emoji: optionEmoji || '✨',
                            roleId: null
                        });
                        this._tempData[guildId].currentOption = optionId;

                        await modalInteraction.deferUpdate().catch(() => {});
                        await modalInteraction.message.edit({
                            components: [this._buildRoleMappingContainer(
                                theme,
                                client,
                                guildId,
                                category,
                                optionId,
                                modalInteraction
                            )],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => {});
                        await this._autoSave(guildId, theme, client, message);
                    }
                    return;
                }

                if (customId.startsWith('selfroles_add_emoji_')) {
                    const encoded = customId.replace('selfroles_add_emoji_', '');
                    const { category, optionId } = parseCategoryOptionId(encoded);
                    if (!category || !optionId) return;

                    const modal = new ModalBuilder()
                        .setCustomId(`selfroles_emoji_modal_${category}_${optionId}`)
                        .setTitle('Add Custom Emoji');

                    const emojiInput = new TextInputBuilder()
                        .setCustomId('emoji_input')
                        .setLabel('Emoji')
                        .setPlaceholder('e.g. 🎯 or <:valorant:123456789012345678>')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(emojiInput));

                    await interaction.showModal(modal);

                    const modalInteraction = await interaction.awaitModalSubmit({
                        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('selfroles_emoji_modal_'),
                        time: 60000
                    }).catch(() => null);

                    if (modalInteraction) {
                        const emojiInput = modalInteraction.fields.getTextInputValue('emoji_input').trim();
                        let finalEmoji = emojiInput;

                        // Validation: Check if it's a custom Discord emoji
                        const customMatch = emojiInput.match(/<?(?:a:)?\w+:(\d+)>?/);
                        const idOnlyMatch = emojiInput.match(/^(\d{17,20})$/);
                        const emojiId = customMatch ? customMatch[1] : (idOnlyMatch ? idOnlyMatch[1] : null);

                        if (emojiId) {
                            const botEmoji = client.emojis.cache.get(emojiId);
                            if (botEmoji) {
                                finalEmoji = botEmoji.toString();
                            } else if (customMatch) {
                                // If they provided the full <a:name:id> or <:name:id> string, just trust it.
                                finalEmoji = emojiInput;
                            } else {
                                await modalInteraction.reply({
                                    content: ' This custom emoji was not found in my cache. Try pasting the full emoji string (e.g. `<:name:id>`).',
                                    ephemeral: true
                                }).catch(() => { });
                                return;
                            }
                        }

                        // Initialize mappings if needed
                        if (!this._tempData[guildId].mappings[category]) {
                            this._tempData[guildId].mappings[category] = [];
                        }

                        // Update or add mapping with emoji
                        const existingMapping = this._tempData[guildId].mappings[category].find(m => m.optionId === optionId);
                        if (existingMapping) {
                            existingMapping.emoji = finalEmoji;
                        } else {
                            const option = getCategoryOption(
                                category,
                                optionId,
                                this._tempData[guildId].mappings[category]
                            );
                            if (option) {
                                this._tempData[guildId].mappings[category].push({
                                    optionId: optionId,
                                    optionName: option.name,
                                    emoji: finalEmoji || option.emoji || '✨',
                                    roleId: null
                                });
                            }
                        }

                        await modalInteraction.deferUpdate().catch(() => {});
                        await modalInteraction.message.edit({
                            components: [this._buildRoleMappingContainer(theme, client, guildId, category, optionId, modalInteraction)],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => {});

                        // Auto-save
                        await this._autoSave(guildId, theme, client, message);
                    }
                    return;
                }

                if (customId === 'selfroles_set_banner') {
                    const modal = new ModalBuilder()
                        .setCustomId('selfroles_banner_modal')
                        .setTitle('Set Panel Banner');

                    const urlInput = new TextInputBuilder()
                        .setCustomId('banner_url_input')
                        .setLabel('GIF / Image URL')
                        .setPlaceholder('https://example.com/banner.gif')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    if (this._tempData[guildId]?.bannerUrl) {
                        urlInput.setValue(this._tempData[guildId].bannerUrl);
                    }

                    modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
                    await interaction.showModal(modal);

                    const modalInteraction = await interaction.awaitModalSubmit({
                        filter: (i) => i.user.id === interaction.user.id && i.customId === 'selfroles_banner_modal',
                        time: 60000
                    }).catch(() => null);

                    if (modalInteraction) {
                        const url = modalInteraction.fields.getTextInputValue('banner_url_input').trim();
                        this._tempData[guildId].bannerUrl = url;
                        await this._autoSave(guildId, theme, client, message);
                        const settings = await SelfRoleConfig.findOne({ guildId });
                        await modalInteraction.deferUpdate().catch(() => {});
                        await modalInteraction.message.edit({
                            components: [this._buildMainContainer(settings, theme, client, guildId)],
                            flags: MessageFlags.IsComponentsV2
                        }).catch(() => {});
                    }
                    return;
                }

                if (customId === 'selfroles_send') {
                    const tempData = this._tempData[guildId];
                    if (!tempData.channel) {
                        await interaction.reply({
                            content: ' Please select a channel first!',
                            ephemeral: true
                        }).catch(() => { });
                        return;
                    }
                    const hasMappings = Object.values(tempData.mappings)
                        .some((arr) => arr.some((mapping) => mapping?.roleId));
                    if (!hasMappings) {
                        await interaction.reply({
                            content: ' Please configure at least one role mapping first!',
                            ephemeral: true
                        }).catch(() => { });
                        return;
                    }

                    tempData.selectedSendCategory = null;
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildSendPanelContainer(theme, client, guildId)],
                        flags: MessageFlags.IsComponentsV2
                    });
                    return;
                }

                if (customId === 'selfroles_send_category') {
                    const category = interaction.values[0];
                    if (!CATEGORY_INFO[category]) return;
                    this._tempData[guildId].selectedSendCategory = category;
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildSendPanelContainer(theme, client, guildId)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId === 'selfroles_confirm_send') {
                    const tempData = this._tempData[guildId];
                    const category = tempData?.selectedSendCategory;
                    const mappings = category ? tempData.mappings?.[category] || [] : [];
                    if (!tempData?.channel || !category || !mappings.some((mapping) => mapping?.roleId)) {
                        await interaction.reply({
                            content: 'Select a dashboard with at least one mapped role first.',
                            ephemeral: true
                        }).catch(() => {});
                        return;
                    }

                    await interaction.deferUpdate().catch(() => {});
                    await this._autoSave(guildId, theme, client, message);
                    const posted = await this._postPanel(guildId, theme, client, message, category);
                    if (!posted) {
                        await interaction.followUp({
                            content: 'I could not send this dashboard. Check that I can view and send messages in the selected channel.',
                            ephemeral: true
                        }).catch(() => {});
                        return;
                    }

                    await interaction.message.edit({
                        components: [this._buildMainContainer(
                            await SelfRoleConfig.findOne({ guildId }),
                            theme,
                            client,
                            guildId
                        )],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    await interaction.followUp({
                        content: `Dashboard sent successfully: **${CATEGORY_INFO[category].name}** in <#${tempData.channel}>.`,
                        ephemeral: true
                    }).catch(() => {});
                    return;
                }


                if (customId.startsWith('selfroles_back_to_options_')) {
                    const category = customId.replace('selfroles_back_to_options_', '');
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildOptionsContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId === 'selfroles_select_category') {
                    const category = interaction.values[0];
                    this._tempData[guildId].currentCategory = category;
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildCategoryPresentationContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId.startsWith('selfroles_select_option_')) {
                    const category = customId.replace('selfroles_select_option_', '');
                    const optionId = interaction.values[0];
                    this._tempData[guildId].currentCategory = category;
                    this._tempData[guildId].currentOption = optionId;
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildRoleMappingContainer(theme, client, guildId, category, optionId, interaction)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }

                if (customId.startsWith('selfroles_map_role_')) {
                    const encoded = customId.replace('selfroles_map_role_', '');
                    const { category, optionId } = parseCategoryOptionId(encoded);
                    if (!category || !optionId) return;
                    const roleId = interaction.values[0];
                    const role = message.guild.roles.cache.get(roleId);
                    const option = getCategoryOption(
                        category,
                        optionId,
                        this._tempData[guildId].mappings[category]
                    );
                    
                    if (!option) return; // Prevent crash if option isn't found

                    if (!this._tempData[guildId].mappings[category]) {
                        this._tempData[guildId].mappings[category] = [];
                    }

                    const mappings = this._tempData[guildId].mappings[category];
                    const existingMapping = mappings.find(m => m.optionId === optionId);
                    const currentEmoji = existingMapping?.emoji || null;

                    this._tempData[guildId].mappings[category] = mappings.filter(m => m.optionId !== optionId);

                    this._tempData[guildId].mappings[category].push({
                        optionId: optionId,
                        optionName: option.name,
                        roleId: roleId,
                        emoji: currentEmoji || option.emoji || '✨'
                    });

                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildOptionsContainer(theme, client, guildId, category)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});

                    // Auto-save
                    await this._autoSave(guildId, theme, client, message);
                    return;
                }


                if (customId === 'selfroles_channel') {
                    this._tempData[guildId].channel = interaction.values[0];
                    this._tempData[guildId].selectedSendCategory = null;

                    await interaction.deferUpdate().catch(() => {});
                    // Auto-save
                    await this._autoSave(guildId, theme, client, message);
                    await interaction.message.edit({
                        components: [this._buildSendPanelContainer(theme, client, guildId)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }


                if (customId === 'selfroles_reset') {
                    this._tempData[guildId] = {
                        mappings: {},
                        categorySettings: Object.fromEntries(
                            Object.keys(CATEGORY_INFO).map((category) => [category, { ...PRESENTATION_DEFAULTS }])
                        ),
                        channel: null,
                        bannerUrl: null,
                        currentCategory: null,
                        currentOption: null
                    };
                    const settings = await SelfRoleConfig.findOne({ guildId });
                    await interaction.deferUpdate().catch(() => {});
                    await interaction.message.edit({
                        components: [this._buildMainContainer(settings, theme, client, guildId)],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => {});
                    return;
                }




            } catch (error) {
                console.error('[SelfRoles] Collector interaction error:', error.message);
                console.error('[SelfRoles] Full error:', error);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (e) { }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason !== 'done') {
                delete this._tempData[guildId];
            }
        });
    },

    async _autoSave(guildId, theme, client, message) {
        const tempData = this._tempData[guildId];
        if (!tempData) return;

        const categoriesData = {};
        for (const [catKey, catMappings] of Object.entries(tempData.mappings)) {
            const presentation = normalizePresentationSettings(tempData.categorySettings?.[catKey]);
            if (catMappings.length > 0 || tempData.categorySettings?.[catKey]) {
                categoriesData[catKey] = {
                    mappings: catMappings,
                    ...presentation
                };
            }
        }

        await SelfRoleConfig.findOneAndUpdate(
            { guildId },
            {
                channelId: tempData.channel,
                bannerUrl: tempData.bannerUrl || null,
                categories: categoriesData,
                enabled: true,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
    },

    async _postPanel(guildId, theme, client, message, category) {
        const tempData = this._tempData[guildId];
        if (!tempData?.channel || !CATEGORY_INFO[category]) return false;

        const channel = await message.guild.channels.fetch(tempData.channel).catch(() => null);
        if (!channel?.isTextBased?.()) return false;

        try {
            const config = await SelfRoleConfig.findOne({ guildId }) ||
                await SelfRoleConfig.create({
                    guildId,
                    enabled: true,
                    channelId: tempData.channel
                });
            const standaloneMessageIds = {
                ...(config.standaloneMessageIds?.toObject?.() || config.standaloneMessageIds || {})
            };
            const messageData = {
                flags: MessageFlags.IsComponentsV2,
                components: [this._buildStandalonePanel(theme, client, tempData, message.guild, category)]
            };
            const existingId = standaloneMessageIds[category];
            let panelMessage = null;

            if (existingId) {
                panelMessage = await channel.messages.fetch(existingId).catch(() => null);
                if (panelMessage) await panelMessage.edit(messageData);
            }
            if (!panelMessage) {
                panelMessage = await channel.send(messageData);
            }
            standaloneMessageIds[category] = panelMessage.id;

            // Remove the old combined dashboard created by previous versions.
            // The new flow keeps one independent message per category.
            if (config.messageId && config.messageId !== panelMessage.id) {
                const legacyMessage = await channel.messages.fetch(config.messageId).catch(() => null);
                if (legacyMessage) await legacyMessage.delete().catch(() => {});
            }

            await SelfRoleConfig.findOneAndUpdate(
                { guildId },
                {
                    channelId: tempData.channel,
                    messageId: null,
                    standaloneMessageIds,
                    updatedAt: new Date()
                },
                { new: true }
            );
            return true;
        } catch (error) {
            console.error('[SelfRoles] Error in _postPanel:', error);
            return false;
        }
    },

    _buildStandalonePanel(theme, client, tempData, guild, category) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const catInfo = CATEGORY_INFO[category];
        const presentation = normalizePresentationSettings(tempData.categorySettings?.[category]);
        const mappings = sortMappings(tempData.mappings[category] || [], presentation.sortOrder)
            .filter((mapping) => guild.roles.cache.has(mapping.roleId));
        const fallbackEmoji = getSafeEmoji(theme.emojis?.star, '⭐', client, guildId);

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __${catInfo.name}__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(tempData.bannerUrl || getPanelBanner(guild, client, theme))
                        .setDescription(`${catInfo.name} self-assignable roles`)
                )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${theme.emojis?.star || '•'} Choose a role below to add or remove it.\n` +
                    `> This is a dedicated **${catInfo.name}** panel. Your selection is saved instantly.`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder());

        if (presentation.displayMode === 'select') {
            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId(`selfroles_role_select_${category}`)
                .setPlaceholder(`Choose a ${catInfo.name.toLowerCase()} option`)
                .addOptions(
                    mappings.slice(0, 25).map((mapping) => {
                        const option = new StringSelectMenuOptionBuilder()
                            .setLabel(mapping.optionName)
                            .setValue(mapping.roleId)
                            .setDescription('Click to toggle this role');
                        option.setEmoji(getSafeEmoji(mapping.emoji, '✨', client, guildId));
                        return option;
                    })
                );
            container.addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect));
            return container;
        }

        let row = new ActionRowBuilder();
        let rowCount = 0;
        for (const mapping of mappings.slice(0, 25)) {
            const button = new ButtonBuilder()
                .setCustomId(`selfrole_${mapping.roleId}`)
                .setStyle(ButtonStyle.Secondary);
            if (presentation.displayMode === 'emoji') {
                button.setEmoji(getSafeEmoji(mapping.emoji, fallbackEmoji, client, guildId));
            } else {
                button.setLabel(mapping.optionName.slice(0, 80));
                button.setEmoji(getSafeEmoji(mapping.emoji, fallbackEmoji, client, guildId));
            }
            row.addComponents(button);
            rowCount++;
            if (rowCount === 5) {
                container.addActionRowComponents(row);
                row = new ActionRowBuilder();
                rowCount = 0;
            }
        }
        if (rowCount > 0) container.addActionRowComponents(row);
        return container;
    },

    _buildPublicPanel(theme, client, tempData, guild) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        let categoriesText = '';
        const categorySelectOptions = [];

        for (const [catKey, catMappings] of Object.entries(tempData.mappings)) {
            const presentation = normalizePresentationSettings(tempData.categorySettings?.[catKey]);
            if (catMappings.length > 0 && presentation.placement === 'combined') {
                const catInfo = CATEGORY_INFO[catKey];
                if (!catInfo) continue;
                categoriesText += `> ${theme.emojis?.title || ''} **${catInfo.name}:** ${catMappings.length} options\n`;

                categorySelectOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(catInfo.name)
                        .setEmoji(getSafeEmoji(theme.emojis?.title, catInfo.emoji, client, guild.id))
                        .setDescription(`${catMappings.length} options available`)
                        .setValue(catKey)
                );
            }
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __Self Roles__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.title || ''} **__Select a category below to see available roles.__**\n` +
                            `> ${theme.emojis?.star || '•'} Choose a role to toggle it on or off.\n` +
                            `> ${theme.emojis?.star || '•'} Your selection is applied instantly.\n\n` +
                            `## ${theme.emojis?.title || ''} **__Available Categories:__**\n` +
                            `${categoriesText || '> `Standalone categories are posted in their own panels.`'}`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder());

        const bannerUrl = tempData.bannerUrl || getPanelBanner(guild, client);
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Self Roles Setup')
            )
        );
        container.addSeparatorComponents(new SeparatorBuilder());

        if (categorySelectOptions.length > 0) {
            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId('selfroles_category')
                .setPlaceholder('Select a category')
                .addOptions(categorySelectOptions);
            container.addActionRowComponents(new ActionRowBuilder().addComponents(categorySelect));
        }
        return container;
    }
};
