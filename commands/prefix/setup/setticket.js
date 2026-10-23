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
    StringSelectMenuBuilder,
    ChannelType,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

// ─── Custom emojis for ticket categories ──────────────────────────────────────
// name  = Discord emoji identifier used in <:name:id> format (no spaces)
// label = Human-readable display name shown as the category name
const TICKET_EMOJIS = [
    { id: '<:15367531955299287861:1537451407240728616>', name: 'pub',        label: 'Pub',         fallback: '📢' },
    { id: '<:15367538686277797061:1537451662321647666>', name: 'bugs',       label: 'Bugs',        fallback: '🐞' },
    { id: '<:15367549424115426381:1537451961769664562>', name: 'abuse',      label: 'Abuse',       fallback: '🚨' },
    { id: '<a:13718505349857935981:1537455431599788163>', name: 'server',     label: 'Server',      fallback: '🖥️' },
    { id: '<:15367544377150095461:1537455650034942093>', name: 'staffabuse', label: 'Staff Abuse', fallback: '🛡️' },
    { id: '<:15367551382057165311:1537455876238213241>', name: 'donate',     label: 'Donate',      fallback: '💳' },
];

function parseTicketEmoji(value) {
    if (typeof value !== 'string') return null;
    const input = value.trim();
    const match = input.match(/^<(?<animated>a?):(?<name>[A-Za-z0-9_~]+):(?<id>\d{15,21})>$/);
    if (match?.groups) {
        return {
            id: match.groups.id,
            name: match.groups.name,
            animated: Boolean(match.groups.animated)
        };
    }
    return /^\d{15,21}$/.test(input)
        ? { id: input, name: null, animated: false }
        : null;
}

function resolveTicketEmoji(guild, entry) {
    const configured = parseTicketEmoji(entry?.id);
    const emojiCache = guild?.emojis?.cache;
    const emoji = configured?.id
        ? emojiCache?.get(configured.id)
        : null;
    const byName = !emoji && entry?.name
        ? emojiCache?.find((candidate) => candidate.name === entry.name)
        : null;
    const resolved = emoji || byName;

    if (resolved) {
        return {
            id: resolved.id,
            name: resolved.name,
            animated: Boolean(resolved.animated)
        };
    }

    return { name: entry?.fallback || '🎫' };
}

function getCategoryEmojiPayload(guild, category) {
    const configured = parseTicketEmoji(category?.emojiId);
    const emojiCache = guild?.emojis?.cache;
    const emoji = configured?.id ? emojiCache?.get(configured.id) : null;
    const byName = !emoji && category?.emojiName
        ? emojiCache?.find((candidate) => candidate.name === category.emojiName)
        : null;
    const resolved = emoji || byName;

    if (resolved) {
        return {
            id: resolved.id,
            name: resolved.name,
            animated: Boolean(resolved.animated)
        };
    }

    return { name: category?.emojiUnicode || '🎫' };
}

