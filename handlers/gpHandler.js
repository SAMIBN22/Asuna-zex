/**
 * gpHandler.js
 * Handles all interactions that originate from the &gp control panel:
 *   - gp_panel_*      → button clicks on the main control panel
 *   - gp_modal_*      → modal submissions (avatar, banner, nick, grant)
 *   - gp_cat_select_  → category StringSelectMenu during permission grant
 *   - gp_cmd_select_  → command StringSelectMenu (one category page) during grant
 *   - gp_page_prev_/gp_page_next_ → pagination for large categories
 *   - gp_cmd_continue_/gp_cmd_backcat_ → advance to duration step / change category
 *   - gp_dur_*        → duration button clicks
 *   - gp_modal_dur_   → custom duration modal submit
 *   - gp_revoke_sel_  → revoke StringSelectMenu
 *
 * The command catalog offered for delegation is generated dynamically from
 * every command the bot has loaded — see config/grantableCommands.js — so
 * the owner can grant permission for any restricted command in the project,
 * not just a fixed pre-set list.
 */

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Routes,
} from 'discord.js';
import fetch from 'node-fetch';
import GpPermission from '../models/gpPermission.js';
import { getGrantableCatalog, getCommandLabel } from '../config/grantableCommands.js';
import config from '../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);
const PAGE_SIZE = 25; // Discord's max options per StringSelectMenu

/** In-memory session: stores pending grant data between interaction steps.
 *  key: ownerUserId → { userId, guildId, catalog, category, page, commands: Set<string> } */
const pendingGrants = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOwner(userId) {
    return OWNER_IDS.includes(String(userId));
}

/** Fetch a URL and return a base64 data-URI (node-fetch v3 compatible). */
async function toDataUri(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);

        const mime = res.headers.get('content-type')?.split(';')[0] || '';
        if (!mime.startsWith('image/')) {
            throw new Error(
                `URL did not return an image (got \`${mime || 'unknown'}\`). ` +
                `Sites like Pinterest block direct downloads — upload the image to **imgur.com** first and use that URL.`
            );
        }

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 9_000_000) throw new Error('Image is too large (max ~9 MB).');

        return `data:${mime};base64,${buf.toString('base64')}`;
    } finally {
        clearTimeout(timer);
    }
}

function durationEmbed(userId, guildId, commands) {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⏱️  Set Permission Duration')
        .setDescription(
            `**User:** <@${userId}> (\`${userId}\`)\n` +
            `**Guild:** \`${guildId}\`\n` +
            `**Commands:** ${commands.map(c => `\`${c}\``).join(', ')}\n\n` +
            'Choose how long this permission should last:'
        );
}

function durRow(userId, guildId) {
    const base = `${userId}_${guildId}`;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gp_dur_lifetime_${base}`).setLabel('Lifetime').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`gp_dur_month_${base}`).setLabel('1 Month').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`gp_dur_week_${base}`).setLabel('1 Week').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`gp_dur_hour_${base}`).setLabel('1 Hour').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`gp_dur_custom_${base}`).setLabel('Custom…').setStyle(ButtonStyle.Danger),
    );
}

/** Parse a plain-English duration string into a Date (or null for lifetime). */
function parseDuration(raw) {
    const s = raw.toLowerCase().trim();
    if (['forever', 'lifetime', 'permanent', '0'].includes(s)) return null;

    const map = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
    const match = s.match(/^(\d+)\s*([smhdw])/);
    if (match) {
        const ms = parseInt(match[1]) * (map[match[2]] || 1) * 1000;
        return new Date(Date.now() + ms);
    }
    // Fallback: try natural parsing
    const ms = Date.parse(s);
    if (!isNaN(ms)) return new Date(ms);
    return null; // treat unknown as lifetime
}

