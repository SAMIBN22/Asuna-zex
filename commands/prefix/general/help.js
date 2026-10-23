import {
    ButtonStyle,
    ContainerBuilder,
    SeparatorBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    MediaGalleryBuilder,
    StringSelectMenuOptionBuilder,
    AttachmentBuilder
} from "discord.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import themeManager from "../../../themes/themeManager.js";
import config from "../../../config/config.js";
import { getPanelBanner } from "../../../utils/panelBanner.js";

// Pre-load the animated divider so it is only read from disk once
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIVIDER_PATH = join(__dirname, "../../../assets/images/divider.gif");
const DIVIDER_BUFFER = readFileSync(DIVIDER_PATH);

const { prefix } = config;
const FALLBACK_COLOR = [1, 1, 1];
const DEFAULT_HELP_EMOJI = '<a:15118311026863636481:1537427659863367700>';
const DEFAULT_DOT_EMOJI = '<a:15118313460987332081:1537425814499364964>';

const getThemeColor = (theme) => {
    const color = Number(theme?.color);
    if (!Number.isFinite(color)) return FALLBACK_COLOR;
    return [(color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF];
};

const getHelpEmoji = (theme, name, fallback) =>
    theme?.emojis?.[name] || config.helpEmojis?.[name] || fallback;

export default {
    name: "help",
    aliases: ["h", "commands", "cmd"],
    description: "Show the bot's comprehensive help menu",
    category: "General",
    usage: "help [category|command|search]",

    // ── Category ordering ─────────────────────────────────────────────────────
    CATEGORY_ORDER: [
        'General', 'Admin', 'BotManage', 'Setup',
        'Clan', 'Casino', 'Fun', 'Marriage',
        'Music', 'Premium', 'Security', 'Rank',
        'Voice', 'Lobby', 'Jail', 'Warn',
        'Verification', 'Stats', 'Utility'
    ],

    // ── Display names for abbreviated / unclear command names ─────────────────
    DISPLAY_NAMES: {
        'c':            'Credits',
        'p':            'Profile Card',
        'r':            'Rank Card',
        'lb':           'Leaderboard',
        'lvl':          'Level Stats',
        'bg':           'Background',
        'blmove':       'Blacklist from Move',
        'blremove':     'Remove from Blacklist',
        'mperm':        'Manage Permissions',
        'vote-bot':     'Vote for the Bot',
        'user-info':    'User Info',
        'setup-clan':   'Setup Clan',
        'sus':          'Suspect (Flag User)',
        'unsus':        'Remove Suspect Flag',
        'susinfo':      'Suspect Info',
        'afk':          'AFK Status',
        'rvc':          'Random VC Action',
        'tts':          'Text to Speech',
        'svg':          'SVG Generator',
        'taysse':       'Taysse',
    },

    // ── Category meta ─────────────────────────────────────────────────────────
    CATEGORY_META: {
        'General':      { emoji: '', description: 'General utility and info commands' },
        'Admin':        { emoji: '', description: 'Server moderation and admin tools' },
        'BotManage':    { emoji: '', description: 'Bot management and configuration' },
        'Setup':        { emoji: '', description: 'Server setup and auto-configuration' },
        'Clan':         { emoji: '', description: 'Clan system management and tools' },
        'Casino':       { emoji: '', description: 'Economy, gambling and casino games' },
        'Fun':          { emoji: '', description: 'Fun and entertainment commands' },
        'Marriage':     { emoji: '', description: 'Marriage and family relationship system' },
        'Music':        { emoji: '', description: 'Music player and queue management' },
        'Premium':      { emoji: '', description: 'Exclusive premium features and perks' },
        'Security':     { emoji: '', description: 'Anti-nuke, anti-raid and protection systems' },
        'Rank':         { emoji: '', description: 'Leveling, XP and rank tracking' },
        'Voice':        { emoji: '', description: 'Voice channel management and control' },
        'Lobby':        { emoji: '', description: 'Solo lobby voice room system' },
        'Jail':         { emoji: '', description: 'Jail and detention management system' },
        'Warn':         { emoji: '', description: 'Warning and infraction system' },
        'Verification': { emoji: '', description: 'User verification and invite tracking' },
        'Stats':        { emoji: '', description: 'Server and member statistics' },
        'Utility':      { emoji: '', description: 'Miscellaneous utility commands' },
    },

    // ── Entry point ───────────────────────────────────────────────────────────
    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await themeManager.getTheme(guildId);
            const query = args.join(' ').toLowerCase();

            if (!query) {
                return await this.showMainHelp(message, theme, client);
            }

            if (query.startsWith('search ')) {
                return await this.showSearchResults(message, query.replace('search ', ''), theme, client);
            }

            const categories = this.getCategories(client);
            const foundCategory = categories.find(cat => cat.toLowerCase() === query);

            if (foundCategory) {
                return await this.showCategoryPage(message, foundCategory, theme, client, 0);
            }

            return await this.showSearchResults(message, query, theme, client);
        } catch (err) {
            console.error("[HELP EXECUTE] Global error:", err);
        }
    },

    // ── Main menu ─────────────────────────────────────────────────────────────
    async showMainHelp(message, theme, client) {
        const botName        = message.client.user.username;
        const categories     = this.getCategories(client);
        const categoryOptions = this.buildCategoryOptions(categories, theme, client);
        const state          = { view: 'main', categoryName: null, page: 0 };

        const container = this.buildMainContainer(theme, botName, categoryOptions, client, message.guild);
        const sentMessage = await message.reply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container],
            files: [new AttachmentBuilder(DIVIDER_BUFFER, { name: 'divider.gif' })],
            allowedMentions: { parse: [] }
        }).catch(err => {
            console.error("[HELP] Failed to send main help:", err);
            return null;
        });

        if (sentMessage) this.setupInteractionCollector(sentMessage, message.author.id, theme, message.client, state);
        return sentMessage;
    },

    // ── Category page ─────────────────────────────────────────────────────────
    async showCategoryPage(message, categoryName, theme, client) {
        const commands = this.loadCommandsFromCategory(categoryName, client);

        if (commands.length === 0) {
            return await this.showCategoryNotFound(message, categoryName, theme, client);
        }

        const state = { view: 'category', categoryName, page: 0 };
        const container = await this.buildCategoryContainer(theme, categoryName, commands, client, message.guild, null, 0);
        const sentMessage = await message.reply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container],
            allowedMentions: { parse: [] }
        }).catch(async () => {
            return await message.reply(`>  **Category \`${categoryName}\` could not be displayed. Try \`${prefix}help search <keyword>\` to find specific commands.**`);
        });

        if (sentMessage) this.setupInteractionCollector(sentMessage, message.author.id, theme, client, state);
        return sentMessage;
    },

    // ── Search ────────────────────────────────────────────────────────────────
    async showSearchResults(message, query, theme, client) {
        const results = this.searchCommands(query, client, 8);

        if (results.length === 0) {
            return await this.showNoResults(message, query, theme, client);
        }

        const container = this.buildSearchContainer(theme, query, results, client);
        return await message.reply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container],
            allowedMentions: { parse: [] }
        }).catch(() => { });
    },

    // ── Get sorted categories (excludes dev/owner only) ───────────────────────
    getCategories(client) {
        const categories = new Set();
        client.prefixCommands.forEach(cmd => {
            const cat = (cmd.category || 'Other').toLowerCase();
            // Only exclude true developer/owner-only categories
            if (!['dev', 'developer', 'owner'].includes(cat)) {
                categories.add(cmd.category || 'Other');
            }
        });

        const order = this.CATEGORY_ORDER;
        return Array.from(categories).sort((a, b) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    },

    // ── Load commands for a category (case-insensitive) ───────────────────────
    loadCommandsFromCategory(category, client) {
        const commands = [];
        const seen = new Set();
        const catLower = category.toLowerCase();

        client.prefixCommands.forEach(cmd => {
            const cmdCat = (cmd.category || 'Other').toLowerCase();
            if (cmdCat === catLower && !seen.has(cmd.name)) {
                commands.push(cmd);
                seen.add(cmd.name);
            }
        });

        // Sort alphabetically by display name
        return commands.sort((a, b) =>
            this.getCommandDisplayName(a).localeCompare(this.getCommandDisplayName(b))
        );
    },

    // ── Search across all commands ────────────────────────────────────────────
    searchCommands(query, client, limit = 8) {
        const results = [];
        const searchQuery = query.toLowerCase();
        const seen = new Set();

        client.prefixCommands.forEach(cmd => {
            if (!seen.has(cmd.name) && (
                cmd.name.toLowerCase().includes(searchQuery) ||
                this.getCommandDisplayName(cmd).toLowerCase().includes(searchQuery) ||
                (cmd.description && cmd.description.toLowerCase().includes(searchQuery)) ||
                (cmd.aliases && cmd.aliases.some(a => a.toLowerCase().includes(searchQuery)))
            )) {
                results.push(cmd);
                seen.add(cmd.name);
            }
        });

        return results.slice(0, limit);
    },

    // ── Display name for a command ────────────────────────────────────────────
    getCommandDisplayName(cmd) {
        return this.DISPLAY_NAMES[cmd.name] || (cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1));
    },

    // ── Category description ──────────────────────────────────────────────────
    getCategoryDescription(category) {
        return (this.CATEGORY_META[category] || {}).description
            || (this.CATEGORY_META[Object.keys(this.CATEGORY_META).find(k => k.toLowerCase() === category.toLowerCase())] || {}).description
            || 'Available commands in this category';
    },

    // ── Category emoji ────────────────────────────────────────────────────────
    getCategoryEmoji(category) {
        return (this.CATEGORY_META[category] || {}).emoji
            || (this.CATEGORY_META[Object.keys(this.CATEGORY_META).find(k => k.toLowerCase() === category.toLowerCase())] || {}).emoji
            || '';
    },

    // ── Build select menu options ─────────────────────────────────────────────
    buildCategoryOptions(categories, theme, client) {
        return categories.map(category => {
            const commands = this.loadCommandsFromCategory(category, client);
            const desc = this.getCategoryDescription(category);
            const label = category.charAt(0).toUpperCase() + category.slice(1);
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${label} (${commands.length})`)
                .setDescription(desc.length > 100 ? desc.slice(0, 97) + '...' : desc)
                .setEmoji(getHelpEmoji(theme, 'folder', DEFAULT_HELP_EMOJI))
                .setValue(category);
        });
    },

    // ── Main help container ───────────────────────────────────────────────────
    buildMainContainer(theme, botName, categoryOptions, client, guild, overrideColor = null) {
        const mainBanner = getPanelBanner(guild, client, theme);
        const accentColor = overrideColor ?? getThemeColor(theme);
        const totalCmds = client.prefixCommands.size;
        const titleEmoji = getHelpEmoji(theme, 'title', DEFAULT_HELP_EMOJI);
        const dotEmoji = getHelpEmoji(theme, 'star', DEFAULT_DOT_EMOJI);

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(text => text.setContent(`# ${titleEmoji} __${botName} Help Menu__`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(gallery => gallery
                .addItems(item => item
                    .setDescription(`${botName} Banner`)
                    .setURL(mainBanner)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(section => section
                .addTextDisplayComponents(text => text.setContent(
                    `## ${titleEmoji} ***__${botName} Information__***\n` +
                    `${dotEmoji} ***__Prefix:__*** \`${prefix}\`\n` +
                    `${dotEmoji} ***__Categories:__*** \`${categoryOptions.length}\`\n` +
                    `${dotEmoji} ***__Search:__*** \`${prefix}help [name]\``
                ))
                .setThumbnailAccessory(thumbnail => thumbnail.setURL(
                    client.user.displayAvatarURL({ extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
                ))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(
                `## ${titleEmoji} **__How to Use__**\n` +
                `> Select a category from the menu below to view its commands.\n` +
                `> You can also search for a specific command using \`${prefix}help search [name]\`.`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row => row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("help_category")
                    .setPlaceholder("Select a category to explore commands...")
                    .addOptions(categoryOptions)
            ))
            .addSeparatorComponents(new SeparatorBuilder());

        if (config.supportServer) {
            container
                .addSectionComponents(section => section
                    .addTextDisplayComponents(text => text.setContent(
                        `${titleEmoji} ***__Need more assistance? Join our support community below.__***`
                    ))
                    .setButtonAccessory(button => button
                        .setLabel("Support")
                        .setStyle(ButtonStyle.Link)
                        .setURL(config.supportServer)
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder());
        }

        return container;
    },

    // Commands shown per page (keeps total container text well under Discord's 4000 char limit)
    CMDS_PER_PAGE: 10,

    // ── Category commands container (paginated) ───────────────────────────────
    async buildCategoryContainer(theme, categoryName, commands, client, guild = null, overrideColor = null, page = 0) {
        const accentColor = overrideColor ?? getThemeColor(theme);
        const catDesc     = this.getCategoryDescription(categoryName);
        const catLabel    = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

        const categories      = this.getCategories(client);
        const categoryOptions = this.buildCategoryOptions(categories, theme, client);

        // ── Pagination ────────────────────────────────────────────────────────
        const pageSize   = this.CMDS_PER_PAGE;
        const totalPages = Math.max(1, Math.ceil(commands.length / pageSize));
        const safePage   = Math.max(0, Math.min(page, totalPages - 1));
        const pageCmds   = commands.slice(safePage * pageSize, (safePage + 1) * pageSize);
        const dotEmoji   = getHelpEmoji(theme, 'star', DEFAULT_DOT_EMOJI);

        const lines = pageCmds.map(cmd => {
            const displayName = this.getCommandDisplayName(cmd);
            const aliasStr = (cmd.aliases && cmd.aliases.length)
                ? ` *(${cmd.aliases.slice(0, 3).map(a => `\`${a}\``).join(', ')})*`
                : '';
            const desc = (cmd.description || 'No description provided.').slice(0, 80);
            return `> ${dotEmoji} **\`${prefix}${cmd.name}\`** — **${displayName}**${aliasStr}\n>  *${desc}*`;
        });

        const pageLabel = totalPages > 1 ? ` — Page ${safePage + 1} / ${totalPages}` : '';

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addSectionComponents(section => section
                .addTextDisplayComponents(text => text.setContent(
                    `# __${catLabel} Commands__${pageLabel}\n` +
                    `> ${catDesc}\n` +
                    `>  **${commands.length} command${commands.length !== 1 ? 's' : ''} total**`
                ))
                .setThumbnailAccessory(thumb => thumb.setURL(
                    client.user.displayAvatarURL({ extension: 'png', size: 256 })
                ))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(lines.join('\n\n')))
            .addSeparatorComponents(new SeparatorBuilder());

        // ── Navigation row ────────────────────────────────────────────────────
        const navButtons = [
            new ButtonBuilder()
                .setCustomId('help_main')
                .setLabel('Back to Menu')
                .setStyle(ButtonStyle.Primary),
        ];
        if (totalPages > 1) {
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId('help_prev')
                    .setLabel(' Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage === 0),
                new ButtonBuilder()
                    .setCustomId('help_next')
                    .setLabel('Next ')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage >= totalPages - 1),
            );
        }

        container
            .addActionRowComponents(row => row.addComponents(...navButtons))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row => row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder('Switch category...')
                    .addOptions(categoryOptions)
            ));

        return container;
    },

    // ── Search results container ──────────────────────────────────────────────
    buildSearchContainer(theme, query, results, client) {
        const accentColor = getThemeColor(theme);

        const resultsList = results.map(cmd => {
            const displayName = this.getCommandDisplayName(cmd);
            const cat = cmd.category || 'General';
            return `> **\`${prefix}${cmd.name}\`** — **${displayName}** \`[${cat}]\`\n>  *${cmd.description || 'No description'}*`;
        }).join('\n\n');

        return new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(text => text.setContent(
                `# __Search Results for "${query}"__\n` +
                `> Found **${results.length}** matching command(s)`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(resultsList))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(
                `> *Use \`${prefix}help\` to return to the main menu*`
            ));
    },

    // ── Category not found ────────────────────────────────────────────────────
    async showCategoryNotFound(message, categoryName, theme, client) {
        const accentColor = getThemeColor(theme);

        const categories = this.getCategories(client);
        const catList = categories.join(', ');

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(text => text.setContent(
                `# __Category Not Found__\n\n` +
                `> The category \`${categoryName}\` does not exist.\n\n` +
                `**Available categories:**\n> ${catList}`
            ));

        return await message.reply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container]
        }).catch(() => { });
    },

    // ── No search results ─────────────────────────────────────────────────────
    async showNoResults(message, query, theme, client) {
        const accentColor = getThemeColor(theme);

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(text => text.setContent(
                `# __No Results Found__\n\n` +
                `> No commands found matching \`${query}\`.\n` +
                `> Try \`${prefix}help\` to browse all categories.`
            ));

        return await message.reply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container]
        }).catch(() => { });
    },

    // ── Interaction collector ─────────────────────────────────────────────────
    setupInteractionCollector(sentMessage, userId, theme, client, state = null) {
        const collector = sentMessage.createMessageComponentCollector({
            time: 600000,
            filter: (i) => i.user.id === userId
        });

        collector.on("collect", async (interaction) => {
            try {
                if (interaction.isStringSelectMenu() && interaction.customId === "help_category") {
                    if (state) { state.view = 'category'; state.categoryName = interaction.values[0]; state.page = 0; }
                    await this.handleCategorySelection(interaction, interaction.values[0], theme, client, 0);
                } else if (interaction.isButton() && interaction.customId === "help_main") {
                    if (state) { state.view = 'main'; state.categoryName = null; state.page = 0; }
                    await this.showMainHelpPage(interaction, theme, client);
                } else if (interaction.isButton() && interaction.customId === "help_prev") {
                    if (state && state.page > 0) state.page--;
                    await this.handleCategorySelection(interaction, state.categoryName, theme, client, state.page);
                } else if (interaction.isButton() && interaction.customId === "help_next") {
                    if (state) state.page++;
                    await this.handleCategorySelection(interaction, state.categoryName, theme, client, state.page);
                }
            } catch (err) {
                console.error("[HELP INTERACTION] Error:", err);
            }
        });

        collector.on("end", () => {
            sentMessage.edit({ components: [] }).catch(() => { });
        });
    },

    // ── Show main help page (from interaction) ────────────────────────────────
    async showMainHelpPage(interaction, theme, client) {
        await interaction.deferUpdate().catch(() => {});
        const botName = interaction.client.user.username;
        const categories = this.getCategories(client);
        const categoryOptions = this.buildCategoryOptions(categories, theme, client);
        const container = this.buildMainContainer(theme, botName, categoryOptions, client, interaction.guild);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container],
            files: [new AttachmentBuilder(DIVIDER_BUFFER, { name: 'divider.gif' })]
        }).catch(err => console.error("[HELP] Failed to update main page:", err));
    },

    // ── Handle category dropdown selection ────────────────────────────────────
    async handleCategorySelection(interaction, categoryName, theme, client, page = 0) {
        await interaction.deferUpdate().catch(() => {});
        const commands = this.loadCommandsFromCategory(categoryName, client);

        if (commands.length === 0) {
            const accentColor = getThemeColor(theme);
            const container = new ContainerBuilder()
                .setAccentColor(accentColor)
                .addTextDisplayComponents(text => text.setContent(
                    `#  __No Commands Found__\n> Category \`${categoryName}\` has no commands.`
                ));
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2 || 0,
                components: [container]
            }).catch(() => {});
        }

        const container = await this.buildCategoryContainer(theme, categoryName, commands, client, interaction.guild, null, page);
        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2 || 0,
            components: [container]
        }).catch(err => console.error("[HELP] Failed to update category page:", err));
    },
};