function getCategoryEmojiText(guild, category) {
    const emoji = getCategoryEmojiPayload(guild, category);
    return emoji.id
        ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`
        : emoji.name;
}

// ─── Temp session: guildId → { total, categories, index, editingIndex } ───────
const _tempData = new Map();

export default {
    name: 'setticket',
    description: 'Configure the ticket system with categories, channels, and settings',
    usage: '&setticket',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        try {
            const guildId    = message.guild.id;
            // Refresh the guild emoji cache so newly added file entries are
            // resolved immediately instead of being sent as stale IDs.
            await message.guild.emojis.fetch().catch(() => {});
            const theme      = await themeManager.getTheme(guildId);
            const themeColor = Number(theme.color) || 0x010101;
            const settings   = await GuildConfig.findOne({ guildId });

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [_buildMain(settings, theme, themeColor, client, message.guild)]
            });

            _setupCollector(sent, message, theme, themeColor, client);
        } catch (err) {
            console.error('[TicketSetup] Error:', err);
            await message.reply({ content: ' An error occurred while setting up the ticket system. Please try again.' });
        }
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// COLLECTOR
// ═════════════════════════════════════════════════════════════════════════════
function _setupCollector(sent, message, theme, themeColor, client) {
    const guildId = message.guild.id;

    const filter = i =>
        i.user.id === message.author.id &&
        i.customId.startsWith('setticket_');

    const collector = sent.createMessageComponentCollector({ filter, time: 300_000 });

    collector.on('collect', async interaction => {
        try {
            await message.guild.emojis.fetch().catch(() => {});
            const id = interaction.customId;

            // ── DONE ─────────────────────────────────────────────────────────
            if (id === 'setticket_done') {
                collector.stop('done');
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `##  Setup Complete\n> Ticket system configuration saved.`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                                    )
                            )
                    ]
                });
            }

            // ── CHANNEL SELECTS ───────────────────────────────────────────────
            if (id === 'setticket_channel') {
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketChannelId: interaction.values[0] } }, { upsert: true });
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }
            if (id === 'setticket_logs') {
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketLogsChannelId: interaction.values[0] } }, { upsert: true });
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }
            if (id === 'setticket_category') {
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategoryId: interaction.values[0] } }, { upsert: true });
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }
            if (id === 'setticket_admin_role') {
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketAdminRoleIds: interaction.values } }, { upsert: true });
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }

            // ── SET BANNER (modal) ────────────────────────────────────────────
            if (id === 'setticket_set_banner') {
                const cur      = await GuildConfig.findOne({ guildId });
                const urlInput = new TextInputBuilder()
                    .setCustomId('banner_url_input')
                    .setLabel('Banner Image URL (GIF or PNG)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('https://example.com/banner.gif')
                    .setRequired(true)
                    .setMaxLength(512);
                if (cur?.ticketBannerUrl) urlInput.setValue(cur.ticketBannerUrl);

                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId('setticket_banner_modal')
                        .setTitle('Configure Ticket Panel Banner')
                        .addComponents(new ActionRowBuilder().addComponents(urlInput))
                );

                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'setticket_banner_modal',
                    time: 120_000
                }).catch(() => null);
                if (!res) return;

                await GuildConfig.findOneAndUpdate(
                    { guildId },
                    { $set: { ticketBannerUrl: res.fields.getTextInputValue('banner_url_input').trim() } },
                    { upsert: true }
                );
                await res.deferUpdate().catch(() => {});
                const updated = await GuildConfig.findOne({ guildId });
                return res.message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildMain(updated, theme, themeColor, client, message.guild)]
                }).catch(() => {});
            }

            // ══════════════════════════════════════════════════════════════════
            // ADD CATEGORIES BUTTON
            // Flow: modal (name/ID) → silent/show picker → count picker → create
            // ══════════════════════════════════════════════════════════════════
            if (id === 'setticket_cfg_categories') {
                const modal = new ModalBuilder()
                    .setCustomId('setticket_addcat_modal')
                    .setTitle('Configure Ticket Categories')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('cat_name_or_id')
                                .setLabel('Category Name or Discord Category ID')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('e.g., Support or 1234567890123456789')
                                .setRequired(true)
                                .setMaxLength(100)
                        )
                    );

                await interaction.showModal(modal);

                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'setticket_addcat_modal',
                    time: 120_000
                }).catch(() => null);
                if (!res) return;

                const nameOrId = res.fields.getTextInputValue('cat_name_or_id').trim();
                const existing = _tempData.get(guildId) || {};
                _tempData.set(guildId, { ...existing, mode: 'create', categories: [], index: 0, addCatValue: nameOrId });

                await res.deferUpdate().catch(() => {});
                return res.message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildSilentShowPicker(themeColor, theme, client, message.guild)]
                }).catch(() => {});
            }

            // ── Display Style button (from main panel) → style picker only ───────
            if (id === 'setticket_style_picker') {
                const existing = _tempData.get(guildId) || {};
                _tempData.set(guildId, { ...existing, mode: 'style_only' });
                const cur = await GuildConfig.findOne({ guildId });
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildStylePicker(themeColor, theme, cur?.ticketStyle || 'buttons', client, message.guild)]
                });
            }

            // ── Buttons / Select chosen ───────────────────────────────────────────
            if (id === 'setticket_style_buttons' || id === 'setticket_style_select') {
                const newStyle = id === 'setticket_style_buttons' ? 'buttons' : 'select';
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketStyle: newStyle } }, { upsert: true });

                const temp = _tempData.get(guildId);
                if (temp?.mode === 'create') {
                    // Continue create flow → emoji picker for first category
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildEmojiPickerCreate(themeColor, theme, 1, temp.total, client, message.guild)]
                    });
                }
                // Style-only change → back to main
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }

            // ── Silent / Show chosen → save and go to count picker ────────────
            if (id === 'setticket_silent' || id === 'setticket_show') {
                const isSilent = id === 'setticket_silent';
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketSilent: isSilent } }, { upsert: true });
                const existing = _tempData.get(guildId) || {};
                _tempData.set(guildId, { ...existing, mode: 'create', categories: existing.categories || [], index: existing.index || 0 });
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildCountPicker(themeColor, theme, client, message.guild)]
                });
            }

            // ── Count picked → show Display Style picker ──────────────────────
            if (id.startsWith('setticket_count_')) {
                const total    = parseInt(id.replace('setticket_count_', ''), 10);
                const existing = _tempData.get(guildId) || {};
                _tempData.set(guildId, { ...existing, total, categories: [], index: 0, mode: 'create' });
                const cur = await GuildConfig.findOne({ guildId });
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildStylePicker(themeColor, theme, cur?.ticketStyle || 'buttons', client, message.guild)]
                });
            }

            // emoji picked during CREATE flow
            if (id.startsWith('setticket_emoji_create_')) {
                const emojiIdx = parseInt(id.replace('setticket_emoji_create_', ''), 10);
                const emoji    = TICKET_EMOJIS[emojiIdx];
                const temp     = _tempData.get(guildId);

                // Guard: stale/invalid state — acknowledge and recover to main
                if (!temp || temp.mode !== 'create') {
                    return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
                }
                // Guard: invalid emoji index from stale button
                if (!emoji) {
                    return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
                }

                // Category name = the emoji's display label (Pub, Bugs, Abuse…)
                const catName = emoji.label;
                const selectedEmoji = resolveTicketEmoji(message.guild, emoji);

                temp.categories.push({
                    name:        catName,
                    description: catName,   // mirrors name; user can edit later
                    emojiId:      selectedEmoji.id || null,
                    emojiName:    selectedEmoji.id ? selectedEmoji.name : null,
                    emojiUnicode: selectedEmoji.id ? null : selectedEmoji.name
                });
                temp.index = temp.categories.length;

                if (temp.categories.length < temp.total) {
                    // More categories to assign emojis to — show next step (1-based label)
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildEmojiPickerCreate(themeColor, theme, temp.categories.length + 1, temp.total, client, message.guild)]
                    });
                } else {
                    // All done — save and return to main
                    const categories = [...temp.categories];
                    _tempData.delete(guildId);
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategories: categories } }, { upsert: true });
                    await interaction.deferUpdate().catch(() => {});
                    const updated = await GuildConfig.findOne({ guildId });
                    return interaction.message.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildMain(updated, theme, themeColor, client, message.guild)]
                    }).catch(() => {});
                }
            }

            // ══════════════════════════════════════════════════════════════════
            // CATEGORY EDITOR — Select & edit individual categories
            // ══════════════════════════════════════════════════════════════════
            if (id === 'setticket_edit_cat') {
                const idx = parseInt(interaction.values[0], 10);
                const cur = await GuildConfig.findOne({ guildId });
                const cat = cur?.ticketCategories?.[idx];
                if (!cat) return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
                _tempData.set(guildId, { ...(_tempData.get(guildId) || {}), editingIndex: idx, mode: 'edit' });
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildCategoryEditPanel(cat, idx, themeColor, theme, client, message.guild)]
                });
            }

            // ══════════════════════════════════════════════════════════════════
            // CONDITIONS — Set per-category conditions shown when ticket opens
            // ══════════════════════════════════════════════════════════════════
            if (id === 'setticket_conditions_cat') {
                const idx = parseInt(interaction.values[0], 10);
                const cur = await GuildConfig.findOne({ guildId });
                const cat = cur?.ticketCategories?.[idx];
                if (!cat) return _goMain(interaction, guildId, theme, themeColor, client, message.guild);

                const condInput = new TextInputBuilder()
                    .setCustomId('conditions_text')
                    .setLabel(`Requirements for "${cat.name}"`.slice(0, 45))
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('e.g., Please provide your username and order number…')
                    .setMaxLength(1000)
                    .setRequired(false);
                if (cat.conditions) condInput.setValue(cat.conditions);

                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId(`setticket_conditions_modal_${idx}`)
                        .setTitle(`Configure Requirements — ${cat.name}`.slice(0, 45))
                        .addComponents(new ActionRowBuilder().addComponents(condInput))
                );

                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === `setticket_conditions_modal_${idx}`,
                    time: 120_000
                }).catch(() => null);
                if (!res) return;

                const text = res.fields.getTextInputValue('conditions_text').trim();
                const freshCats = (await GuildConfig.findOne({ guildId }))?.ticketCategories || [];
                if (freshCats[idx]) freshCats[idx].conditions = text || null;
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategories: freshCats } }, { upsert: true });
                await res.deferUpdate().catch(() => {});
                const updated = await GuildConfig.findOne({ guildId });
                return res.message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildMain(updated, theme, themeColor, client, message.guild)]
                }).catch(() => {});
            }

            // Edit name & description of selected category
            if (id === 'setticket_edit_info') {
                const temp = _tempData.get(guildId);
                if (!temp || temp.editingIndex === undefined) return;
                const cur  = await GuildConfig.findOne({ guildId });
                const cat  = cur?.ticketCategories?.[temp.editingIndex];
                if (!cat) return;

                const nameInput = new TextInputBuilder()
                    .setCustomId('edit_cat_name')
                    .setLabel('Category Name')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(32)
                    .setValue(cat.name);
                const descInput = new TextInputBuilder()
                    .setCustomId('edit_cat_desc')
                    .setLabel('Category Description')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setValue(cat.description);

                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId('setticket_edit_modal')
                        .setTitle(`Edit Category — ${cat.name}`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(nameInput),
                            new ActionRowBuilder().addComponents(descInput)
                        )
                );

                const res = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === interaction.user.id && i.customId === 'setticket_edit_modal',
                    time: 120_000
                }).catch(() => null);
                if (!res) return;

                const newName = res.fields.getTextInputValue('edit_cat_name').trim();
                const newDesc = res.fields.getTextInputValue('edit_cat_desc').trim();
                const freshDb = await GuildConfig.findOne({ guildId });
                const cats    = [...(freshDb?.ticketCategories || [])];
                if (!cats[temp.editingIndex]) return;
                cats[temp.editingIndex].name        = newName;
                cats[temp.editingIndex].description = newDesc;

                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategories: cats } }, { upsert: true });
                await res.deferUpdate().catch(() => {});
                const updated = await GuildConfig.findOne({ guildId });
                const updCat  = updated.ticketCategories[temp.editingIndex];
                return res.message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildCategoryEditPanel(updCat, temp.editingIndex, themeColor, theme, client, message.guild)]
                }).catch(() => {});
            }

            // Show emoji picker for editing a category
            if (id === 'setticket_edit_emoji') {
                const temp = _tempData.get(guildId);
                if (!temp || temp.editingIndex === undefined) return;
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildEmojiPickerEdit(themeColor, theme, temp.editingIndex, client, message.guild)]
                });
            }

            // Emoji picked during EDIT flow
            if (id.startsWith('setticket_emoji_edit_')) {
                const [, , , catIdxStr, emojiIdxStr] = id.split('_');
                // id format: setticket_emoji_edit_CATIDX_EMOJIIDX
                const parts    = id.split('_');
                const catIdx   = parseInt(parts[3], 10);
                const emojiIdx = parseInt(parts[4], 10);
                const emoji    = TICKET_EMOJIS[emojiIdx];

                const freshDb = await GuildConfig.findOne({ guildId });
                const cats    = [...(freshDb?.ticketCategories || [])];
                if (!cats[catIdx]) return;
                const selectedEmoji = resolveTicketEmoji(message.guild, emoji);
                cats[catIdx].emojiId      = selectedEmoji.id || null;
                cats[catIdx].emojiName    = selectedEmoji.id ? selectedEmoji.name : null;
                cats[catIdx].emojiUnicode = selectedEmoji.id ? null : selectedEmoji.name;

                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategories: cats } }, { upsert: true });
                await interaction.deferUpdate().catch(() => {});
                const updated = await GuildConfig.findOne({ guildId });
                const updCat  = updated.ticketCategories[catIdx];
                return interaction.message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildCategoryEditPanel(updCat, catIdx, themeColor, theme, client, message.guild)]
                }).catch(() => {});
            }

            // Delete selected category
            if (id === 'setticket_edit_del') {
                const temp = _tempData.get(guildId);
                if (!temp || temp.editingIndex === undefined) return;
                const freshDb = await GuildConfig.findOne({ guildId });
                const cats    = [...(freshDb?.ticketCategories || [])];
                cats.splice(temp.editingIndex, 1);
                await GuildConfig.findOneAndUpdate({ guildId }, { $set: { ticketCategories: cats } }, { upsert: true });
                _tempData.delete(guildId);
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }

            // Back to main from edit panel
            if (id === 'setticket_edit_back') {
                _tempData.delete(guildId);
                return _goMain(interaction, guildId, theme, themeColor, client, message.guild);
            }

            // ── SEND PANEL ────────────────────────────────────────────────────
            if (id === 'setticket_send_panel') {
                const cur = await GuildConfig.findOne({ guildId });
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildSendSelector(themeColor, theme, cur, client, message.guild)]
                });
            }

            if (id === 'setticket_panel_channel') {
                const channel = message.guild.channels.cache.get(interaction.values[0]);
                if (!channel) return interaction.deferUpdate().catch(() => {});
                await interaction.deferUpdate().catch(() => {});
                const cur = await GuildConfig.findOne({ guildId });
                await channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [_buildPublicPanel(cur, theme, themeColor, client, message.guild)],
                    allowedMentions: { parse: [] }
                }).catch(e => console.error('[TicketSetup] send error:', e));
                return _goMainEdit(interaction, guildId, theme, themeColor, client, message.guild);
            }

        } catch (err) {
            console.error('[TicketSetup] Collector error:', err);
            try { await interaction.reply({ content: ' An error occurred while processing your request.', ephemeral: true }); } catch {}
        }
    });
}