function fmtExpiry(d) {
    if (!d) return '∞ Lifetime';
    return `<t:${Math.floor(d.getTime() / 1000)}:R>`;
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function handleGpInteraction(interaction, client) {
    const cid = interaction.customId;

    // ── Main panel buttons ───────────────────────────────────────────────────
    if (cid === 'gp_panel_avatar') return openAvatarModal(interaction);
    if (cid === 'gp_panel_banner') return openBannerModal(interaction);
    if (cid === 'gp_panel_nick')   return openNickModal(interaction);
    if (cid === 'gp_panel_grant')  return openGrantModal(interaction);
    if (cid === 'gp_panel_revoke') return openRevokeFlow(interaction);
    if (cid === 'gp_panel_list')   return listPermissions(interaction);

    // ── Modal submissions ────────────────────────────────────────────────────
    if (cid === 'gp_modal_avatar')  return applyAvatar(interaction);
    if (cid === 'gp_modal_banner')  return applyBanner(interaction);
    if (cid === 'gp_modal_nick')    return applyNick(interaction);
    if (cid === 'gp_modal_grant')   return afterGrantModal(interaction);
    if (cid === 'gp_modal_dur')     return applyCustomDuration(interaction);

    // ── Category / command selection (grant flow) ───────────────────────────
    if (cid.startsWith('gp_cat_select_'))   return afterCategorySelect(interaction);
    if (cid.startsWith('gp_cmd_select_'))   return afterCmdSelect(interaction);
    if (cid.startsWith('gp_page_prev_'))    return changePage(interaction, -1);
    if (cid.startsWith('gp_page_next_'))    return changePage(interaction, 1);
    if (cid.startsWith('gp_cmd_continue_')) return afterCommandsChosen(interaction);
    if (cid.startsWith('gp_cmd_backcat_'))  return backToCategory(interaction);

    // ── Duration buttons ─────────────────────────────────────────────────────
    if (cid.startsWith('gp_dur_')) return applyDuration(interaction);

    // ── Revoke select ────────────────────────────────────────────────────────
    if (cid.startsWith('gp_revoke_sel_')) return applyRevoke(interaction);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function openAvatarModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('gp_modal_avatar')
        .setTitle('Change Bot Guild Avatar');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('avatar_url')
                .setLabel('Image URL (PNG / JPG / GIF / WEBP)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://i.imgur.com/...')
                .setRequired(true)
        )
    );
    return interaction.showModal(modal);
}

async function applyAvatar(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const url = interaction.fields.getTextInputValue('avatar_url').trim();
    try {
        const dataUri = await toDataUri(url);
        await interaction.client.rest.patch(
            Routes.guildMember(interaction.guild.id, '@me'),
            { body: { avatar: dataUri } }
        );
        await interaction.guild.members.fetch({ user: interaction.client.user.id, force: true }).catch(() => {});
        await interaction.editReply({
            content: `> <a:15161073033491252751:1522709165607354518> Guild avatar updated successfully.\n> <a:14346394266039747371:1522709560228319354> Run \`&gp\` to see the new avatar.`,
        });
    } catch (e) {
        await interaction.editReply({
            content: `> <a:15218346115192628311:1522708751495335996> Failed to update avatar: \`${e.message}\``,
        });
    }
}

// ── Banner ────────────────────────────────────────────────────────────────────

function openBannerModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('gp_modal_banner')
        .setTitle('Change Bot Guild Banner');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('banner_url')
                .setLabel('Image URL (PNG / JPG / GIF / WEBP)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://i.imgur.com/...')
                .setRequired(true)
        )
    );
    return interaction.showModal(modal);
}

async function applyBanner(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const url = interaction.fields.getTextInputValue('banner_url').trim();
    try {
        const dataUri = await toDataUri(url);
        await interaction.client.rest.patch(
            Routes.guildMember(interaction.guild.id, interaction.client.user.id),
            { body: { banner: dataUri } }
        );
        await interaction.guild.members.fetch({ user: interaction.client.user.id, force: true }).catch(() => {});
        await interaction.editReply({
            content: `> <a:15161073033491252751:1522709165607354518> Guild banner updated successfully.\n> <a:14346394266039747371:1522709560228319354> Run \`&gp\` to see the new banner.`,
        });
    } catch (e) {
        await interaction.editReply({
            content: `> <a:15218346115192628311:1522708751495335996> Failed to update banner: \`${e.message}\``,
        });
    }
}

