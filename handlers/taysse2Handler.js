/**
 * taysse2Handler.js
 *
 * Handles all button & modal interactions spawned by the &taysse2
 * "Smart Automation" owner panel:
 *   taysse2_*  custom IDs — Auto React and Auto Reply management.
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} from 'discord.js';
import AutoReact from '../models/autoReact.js';
import AutoReply from '../models/autoReply.js';
import config    from '../config/config.js';
import themeManager from '../themes/themeManager.js';

// ─── helpers ──────────────────────────────────────────────────────────────────
const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

const OWNER_IDS = (config.devIds || []).map(String);
function isOwner(id) { return OWNER_IDS.includes(String(id)); }

// ─── Panel builders ───────────────────────────────────────────────────────────

/** Main &taysse2 panel */
export async function buildMainPanel(guild, accent, client, expired = false) {
    const [reacts, replies] = await Promise.all([
        AutoReact.find({ guildId: guild.id }).lean(),
        AutoReply.find({ guildId: guild.id }).lean(),
    ]);

    const bannerUrl = client.user.displayAvatarURL({ extension: 'png', size: 512 });

    const c = new ContainerBuilder().setAccentColor(accent);

    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
                .setURL(bannerUrl)
                .setDescription('Smart Automation — Owner Panel')
        )
    );
    c.addSeparatorComponents(div());

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# Smart Automation Panel\n` +
            `> **Auto Reacts configured:** \`${reacts.length}\`\n` +
            `> **Auto Replies configured:** \`${replies.length}\`\n` +
            `> -# Only bot owners can interact with this panel.`
        )
    );
    c.addSeparatorComponents(div());

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Auto React**\nSet an emoji that the bot will automatically react with on every message a specific user sends.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder()
                    .setCustomId('taysse2_react_panel')
                    .setLabel('Manage')
                    .setEmoji('💬')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(expired)
            )
    );
    c.addSeparatorComponents(divS());

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Auto Reply**\nSet a custom text the bot will automatically reply with every time a specific user sends any message.`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder()
                    .setCustomId('taysse2_reply_panel')
                    .setLabel('Manage')
                    .setEmoji('💬')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(expired)
            )
    );

    c.addSeparatorComponents(div());

    return [c];
}

/** Auto React management sub-panel */
async function buildReactPanel(guild, accent, client, expired = false) {
    const reacts = await AutoReact.find({ guildId: guild.id }).lean();

    const c = new ContainerBuilder().setAccentColor(accent);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## Auto React Management\n` +
            `> The bot will react with the configured emoji under every message sent by these users.\n` +
            `> **Total entries:** \`${reacts.length}\``
        )
    );
    c.addSeparatorComponents(div());

    if (reacts.length === 0) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> *No auto-react entries configured yet.*`)
        );
    } else {
        const lines = reacts.map((r, i) =>
            `> \`${i + 1}.\` <@${r.userId}> (\`${r.userId}\`) — **${r.emoji}**`
        ).join('\n');
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Configured entries:**\n${lines}`)
        );
    }

    c.addSeparatorComponents(div());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('taysse2_react_add')
                .setLabel('Add')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('taysse2_react_edit')
                .setLabel('Edit Emoji')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(expired || reacts.length === 0),
            new ButtonBuilder()
                .setCustomId('taysse2_react_remove')
                .setLabel('Remove')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(expired || reacts.length === 0),
            new ButtonBuilder()
                .setCustomId('taysse2_back')
                .setLabel('← Back')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired)
        )
    );

    return [c];
}

/** Auto Reply management sub-panel */
async function buildReplyPanel(guild, accent, client, expired = false) {
    const replies = await AutoReply.find({ guildId: guild.id }).lean();

    const c = new ContainerBuilder().setAccentColor(accent);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## Auto Reply Management\n` +
            `> The bot will automatically reply with the configured text to every message sent by these users.\n` +
            `> **Total entries:** \`${replies.length}\``
        )
    );
    c.addSeparatorComponents(div());

    if (replies.length === 0) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> *No auto-reply entries configured yet.*`)
        );
    } else {
        const lines = replies.map((r, i) => {
            const preview = r.replyText.length > 60 ? r.replyText.slice(0, 57) + '...' : r.replyText;
            return `> \`${i + 1}.\` <@${r.userId}> — *"${preview}"*`;
        }).join('\n');
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Configured entries:**\n${lines}`)
        );
    }

    c.addSeparatorComponents(div());
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('taysse2_reply_add')
                .setLabel('Add')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success)
                .setDisabled(expired),
            new ButtonBuilder()
                .setCustomId('taysse2_reply_edit')
                .setLabel('Edit Reply')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(expired || replies.length === 0),
            new ButtonBuilder()
                .setCustomId('taysse2_reply_remove')
                .setLabel('Remove')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(expired || replies.length === 0),
            new ButtonBuilder()
                .setCustomId('taysse2_back')
                .setLabel('← Back')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired)
        )
    );

    return [c];
}

// ─── Modal definitions ────────────────────────────────────────────────────────

function modalReactAdd() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_react_add')
        .setTitle('Add Auto React')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('react_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID (e.g. 123456789012345678)')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('react_emoji')
                    .setLabel('Emoji')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter an emoji (e.g. 👍 or <a:name:123456789>)')
                    .setRequired(true)
                    .setMaxLength(100)
            )
        );
}

function modalReactEdit() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_react_edit')
        .setTitle('Edit Auto React Emoji')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('react_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID to update')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('react_emoji')
                    .setLabel('New Emoji')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the new emoji (e.g. ❤️ or <a:name:123456789>)')
                    .setRequired(true)
                    .setMaxLength(100)
            )
        );
}

function modalReactRemove() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_react_remove')
        .setTitle('Remove Auto React')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('react_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID to remove')
                    .setRequired(true)
                    .setMaxLength(20)
            )
        );
}

function modalReplyAdd() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_reply_add')
        .setTitle('Add Auto Reply')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reply_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID (e.g. 123456789012345678)')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reply_text')
                    .setLabel('Auto-Reply Text')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Enter the text the bot will reply with automatically')
                    .setRequired(true)
                    .setMaxLength(1500)
            )
        );
}

function modalReplyEdit() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_reply_edit')
        .setTitle('Edit Auto Reply Text')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reply_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID to update')
                    .setRequired(true)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reply_text')
                    .setLabel('New Auto-Reply Text')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Enter the new auto-reply text')
                    .setRequired(true)
                    .setMaxLength(1500)
            )
        );
}

function modalReplyRemove() {
    return new ModalBuilder()
        .setCustomId('taysse2_modal_reply_remove')
        .setTitle('Remove Auto Reply')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reply_user_id')
                    .setLabel('User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user\'s Discord ID to remove')
                    .setRequired(true)
                    .setMaxLength(20)
            )
        );
}

// ─── Input validation helpers ─────────────────────────────────────────────────

/** Returns true for valid Discord snowflake IDs (17-19 digit strings) */
function isValidSnowflake(id) {
    return /^\d{17,19}$/.test(id);
}

/**
 * Returns true if the emoji string looks valid:
 *  • Standard unicode emoji  (e.g. 👍  ❤️  🎉)
 *  • Custom Discord emoji    (e.g. <:name:123456789>)
 *  • Animated Discord emoji  (e.g. <a:name:123456789>)
 */
function isValidEmoji(emoji) {
    if (!emoji) return false;
    // Custom / animated discord emoji
    if (/^<a?:[a-zA-Z0-9_]{2,32}:\d{17,19}>$/.test(emoji)) return true;
    // Unicode emoji — allow any non-whitespace character(s) that aren't plain ASCII letters/digits
    // (a simple heuristic that accepts real emoji but rejects random text)
    return emoji.length <= 8 && /\p{Emoji}/u.test(emoji);
}

// ─── Ephemeral feedback helpers ───────────────────────────────────────────────

async function ephemeralOk(interaction, text) {
    return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `> ✅  ${text}`,
    }).catch(() => {});
}

async function ephemeralErr(interaction, text) {
    return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `> ❌  ${text}`,
    }).catch(() => {});
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Called from interactionCreate.js for all taysse2_* customIds.
 * @param {import('discord.js').Interaction} interaction
 * @param {import('discord.js').Client}      client
 */
export async function handleTaysse2Interaction(interaction, client) {
    // Owner-only guard — silently deny non-owners
    if (!isOwner(interaction.user.id)) {
        return interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: '> 🔒  This panel is restricted to bot owners only.',
        }).catch(() => {});
    }

    const cid   = interaction.customId;
    const guild = interaction.guild;
    const theme  = await themeManager.getTheme(guild.id).catch(() => ({ color: 0x5865F2 }));
    const accent = themeManager.getRGBColor(theme.color);

    // ── Navigation ─────────────────────────────────────────────────────────────
    if (cid === 'taysse2_back') {
        const panel = await buildMainPanel(guild, accent, client);
        return interaction.update({ components: panel }).catch(() => {});
    }

    if (cid === 'taysse2_react_panel') {
        const panel = await buildReactPanel(guild, accent, client);
        return interaction.update({ components: panel }).catch(() => {});
    }

    if (cid === 'taysse2_reply_panel') {
        const panel = await buildReplyPanel(guild, accent, client);
        return interaction.update({ components: panel }).catch(() => {});
    }

    // ── Auto React — open modals ───────────────────────────────────────────────
    if (cid === 'taysse2_react_add') {
        return interaction.showModal(modalReactAdd()).catch(() => {});
    }
    if (cid === 'taysse2_react_edit') {
        return interaction.showModal(modalReactEdit()).catch(() => {});
    }
    if (cid === 'taysse2_react_remove') {
        return interaction.showModal(modalReactRemove()).catch(() => {});
    }

    // ── Auto Reply — open modals ───────────────────────────────────────────────
    if (cid === 'taysse2_reply_add') {
        return interaction.showModal(modalReplyAdd()).catch(() => {});
    }
    if (cid === 'taysse2_reply_edit') {
        return interaction.showModal(modalReplyEdit()).catch(() => {});
    }
    if (cid === 'taysse2_reply_remove') {
        return interaction.showModal(modalReplyRemove()).catch(() => {});
    }

    // ── Modal submissions ──────────────────────────────────────────────────────
    if (cid === 'taysse2_modal_react_add') {
        const userId = interaction.fields.getTextInputValue('react_user_id').trim().replace(/\D/g, '');
        const emoji  = interaction.fields.getTextInputValue('react_emoji').trim();
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');
        if (!isValidEmoji(emoji))
            return ephemeralErr(interaction, 'Invalid emoji — use a standard emoji (👍) or a custom Discord emoji (`<a?:name:id>`).');

        try {
            await AutoReact.findOneAndUpdate(
                { guildId: guild.id, userId },
                { $set: { emoji, addedBy: interaction.user.id, addedAt: new Date() } },
                { upsert: true, new: true }
            );
        } catch (err) {
            return ephemeralErr(interaction, `Failed to save: ${err.message}`);
        }

        return ephemeralOk(interaction, `Auto-react **${emoji}** configured for <@${userId}>.`);
    }

    if (cid === 'taysse2_modal_react_edit') {
        const userId = interaction.fields.getTextInputValue('react_user_id').trim().replace(/\D/g, '');
        const emoji  = interaction.fields.getTextInputValue('react_emoji').trim();
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');
        if (!isValidEmoji(emoji))
            return ephemeralErr(interaction, 'Invalid emoji — use a standard emoji (👍) or a custom Discord emoji (`<a?:name:id>`).');

        const doc = await AutoReact.findOne({ guildId: guild.id, userId }).lean();
        if (!doc) return ephemeralErr(interaction, `No auto-react found for User ID \`${userId}\`.`);

        try {
            await AutoReact.findOneAndUpdate({ guildId: guild.id, userId }, { $set: { emoji } });
        } catch (err) {
            return ephemeralErr(interaction, `Failed to update: ${err.message}`);
        }

        return ephemeralOk(interaction, `Auto-react for <@${userId}> updated to **${emoji}**.`);
    }

    if (cid === 'taysse2_modal_react_remove') {
        const userId = interaction.fields.getTextInputValue('react_user_id').trim().replace(/\D/g, '');
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');

        let result;
        try {
            result = await AutoReact.deleteOne({ guildId: guild.id, userId });
        } catch (err) {
            return ephemeralErr(interaction, `Failed to remove: ${err.message}`);
        }
        if (!result || result.deletedCount === 0)
            return ephemeralErr(interaction, `No auto-react found for User ID \`${userId}\`.`);

        return ephemeralOk(interaction, `Auto-react for <@${userId}> has been removed.`);
    }

    if (cid === 'taysse2_modal_reply_add') {
        const userId    = interaction.fields.getTextInputValue('reply_user_id').trim().replace(/\D/g, '');
        const replyText = interaction.fields.getTextInputValue('reply_text').trim();
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');
        if (!replyText)
            return ephemeralErr(interaction, 'Reply text cannot be empty.');

        try {
            await AutoReply.findOneAndUpdate(
                { guildId: guild.id, userId },
                { $set: { replyText, addedBy: interaction.user.id, addedAt: new Date() } },
                { upsert: true, new: true }
            );
        } catch (err) {
            return ephemeralErr(interaction, `Failed to save: ${err.message}`);
        }

        return ephemeralOk(interaction, `Auto-reply configured for <@${userId}>.`);
    }

    if (cid === 'taysse2_modal_reply_edit') {
        const userId    = interaction.fields.getTextInputValue('reply_user_id').trim().replace(/\D/g, '');
        const replyText = interaction.fields.getTextInputValue('reply_text').trim();
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');
        if (!replyText)
            return ephemeralErr(interaction, 'Reply text cannot be empty.');

        const doc = await AutoReply.findOne({ guildId: guild.id, userId }).lean();
        if (!doc) return ephemeralErr(interaction, `No auto-reply found for User ID \`${userId}\`.`);

        try {
            await AutoReply.findOneAndUpdate({ guildId: guild.id, userId }, { $set: { replyText } });
        } catch (err) {
            return ephemeralErr(interaction, `Failed to update: ${err.message}`);
        }

        return ephemeralOk(interaction, `Auto-reply for <@${userId}> has been updated.`);
    }

    if (cid === 'taysse2_modal_reply_remove') {
        const userId = interaction.fields.getTextInputValue('reply_user_id').trim().replace(/\D/g, '');
        if (!isValidSnowflake(userId))
            return ephemeralErr(interaction, 'Invalid User ID — must be a 17-19 digit Discord snowflake.');

        let result;
        try {
            result = await AutoReply.deleteOne({ guildId: guild.id, userId });
        } catch (err) {
            return ephemeralErr(interaction, `Failed to remove: ${err.message}`);
        }
        if (!result || result.deletedCount === 0)
            return ephemeralErr(interaction, `No auto-reply found for User ID \`${userId}\`.`);

        return ephemeralOk(interaction, `Auto-reply for <@${userId}> has been removed.`);
    }
}