// ─── Category creation step helper ───────────────────────────────────────────
async function _runCategoryStep(interaction, guildId, theme, themeColor, client, guild, stepIndex, total) {
    const sessionData = _tempData.get(guildId) || {};
    // Pre-fill name from Add Categories modal on step 0 (truncate to 32-char field limit)
    const prefillName = stepIndex === 0 && sessionData.addCatValue
        ? sessionData.addCatValue.slice(0, 32)
        : '';

    const nameInput = new TextInputBuilder()
        .setCustomId('cat_name')
        .setLabel('Category Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Report, Bugs, Support…')
        .setRequired(true).setMaxLength(32);
    if (prefillName) nameInput.setValue(prefillName);

    const modal = new ModalBuilder()
        .setCustomId(`setticket_cat_modal_${stepIndex}`)
        .setTitle(`Configure Category ${stepIndex + 1} of ${total}`)
        .addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('cat_desc')
                    .setLabel('Category Description')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., Report spam or advertisement')
                    .setRequired(true).setMaxLength(100)
            )
        );

    await interaction.showModal(modal);

    const res = await interaction.awaitModalSubmit({
        filter: i => i.user.id === interaction.user.id && i.customId === `setticket_cat_modal_${stepIndex}`,
        time: 120_000
    }).catch(() => null);
    if (!res) { _tempData.delete(guildId); return; }

    const temp = _tempData.get(guildId);
    if (!temp || temp.mode !== 'create') return;
    temp.categories.push({
        name:        res.fields.getTextInputValue('cat_name').trim(),
        description: res.fields.getTextInputValue('cat_desc').trim()
    });

    await res.deferUpdate().catch(() => {});
    return res.message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [_buildEmojiPickerCreate(themeColor, theme, stepIndex + 1, total, client, guild)]
    }).catch(() => {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function _goMain(interaction, guildId, theme, themeColor, client, guild) {
    const s = await GuildConfig.findOne({ guildId });
    return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [_buildMain(s, theme, themeColor, client, guild)]
    });
}
async function _goMainEdit(interaction, guildId, theme, themeColor, client, guild) {
    const s = await GuildConfig.findOne({ guildId });
    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [_buildMain(s, theme, themeColor, client, guild)]
    }).catch(() => {});
}