// ── Nickname ──────────────────────────────────────────────────────────────────

function openNickModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('gp_modal_nick')
        .setTitle('Change Bot Guild Nickname');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('nick_value')
                .setLabel('New nickname (leave blank to reset)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter nickname or leave empty…')
                .setRequired(false)
                .setMaxLength(32)
        )
    );
    return interaction.showModal(modal);
}

async function applyNick(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const nick = interaction.fields.getTextInputValue('nick_value').trim() || null;
    try {
        await interaction.client.rest.patch(
            Routes.guildMember(interaction.guild.id, '@me'),
            { body: { nick: nick ?? '' } }
        );
        const msg = nick
            ? `> <a:15161073033491252751:1522709165607354518> Nickname set to **${nick}**.`
            : `> <a:15161073033491252751:1522709165607354518> Nickname reset to default.`;
        await interaction.editReply({ content: msg });
    } catch (e) {
        await interaction.editReply({
            content: `> <a:15218346115192628311:1522708751495335996> Failed to set nickname: \`${e.message}\``,
        });
    }
}

// ── Grant — step 1: modal (userId + guildId) ──────────────────────────────────

function openGrantModal(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const modal = new ModalBuilder()
        .setCustomId('gp_modal_grant')
        .setTitle('Grant Command Permission');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('target_user_id')
                .setLabel('User ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('123456789012345678')
                .setRequired(true)
                .setMinLength(17)
                .setMaxLength(20)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('target_guild_id')
                .setLabel('Server ID (guild where they can use it)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('123456789012345678')
                .setRequired(true)
                .setMinLength(17)
                .setMaxLength(20)
        ),
    );
    return interaction.showModal(modal);
}

// ── Grant — step 2: show category select ─────────────────────────────────────

async function afterGrantModal(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const userId  = interaction.fields.getTextInputValue('target_user_id').trim();
    const guildId = interaction.fields.getTextInputValue('target_guild_id').trim();

    if (!/^\d{17,20}$/.test(userId) || !/^\d{17,20}$/.test(guildId)) {
        return interaction.reply({
            content: '> <a:15218346115192628311:1522708751495335996> Invalid ID format. Must be a valid Discord snowflake (17-20 digits).',
            ephemeral: true,
        });
    }

    const catalog = getGrantableCatalog(interaction.client);
    if (!catalog.size) {
        return interaction.reply({
            content: '> No grantable commands were found. Restart the bot after adding commands and try again.',
            ephemeral: true,
        });
    }

    // Store session
    pendingGrants.set(interaction.user.id, {
        userId, guildId, catalog,
        category: null, page: 0, commands: new Set(),
    });

    return interaction.reply({
        embeds:     [categoryEmbed(userId, guildId)],
        components: [categoryRow(interaction.user.id, catalog)],
        ephemeral:  true,
    });
}

function categoryEmbed(userId, guildId) {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('<:14153090909803684251:1522711390727438497>  Select a Category')
        .setDescription(
            `**Target user:** <@${userId}> (\`${userId}\`)\n` +
            `**Target guild:** \`${guildId}\`\n\n` +
            'Pick the command category to browse. You can grant commands from multiple ' +
            'categories before continuing — nothing is saved until you click **Continue**.'
        );
}

function categoryRow(ownerId, catalog) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`gp_cat_select_${ownerId}`)
        .setPlaceholder('Choose a command category…')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            [...catalog.entries()].map(([category, cmds]) =>
                new StringSelectMenuOptionBuilder()
                    .setValue(category)
                    .setLabel(category)
                    .setDescription(`${cmds.length} command${cmds.length === 1 ? '' : 's'}`)
            )
        );
    return new ActionRowBuilder().addComponents(select);
}

// ── Grant — step 3a: category chosen → show command page ─────────────────────

async function afterCategorySelect(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const session = pendingGrants.get(interaction.user.id);
    if (!session) {
        return interaction.reply({ content: '> Session expired. Please run the grant flow again.', ephemeral: true });
    }

    session.category = interaction.values[0];
    session.page = 0;

    return interaction.update(renderCommandPage(interaction.user.id, session));
}

/** Build the embed + components for the current category/page of the grant flow. */
function renderCommandPage(ownerId, session) {
    const { userId, guildId, catalog, category, page, commands } = session;
    const list       = catalog.get(category) || [];
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const slice      = list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const select = new StringSelectMenuBuilder()
        .setCustomId(`gp_cmd_select_${ownerId}`)
        .setPlaceholder(`Select commands in "${category}"…`)
        .setMinValues(0)
        .setMaxValues(slice.length)
        .addOptions(
            slice.map(cmd =>
                new StringSelectMenuOptionBuilder()
                    .setValue(cmd.name)
                    .setLabel(cmd.label)
                    .setDescription(cmd.description)
                    .setDefault(commands.has(cmd.name))
            )
        );

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gp_page_prev_${ownerId}`).setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
        new ButtonBuilder().setCustomId(`gp_page_next_${ownerId}`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
        new ButtonBuilder().setCustomId(`gp_cmd_backcat_${ownerId}`).setLabel('Change Category').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`gp_cmd_continue_${ownerId}`).setLabel('Continue').setStyle(ButtonStyle.Success).setDisabled(commands.size === 0),
    );

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`<:14153090909803684251:1522711390727438497>  ${category} — Page ${page + 1}/${totalPages}`)
        .setDescription(
            `**Target user:** <@${userId}> (\`${userId}\`)\n` +
            `**Target guild:** \`${guildId}\`\n` +
            `**Selected so far:** ${commands.size ? [...commands].map(c => `\`${c}\``).join(', ') : '*none yet*'}\n\n` +
            'Choose commands below, then click **Continue** when done. Use **Change Category** to grant commands from another category first.'
        );

    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select), navRow] };
}

// ── Grant — step 3b: commands (de)selected on the current page ───────────────

async function afterCmdSelect(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const session = pendingGrants.get(interaction.user.id);
    if (!session) {
        return interaction.reply({ content: '> Session expired. Please run the grant flow again.', ephemeral: true });
    }

    const list  = session.catalog.get(session.category) || [];
    const page  = list.slice(session.page * PAGE_SIZE, session.page * PAGE_SIZE + PAGE_SIZE);
    const pageNames = new Set(page.map(c => c.name));

    // Remove any previously-selected commands from this page, then re-add the current selection.
    for (const name of pageNames) session.commands.delete(name);
    for (const name of interaction.values) session.commands.add(name);

    return interaction.update(renderCommandPage(interaction.user.id, session));
}

// ── Grant — step 3c: pagination / navigation ──────────────────────────────────

async function changePage(interaction, delta) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const session = pendingGrants.get(interaction.user.id);
    if (!session) {
        return interaction.reply({ content: '> Session expired. Please run the grant flow again.', ephemeral: true });
    }

    const list       = session.catalog.get(session.category) || [];
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    session.page = Math.min(Math.max(0, session.page + delta), totalPages - 1);

    return interaction.update(renderCommandPage(interaction.user.id, session));
}

async function backToCategory(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const session = pendingGrants.get(interaction.user.id);
    if (!session) {
        return interaction.reply({ content: '> Session expired. Please run the grant flow again.', ephemeral: true });
    }
    session.category = null;
    session.page = 0;

    return interaction.update({
        embeds:     [categoryEmbed(session.userId, session.guildId)],
        components: [categoryRow(interaction.user.id, session.catalog)],
    });
}

// ── Grant — step 4: commands finalized → duration buttons ────────────────────

async function afterCommandsChosen(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const session = pendingGrants.get(interaction.user.id);
    if (!session || !session.commands.size) {
        return interaction.reply({ content: '> Session expired. Please run the grant flow again.', ephemeral: true });
    }

    const { userId, guildId } = session;
    const commands = [...session.commands];
    session.commands = new Set(commands); // keep as a Set for consistency

    return interaction.update({
        embeds:     [durationEmbed(userId, guildId, commands)],
        components: [durRow(userId, guildId)],
    });
}

// ── Grant — step 4a: preset duration buttons ──────────────────────────────────

async function applyDuration(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }

    const cid   = interaction.customId;                       // gp_dur_lifetime_userId_guildId
    const parts = cid.split('_');                             // ['gp','dur','<type>','<uid>','<gid>']
    const type  = parts[2];
    const userId  = parts[3];
    const guildId = parts.slice(4).join('_');                 // guildId might contain underscores

    if (type === 'custom') {
        // Show custom duration modal
        const modal = new ModalBuilder()
            .setCustomId('gp_modal_dur')
            .setTitle('Custom Duration');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('dur_value')
                    .setLabel('Duration (e.g. 7d, 48h, 30m, forever)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('30d / 12h / forever…')
                    .setRequired(true)
            )
        );
        // Temporarily re-store metadata so modal handler can retrieve it
        const session = pendingGrants.get(interaction.user.id) || {};
        session.userId  = userId;
        session.guildId = guildId;
        pendingGrants.set(interaction.user.id, session);
        return interaction.showModal(modal);
    }

    const expiresMap = {
        lifetime: null,
        month:    new Date(Date.now() + 30  * 24 * 3600 * 1000),
        week:     new Date(Date.now() + 7   * 24 * 3600 * 1000),
        hour:     new Date(Date.now() +       3600 * 1000),
    };

    const expiresAt = Object.prototype.hasOwnProperty.call(expiresMap, type) ? expiresMap[type] : null;
    const session   = pendingGrants.get(interaction.user.id);
    const commands  = session?.commands ? [...session.commands] : [];

    await savePermission(userId, guildId, commands, expiresAt);
    pendingGrants.delete(interaction.user.id);

    return interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('<a:15161073033491252751:1522709165607354518>  Permission Granted')
                .setDescription(
                    `**User:** <@${userId}> (\`${userId}\`)\n` +
                    `**Guild:** \`${guildId}\`\n` +
                    `**Commands:** ${commands.map(c => `\`${c}\``).join(', ')}\n` +
                    `**Expires:** ${fmtExpiry(expiresAt)}`
                ),
        ],
        components: [],
    });
}

// ── Grant — step 4b: custom duration modal submit ─────────────────────────────

async function applyCustomDuration(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const session = pendingGrants.get(interaction.user.id);
    if (!session) {
        return interaction.editReply({ content: '> Session expired. Run the grant flow again.' });
    }

    const raw      = interaction.fields.getTextInputValue('dur_value').trim();
    const expiresAt = parseDuration(raw);
    const { userId, guildId } = session;
    const commands = session.commands ? [...session.commands] : [];

    await savePermission(userId, guildId, commands, expiresAt);
    pendingGrants.delete(interaction.user.id);

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('<a:15161073033491252751:1522709165607354518>  Permission Granted')
                .setDescription(
                    `**User:** <@${userId}> (\`${userId}\`)\n` +
                    `**Guild:** \`${guildId}\`\n` +
                    `**Commands:** ${commands.map(c => `\`${c}\``).join(', ')}\n` +
                    `**Expires:** ${fmtExpiry(expiresAt)}`
                ),
        ],
    });
}

async function savePermission(userId, guildId, commands, expiresAt) {
    await GpPermission.findOneAndUpdate(
        { userId, guildId },
        { $set: { commands, expiresAt, grantedAt: new Date() } },
        { upsert: true, new: true }
    );
}

// ── Revoke ────────────────────────────────────────────────────────────────────

async function openRevokeFlow(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const modal = new ModalBuilder()
        .setCustomId('gp_modal_revoke')
        .setTitle('Revoke Permission');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('revoke_user_id')
                .setLabel('User ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(17).setMaxLength(20)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('revoke_guild_id')
                .setLabel('Server ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(17).setMaxLength(20)
        ),
    );
    return interaction.showModal(modal);
}

export async function handleRevokeModal(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    const userId  = interaction.fields.getTextInputValue('revoke_user_id').trim();
    const guildId = interaction.fields.getTextInputValue('revoke_guild_id').trim();

    const doc = await GpPermission.findOne({ userId, guildId });
    if (!doc || !doc.commands.length) {
        return interaction.reply({
            content: `> <a:15218346115192628311:1522708751495335996> No permissions found for user \`${userId}\` in guild \`${guildId}\`.`,
            ephemeral: true,
        });
    }

    // Show a select menu so owner can remove specific commands or all
    const opts = [
        new StringSelectMenuOptionBuilder()
            .setValue('__ALL__')
            .setLabel('⚠️  Revoke ALL permissions')
            .setDescription('Remove every granted command at once'),
        ...doc.commands.map(c =>
            new StringSelectMenuOptionBuilder()
                .setValue(c)
                .setLabel(getCommandLabel(interaction.client, c))
                .setDescription(`Revoke: ${c}`)
        ),
    ];

    const select = new StringSelectMenuBuilder()
        .setCustomId(`gp_revoke_sel_${userId}_${guildId}`)
        .setPlaceholder('Select commands to revoke…')
        .setMinValues(1)
        .setMaxValues(opts.length)
        .addOptions(opts);

    return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('🗑️  Revoke Permission')
                .setDescription(
                    `**User:** <@${userId}> (\`${userId}\`)\n` +
                    `**Guild:** \`${guildId}\`\n` +
                    `**Current commands:** ${doc.commands.map(c => `\`${c}\``).join(', ')}\n\n` +
                    'Select which permissions to revoke:'
                ),
        ],
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true,
    });
}

async function applyRevoke(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }

    // customId: gp_revoke_sel_<userId>_<guildId>
    const rest     = interaction.customId.slice('gp_revoke_sel_'.length);
    const firstUnd = rest.indexOf('_');
    const userId   = rest.slice(0, firstUnd);
    const guildId  = rest.slice(firstUnd + 1);

    const selected = interaction.values;

    if (selected.includes('__ALL__')) {
        await GpPermission.deleteOne({ userId, guildId });
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('🗑️  All Permissions Revoked')
                    .setDescription(`All permissions for <@${userId}> (\`${userId}\`) in guild \`${guildId}\` have been removed.`),
            ],
            components: [],
        });
    }

    await GpPermission.findOneAndUpdate(
        { userId, guildId },
        { $pull: { commands: { $in: selected } } }
    );

    return interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('🗑️  Permissions Revoked')
                .setDescription(
                    `Revoked \`${selected.join('`, `')}\` for <@${userId}> (\`${userId}\`) in guild \`${guildId}\`.`
                ),
        ],
        components: [],
    });
}