// ═════════════════════════════════════════════════════════════════════════════
// PANEL BUILDERS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Main setup panel ─────────────────────────────────────────────────────────
function _buildMain(settings, theme, themeColor, client, guild) {
    const ticketCh   = settings?.ticketChannelId      ? `<#${settings.ticketChannelId}>`      : '`Not set`';
    const logsCh     = settings?.ticketLogsChannelId  ? `<#${settings.ticketLogsChannelId}>`  : '`Not set`';
    const adminRoles = settings?.ticketAdminRoleIds?.length
        ? settings.ticketAdminRoleIds.map(id => `<@&${id}>`).join(', ') : '`Not set`';
    const style      = settings?.ticketStyle || 'buttons';
    const silent     = settings?.ticketSilent ?? false;
    const categories = settings?.ticketCategories || [];
    const bannerSet  = settings?.ticketBannerUrl ? ' Custom' : ' Default';
    const bannerUrl  = settings?.ticketBannerUrl || getPanelBanner(guild, client);
    const thumb      = theme.images?.thumbnail || client.user.displayAvatarURL();

    const c = new ContainerBuilder().setAccentColor(themeColor);

    // Banner
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Ticket System Setup')
        )
    );
    c.addSeparatorComponents(new SeparatorBuilder());

    // Header
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##  Ticket System Configuration\n` +
                    `>  **Ticket Channel:** ${ticketCh}\n` +
                    `>  **Logs Channel:** ${logsCh}\n` +
                    `>  **Ticket Category:** ${settings?.ticketCategoryId ? `<#${settings.ticketCategoryId}>` : '`Not set`'}\n` +
                    `>  **Admin Roles:** ${adminRoles}\n` +
                    `>  **Display Style:** \`${style === 'buttons' ? 'Buttons' : 'Select Menu'}\`\n` +
                    `>  **Confirmation Mode:** \`${silent ? ' Silent (ephemeral)' : ' Public'}\`\n` +
                    `>  **Panel Banner:** ${bannerSet}`
                )
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
    );
    c.addSeparatorComponents(new SeparatorBuilder());

    // Selects
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('setticket_channel')
            .setPlaceholder('Select ticket submissions channel')
            .setChannelTypes(ChannelType.GuildText)
    ));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('setticket_logs')
            .setPlaceholder('Select ticket logs channel')
            .setChannelTypes(ChannelType.GuildText)
    ));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('setticket_category')
            .setPlaceholder('Select category for ticket channels')
            .setChannelTypes(ChannelType.GuildCategory)
    ));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('setticket_admin_role')
            .setPlaceholder('Select ticket admin role(s)').setMaxValues(5)
    ));
    c.addSeparatorComponents(new SeparatorBuilder());

    // ── Categories section ────────────────────────────────────────────────────
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Ticket Categories** (${categories.length} / 6)`)
    );

    if (categories.length > 0) {
        // Direct category selection dropdown
        c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('setticket_edit_cat')
                .setPlaceholder('Select a category to edit')
                .addOptions(
                    categories.map((cat, i) => ({
                        label:       cat.name,
                        description: cat.description.slice(0, 100),
                        value:       String(i),
                        emoji:       getCategoryEmojiPayload(guild, cat)
                    }))
                )
        ));
        c.addSeparatorComponents(new SeparatorBuilder());

        // List
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                categories.map(cat =>
                    `> ${getCategoryEmojiText(guild, cat)}  **${cat.name}** — ${cat.description}`
                ).join('\n')
            )
        );
        c.addSeparatorComponents(new SeparatorBuilder());

        // Conditions dropdown — pick a category to set its open-ticket conditions
        c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('setticket_conditions_cat')
                .setPlaceholder('Select a category to configure requirements')
                .addOptions(
                    categories.map((cat, i) => ({
                        label:       cat.name,
                        description: cat.conditions
                            ? ` ${cat.conditions.slice(0, 90)}`
                            : ' No requirements configured',
                        value:       String(i),
                        emoji:       getCategoryEmojiPayload(guild, cat)
                    }))
                )
        ));

        // Style button only (no blue configure button when categories exist)
        c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setticket_style_picker')
                .setLabel('Display Style')
                .setStyle(ButtonStyle.Secondary)
        ));
    } else {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> No categories configured yet. Click **Add Categories** to begin.')
        );
        c.addSeparatorComponents(new SeparatorBuilder());

        // Grey add button only when no categories (not the blue one)
        c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setticket_cfg_categories')
                .setLabel('Add Categories')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('setticket_style_picker')
                .setLabel('Display Style')
                .setStyle(ButtonStyle.Secondary)
        ));
    }
    c.addSeparatorComponents(new SeparatorBuilder());

    // Bottom actions
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('setticket_set_banner')
            .setLabel(settings?.ticketBannerUrl ? 'Change Banner' : 'Set Banner')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('setticket_send_panel')
            .setLabel('Send Ticket Panel')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(categories.length === 0),
        new ButtonBuilder()
            .setCustomId('setticket_done')
            .setLabel('Save & Exit')
            .setStyle(ButtonStyle.Success)
    ));

    return c;
}

// ─── Silent / Show picker ─────────────────────────────────────────────────────
function _buildSilentShowPicker(themeColor, theme, client, guild) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Ticket Visibility')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Ticket Opening Confirmation\n\n` +
                        `>  **Silent** — Confirmation message is only visible to the user who opened the ticket *(ephemeral)*.\n` +
                        `>  **Public** — Confirmation message is visible to everyone in the channel.\n\n` +
                        `> Select your preferred visibility mode:`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setticket_silent')
                .setLabel(' Silent')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('setticket_show')
                .setLabel(' Show')
                .setStyle(ButtonStyle.Primary)
        ));
}

// ─── Style picker panel (kept for potential future use) ───────────────────────
function _buildStylePicker(themeColor, theme, currentStyle, client, guild, fromCfg = false) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Choose Display Style')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Display Style Configuration\n\n` +
                        `> **Buttons** — Each category appears as a clickable button.\n` +
                        `> **Select Menu** — Categories appear in a dropdown menu.\n\n` +
                        `> Current setting: \`${currentStyle === 'select' ? 'Select Menu' : 'Buttons'}\``
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setticket_style_buttons')
                .setLabel(' Buttons')
                .setStyle(currentStyle === 'buttons' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('setticket_style_select')
                .setLabel(' Select Menu')
                .setStyle(currentStyle === 'select' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        ));
}

// ─── Category edit panel ──────────────────────────────────────────────────────
function _buildCategoryEditPanel(cat, idx, themeColor, theme, client, guild) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Edit Category')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Edit Category\n\n` +
                        `> **Name:** ${cat.name}\n` +
                        `> **Description:** ${cat.description}\n` +
                        `> **Emoji:** ${getCategoryEmojiText(guild, cat)}`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setticket_edit_info')
                .setLabel('Edit Name & Description')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setticket_edit_emoji')
                .setLabel('Change Emoji')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('setticket_edit_del')
                .setLabel('Delete Category')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('setticket_edit_back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
        ));
}