// ── List ──────────────────────────────────────────────────────────────────────

async function listPermissions(interaction) {
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '> Access denied.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const docs = await GpPermission.find({}).lean();
    if (!docs.length) {
        return interaction.editReply({ content: '> No permissions have been granted yet.' });
    }

    // Purge expired silently
    const now   = Date.now();
    const valid = docs.filter(d => !d.expiresAt || new Date(d.expiresAt).getTime() > now);

    if (!valid.length) {
        await GpPermission.deleteMany({});
        return interaction.editReply({ content: '> All previously granted permissions have expired and have been cleaned up.' });
    }

    const lines = valid.map(d => {
        const exp = d.expiresAt ? `<t:${Math.floor(new Date(d.expiresAt).getTime() / 1000)}:R>` : '∞';
        return `**<@${d.userId}>** in \`${d.guildId}\` — \`${d.commands.join('`, `')}\` — expires ${exp}`;
    });

    // Split into chunks if too long
    const chunks = [];
    let chunk = '';
    for (const line of lines) {
        if ((chunk + '\n' + line).length > 3800) { chunks.push(chunk); chunk = line; }
        else chunk += (chunk ? '\n' : '') + line;
    }
    if (chunk) chunks.push(chunk);

    const embeds = chunks.map((c, i) =>
        new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(i === 0 ? '<:14691048134876898091:1522759251573997648>  Granted Permissions' : null)
            .setDescription(c)
    );

    return interaction.editReply({ embeds });
}