// ─── Emoji picker — CREATE flow ───────────────────────────────────────────────
function _buildEmojiPickerCreate(themeColor, theme, currentNum, total, client, guild) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Choose Emoji')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Configure Category ${currentNum} of ${total}\n> Select an **emoji** for this category:`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            TICKET_EMOJIS.slice(0, 3).map((e, i) =>
                new ButtonBuilder()
                    .setCustomId(`setticket_emoji_create_${i}`)
                    .setEmoji(resolveTicketEmoji(guild, e))
                    .setStyle(ButtonStyle.Secondary)
            )
        ))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            TICKET_EMOJIS.slice(3).map((e, i) =>
                new ButtonBuilder()
                    .setCustomId(`setticket_emoji_create_${i + 3}`)
                    .setEmoji(resolveTicketEmoji(guild, e))
                    .setStyle(ButtonStyle.Secondary)
            )
        ));
}

// ─── Emoji picker — EDIT flow ─────────────────────────────────────────────────
function _buildEmojiPickerEdit(themeColor, theme, catIdx, client, guild) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Change Emoji')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Change Category Emoji\n> Select a new emoji for this category:`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            TICKET_EMOJIS.slice(0, 3).map((e, i) =>
                new ButtonBuilder()
                    .setCustomId(`setticket_emoji_edit_${catIdx}_${i}`)
                    .setEmoji(resolveTicketEmoji(guild, e))
                    .setStyle(ButtonStyle.Secondary)
            )
        ))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            TICKET_EMOJIS.slice(3).map((e, i) =>
                new ButtonBuilder()
                    .setCustomId(`setticket_emoji_edit_${catIdx}_${i + 3}`)
                    .setEmoji(resolveTicketEmoji(guild, e))
                    .setStyle(ButtonStyle.Secondary)
            )
        ));
}

// ─── Count picker ─────────────────────────────────────────────────────────────
function _buildCountPicker(themeColor, theme, client, guild) {
    const bannerUrl = getPanelBanner(guild, client);
    const thumb     = theme.images?.thumbnail || client.user.displayAvatarURL();

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Configure Categories')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  Ticket Category Configuration\n` +
                        `> How many ticket categories would you like to create?\n` +
                        `> Select between **1** and **6** categories.`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            [1, 2, 3].map(n =>
                new ButtonBuilder().setCustomId(`setticket_count_${n}`)
                    .setLabel(`${n}`).setStyle(ButtonStyle.Secondary)
            )
        ))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            [4, 5, 6].map(n =>
                new ButtonBuilder().setCustomId(`setticket_count_${n}`)
                    .setLabel(`${n}`).setStyle(ButtonStyle.Secondary)
            )
        ));
}

// ─── Send panel channel selector ──────────────────────────────────────────────
function _buildSendSelector(themeColor, theme, settings, client, guild) {
    const bannerUrl = settings?.ticketBannerUrl || getPanelBanner(guild, client);

    return new ContainerBuilder().setAccentColor(themeColor)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl).setDescription('Send Ticket Panel')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `##  Send Ticket Panel\n> Select the channel where the ticket panel will be posted.`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('setticket_panel_channel')
                .setPlaceholder('Select target channel')
                .setChannelTypes(ChannelType.GuildText)
        ));
}

// ─── Public ticket panel ──────────────────────────────────────────────────────
function _buildPublicPanel(settings, theme, themeColor, client, guild) {
    const categories = settings?.ticketCategories || [];
    const bannerUrl = typeof settings?.ticketBannerUrl === 'string'
        ? settings.ticketBannerUrl.trim()
        : '';
    const serverName = guild?.name?.trim() || 'Discord Server';

    const c = new ContainerBuilder().setAccentColor(0x8ED6F7);

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
                    `# __${serverName} • Support Tickets__\n` +
            `\n` +
            `> **Our support team is here to help.**\n` +
            `> Choose the category that best matches your request below.\n\n` +
            `-# Private tickets are for serious requests only.`
        )
    );
    c.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Large)
    );

    if (bannerUrl) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(bannerUrl)
                    .setDescription(`${serverName} Support Tickets`)
            )
        );
        c.addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
        );
    }

    if (categories.length === 0) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### 🎫 Support\n` +
                `\`Please configure at least one ticket category to continue.\``
            )
        );
    } else {
        for (const cat of categories) {
            c.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### ${getCategoryEmojiText(guild, cat)} ${cat.name}\n` +
                            `\`${cat.description}\``
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(
                                `ticket_open_${cat.name.toLowerCase().replace(/\s+/g, '_').slice(0, 80)}`
                            )
                            .setLabel(`Open ${cat.name}`.slice(0, 80))
                            .setEmoji(getCategoryEmojiPayload(guild, cat))
                            .setStyle(ButtonStyle.Primary)
                    )
            );
            c.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            );
        }
    }

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## Open a private ticket\n` +
            `Select **Open** beside the category that best describes your request.`
        )
    );

    return c;
}
