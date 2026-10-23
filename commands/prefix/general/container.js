import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';

// ── Color palette ──────────────────────────────────────────────────────────────
const COLORS = {
    none:      null,
    blurple:   [88, 101, 242],
    red:       [237, 66, 69],
    green:     [87, 242, 135],
    blue:      [52, 152, 219],
    orange:    [230, 126, 34],
    dark_grey: [47, 49, 54],
    white:     [255, 255, 255],
};

const COLOR_NAMES = {
    none:      'None',
    blurple:   'Blurple',
    red:       'Red',
    green:     'Green',
    blue:      'Blue',
    orange:    'Orange',
    dark_grey: 'Dark Grey',
    white:     'White',
};

const MAX_COMPONENTS = 20;

// ── Component label ────────────────────────────────────────────────────────────
function compLabel(comp, i) {
    const n = i + 1;
    switch (comp.type) {
        case 'text':
            return `${n}. Text — ${comp.content.slice(0, 45).replace(/\n/g, ' ')}`;
        case 'separator': {
            const kind = comp.divider !== false ? 'line' : 'spacer';
            return `${n}. Separator (${comp.spacing || 'small'}, ${kind})`;
        }
        case 'section':
            return `${n}. Section — ${comp.content.slice(0, 40).replace(/\n/g, ' ')}`;
        case 'media_gallery':
            return `${n}. Gallery (${comp.urls.length} image${comp.urls.length !== 1 ? 's' : ''})`;
        case 'button_row': {
            const labels = comp.buttons.slice(0, 3).map(b => b.label).join(', ');
            return `${n}. Buttons — ${labels}${comp.buttons.length > 3 ? '...' : ''}`;
        }
        default:
            return `${n}. Unknown`;
    }
}

// ── Render a single component into a ContainerBuilder ─────────────────────────
function renderComp(container, comp) {
    switch (comp.type) {
        case 'text':
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(comp.content)
            );
            break;

        case 'separator': {
            const spacing = comp.spacing === 'large'
                ? SeparatorSpacingSize.Large
                : SeparatorSpacingSize.Small;
            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(comp.divider !== false)
                    .setSpacing(spacing)
            );
            break;
        }

        case 'section': {
            const section = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(comp.content)
                );
            if (comp.thumbnailUrl) {
                section.setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(comp.thumbnailUrl)
                );
            }
            container.addSectionComponents(section);
            break;
        }

        case 'media_gallery': {
            if (comp.urls && comp.urls.length > 0) {
                const gallery = new MediaGalleryBuilder();
                for (const url of comp.urls) {
                    gallery.addItems(item => item.setURL(url));
                }
                container.addMediaGalleryComponents(gallery);
            }
            break;
        }

        case 'button_row': {
            if (comp.buttons && comp.buttons.length > 0) {
                const row = new ActionRowBuilder();
                for (const btn of comp.buttons.slice(0, 5)) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel(btn.label)
                            .setStyle(ButtonStyle.Link)
                            .setURL(btn.url)
                    );
                }
                container.addActionRowComponents(row);
            }
            break;
        }
    }
}

// ── Build preview container ────────────────────────────────────────────────────
function buildPreview(state) {
    const color = COLORS[state.colorKey];
    const container = new ContainerBuilder();
    if (color) container.setAccentColor(color);

    if (state.data.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# Your container is empty. Use the controls below to add components.'
            )
        );
    } else {
        for (const comp of state.data) {
            renderComp(container, comp);
        }
    }
    return container;
}

// ── Build control panel: normal mode ──────────────────────────────────────────
function buildControlNormal(state) {
    const atMax    = state.data.length >= MAX_COMPONENTS;
    const hasComps = state.data.length > 0;
    const canReorder = state.data.length >= 2;

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Container Builder**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Color: **${COLOR_NAMES[state.colorKey]}**  |  ` +
                `Components: **${state.data.length} / ${MAX_COMPONENTS}**`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('cb_add')
                    .setPlaceholder(
                        atMax
                            ? `Maximum ${MAX_COMPONENTS} components reached`
                            : 'Add a component...'
                    )
                    .setDisabled(atMax)
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Text Display')
                            .setValue('text')
                            .setDescription('A block of markdown text'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Separator')
                            .setValue('separator')
                            .setDescription('A divider line or invisible spacer'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Section & Thumbnail')
                            .setValue('section')
                            .setDescription('Text with a thumbnail image on the right'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Media Gallery')
                            .setValue('media_gallery')
                            .setDescription('One or more images in a grid'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Button Row')
                            .setValue('button_row')
                            .setDescription('Up to 5 redirect (link) buttons in a row'),
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_edit')
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!hasComps),
                new ButtonBuilder()
                    .setCustomId('cb_remove')
                    .setLabel('Remove')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!hasComps),
                new ButtonBuilder()
                    .setCustomId('cb_color')
                    .setLabel('Color')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('cb_reorder')
                    .setLabel('Reorder')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!canReorder),
                new ButtonBuilder()
                    .setCustomId('cb_send')
                    .setLabel('Send')
                    .setStyle(ButtonStyle.Primary),
            )
        );
}

// ── Build control panel: color picker ─────────────────────────────────────────
function buildControlColor(state) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Select Accent Color**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# Choose the color bar shown on the left side of the container.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('cb_color_sel')
                    .setPlaceholder('Choose a color...')
                    .addOptions(
                        Object.entries(COLOR_NAMES).map(([key, name]) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(name)
                                .setValue(key)
                                .setDefault(key === state.colorKey)
                        )
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

// ── Build control panel: component selector (edit / remove) ───────────────────
function buildControlSelect(state, mode) {
    const isEdit = mode === 'edit';
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                isEdit ? '**Edit a Component**' : '**Remove a Component**'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Select the component you want to ${isEdit ? 'edit' : 'remove'}.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(isEdit ? 'cb_edit_sel' : 'cb_remove_sel')
                    .setPlaceholder(`Select a component to ${isEdit ? 'edit' : 'remove'}...`)
                    .addOptions(
                        state.data.map((comp, i) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(compLabel(comp, i).slice(0, 100))
                                .setValue(String(i))
                        )
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

// ── Build control panel: reorder ──────────────────────────────────────────────
function buildControlReorder(state) {
    const idx = state.reorderIndex;
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Reorder Components**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# Select a component, then move it up or down.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('cb_reorder_sel')
                    .setPlaceholder('Select a component to move...')
                    .addOptions(
                        state.data.map((comp, i) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(compLabel(comp, i).slice(0, 100))
                                .setValue(String(i))
                                .setDefault(i === idx)
                        )
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_move_up')
                    .setLabel('↑ Move Up')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(idx === null || idx === 0),
                new ButtonBuilder()
                    .setCustomId('cb_move_down')
                    .setLabel('↓ Move Down')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(idx === null || idx === state.data.length - 1),
                new ButtonBuilder()
                    .setCustomId('cb_cancel')
                    .setLabel('Done')
                    .setStyle(ButtonStyle.Primary),
            )
        );
}

// ── Build control panel: send (channel picker) ────────────────────────────────
function buildControlSend() {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Send Container**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '-# Select a text channel to send the finished container to.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('cb_channel_sel')
                    .setPlaceholder('Select a channel...')
                    .setChannelTypes(ChannelType.GuildText)
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

// ── Build control panel: sent confirmation ────────────────────────────────────
function buildControlSent(channelMention) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Container Sent **')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Your container was successfully sent to ${channelMention}.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cb_reset')
                    .setLabel('Build Another')
                    .setStyle(ButtonStyle.Secondary),
            )
        );
}

// ── Assemble the full message components array ─────────────────────────────────
function buildMessage(state) {
    const preview = buildPreview(state);
    let ctrl;

    switch (state.mode) {
        case 'color':   ctrl = buildControlColor(state);         break;
        case 'edit':    ctrl = buildControlSelect(state, 'edit'); break;
        case 'remove':  ctrl = buildControlSelect(state, 'remove'); break;
        case 'reorder': ctrl = buildControlReorder(state);       break;
        case 'send':    ctrl = buildControlSend();                break;
        case 'sent':    ctrl = buildControlSent(state.sentChannel); break;
        default:        ctrl = buildControlNormal(state);         break;
    }

    return [preview, ctrl];
}

// ── Modal builders ─────────────────────────────────────────────────────────────
function buildTextModal(existing = null) {
    const input = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Content')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Supports full markdown: **bold**, ### heading, > blockquote...')
        .setRequired(true)
        .setMaxLength(2000);
    if (existing?.content) input.setValue(existing.content);

    return new ModalBuilder()
        .setCustomId('cb_modal_text')
        .setTitle(existing !== null ? 'Edit Text Display' : 'Add Text Display')
        .addComponents(new ActionRowBuilder().addComponents(input));
}

function buildSeparatorModal(existing = null) {
    const divInput = new TextInputBuilder()
        .setCustomId('divider')
        .setLabel('Show divider line? (yes / no)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3)
        .setValue(existing?.divider !== false ? 'yes' : 'no');

    const spacingInput = new TextInputBuilder()
        .setCustomId('spacing')
        .setLabel('Spacing (small / large)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(5)
        .setValue(existing?.spacing ?? 'small');

    return new ModalBuilder()
        .setCustomId('cb_modal_separator')
        .setTitle(existing !== null ? 'Edit Separator' : 'Add Separator')
        .addComponents(
            new ActionRowBuilder().addComponents(divInput),
            new ActionRowBuilder().addComponents(spacingInput),
        );
}

function buildSectionModal(existing = null) {
    const contentInput = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Text Content')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);
    if (existing?.content) contentInput.setValue(existing.content);

    const thumbInput = new TextInputBuilder()
        .setCustomId('thumbnail_url')
        .setLabel('Thumbnail URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('https://example.com/image.png')
        .setMaxLength(500);
    if (existing?.thumbnailUrl) thumbInput.setValue(existing.thumbnailUrl);

    return new ModalBuilder()
        .setCustomId('cb_modal_section')
        .setTitle(existing !== null ? 'Edit Section' : 'Add Section & Thumbnail')
        .addComponents(
            new ActionRowBuilder().addComponents(contentInput),
            new ActionRowBuilder().addComponents(thumbInput),
        );
}

function buildGalleryModal(existing = null) {
    const input = new TextInputBuilder()
        .setCustomId('urls')
        .setLabel('Image URLs — one per line, max 10')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('https://example.com/image1.png\nhttps://example.com/image2.png')
        .setMaxLength(4000);
    if (existing?.urls?.length) input.setValue(existing.urls.join('\n'));

    return new ModalBuilder()
        .setCustomId('cb_modal_gallery')
        .setTitle(existing !== null ? 'Edit Media Gallery' : 'Add Media Gallery')
        .addComponents(new ActionRowBuilder().addComponents(input));
}

function buildButtonRowModal(existing = null) {
    const existingText = existing?.buttons?.map(b => `${b.label} :: ${b.url}`).join('\n') ?? '';
    const input = new TextInputBuilder()
        .setCustomId('buttons')
        .setLabel('Buttons — one per line: Label :: https://url')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Discord :: https://discord.com\nGitHub :: https://github.com')
        .setMaxLength(1000);
    if (existingText) input.setValue(existingText);

    return new ModalBuilder()
        .setCustomId('cb_modal_buttons')
        .setTitle(existing !== null ? 'Edit Button Row' : 'Add Button Row')
        .addComponents(new ActionRowBuilder().addComponents(input));
}

// ── Modal → component data parser ─────────────────────────────────────────────
function parseModal(sub, type) {
    switch (type) {
        case 'text': {
            const content = sub.fields.getTextInputValue('content');
            return { type: 'text', content };
        }
        case 'separator': {
            const divRaw = sub.fields.getTextInputValue('divider').trim().toLowerCase();
            const spcRaw = sub.fields.getTextInputValue('spacing').trim().toLowerCase();
            const divider = !['no', 'n', 'false', '0'].includes(divRaw);
            const spacing = spcRaw === 'large' ? 'large' : 'small';
            return { type: 'separator', divider, spacing };
        }
        case 'section': {
            const content = sub.fields.getTextInputValue('content');
            const thumbnailUrl = sub.fields.getTextInputValue('thumbnail_url').trim() || null;
            return { type: 'section', content, thumbnailUrl };
        }
        case 'media_gallery': {
            const urls = sub.fields.getTextInputValue('urls')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0)
                .slice(0, 10);
            return { type: 'media_gallery', urls };
        }
        case 'button_row': {
            const buttons = [];
            for (const line of sub.fields.getTextInputValue('buttons').split('\n')) {
                if (!line.includes('::')) continue;
                const sepIdx = line.indexOf('::');
                const label = line.slice(0, sepIdx).trim().slice(0, 80);
                const url = line.slice(sepIdx + 2).trim();
                if (label && (url.startsWith('http://') || url.startsWith('https://'))) {
                    buttons.push({ label, url });
                }
            }
            if (buttons.length === 0) return null;
            return { type: 'button_row', buttons: buttons.slice(0, 5) };
        }
        default:
            return null;
    }
}

// ── Modal IDs ──────────────────────────────────────────────────────────────────
const MODAL_IDS = ['cb_modal_text', 'cb_modal_separator', 'cb_modal_section', 'cb_modal_gallery', 'cb_modal_buttons'];

// ── Command export ─────────────────────────────────────────────────────────────
export default {
    name: 'container',
    aliases: ['build', 'cb'],
    description: 'Interactively build and send a Components V2 container',
    category: 'General',
    usage: '&container',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);

        // ── Permission gate: user must have a role higher than the bot ─────────
        const botMember    = message.guild.members.me;
        const botTop       = botMember.roles.highest;
        const memberTop    = message.member.roles.highest;
        const isOwner      = message.author.id === message.guild.ownerId;

        if (!isOwner && memberTop.position <= botTop.position) {
            const deny = new ContainerBuilder()
                .setAccentColor(accentColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##   Access Restricted\n` +
                        `> This command is reserved for users with a role **higher than the bot's** top role.\n` +
                        `> **Your highest role:** \`${memberTop.name}\`  (position ${memberTop.position})\n` +
                        `> **Bot's highest role:** \`${botTop.name}\`  (position ${botTop.position})`
                    )
                );
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [deny],
                allowedMentions: { repliedUser: false },
            });
        }

        // ── Initial builder state ──────────────────────────────────────────────
        const state = {
            colorKey:    'none',
            data:        [],
            mode:        'normal',
            reorderIndex: null,
            sentChannel: null,
        };

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildMessage(state),
            allowedMentions: { repliedUser: false },
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 600_000,
        });

        collector.on('collect', async interaction => {
            const id = interaction.customId;

            // ── Cancel / Done ──────────────────────────────────────────────────
            if (id === 'cb_cancel') {
                state.mode = 'normal';
                state.reorderIndex = null;
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Reset ──────────────────────────────────────────────────────────
            if (id === 'cb_reset') {
                state.colorKey    = 'none';
                state.data        = [];
                state.mode        = 'normal';
                state.reorderIndex = null;
                state.sentChannel = null;
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Add component (dropdown → modal) ───────────────────────────────
            if (id === 'cb_add') {
                const type = interaction.values[0];
                const modalBuilders = {
                    text:          buildTextModal,
                    separator:     buildSeparatorModal,
                    section:       buildSectionModal,
                    media_gallery: buildGalleryModal,
                    button_row:    buildButtonRowModal,
                };
                const modal = modalBuilders[type]();
                await interaction.showModal(modal);

                const sub = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === message.author.id && MODAL_IDS.includes(i.customId),
                    time: 300_000,
                }).catch(() => null);
                if (!sub) return;

                const comp = parseModal(sub, type);
                if (!comp) {
                    return sub.reply({
                        content: ' No valid data was provided. Please try again.',
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }
                state.data.push(comp);
                return sub.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Edit button → show selector ────────────────────────────────────
            if (id === 'cb_edit') {
                state.mode = 'edit';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Edit selector → open modal ─────────────────────────────────────
            if (id === 'cb_edit_sel') {
                const index = parseInt(interaction.values[0], 10);
                const comp  = state.data[index];
                const modalBuilders = {
                    text:          buildTextModal,
                    separator:     buildSeparatorModal,
                    section:       buildSectionModal,
                    media_gallery: buildGalleryModal,
                    button_row:    buildButtonRowModal,
                };
                const modal = modalBuilders[comp.type](comp);
                await interaction.showModal(modal);

                const sub = await interaction.awaitModalSubmit({
                    filter: i => i.user.id === message.author.id && MODAL_IDS.includes(i.customId),
                    time: 300_000,
                }).catch(() => null);
                if (!sub) return;

                const newComp = parseModal(sub, comp.type);
                if (!newComp) {
                    return sub.reply({
                        content: ' No valid data was provided. Please try again.',
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }
                state.data[index] = newComp;
                return sub.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Remove button → show selector ──────────────────────────────────
            if (id === 'cb_remove') {
                state.mode = 'remove';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Remove selector → delete component ────────────────────────────
            if (id === 'cb_remove_sel') {
                const index = parseInt(interaction.values[0], 10);
                state.data.splice(index, 1);
                if (state.reorderIndex !== null && state.reorderIndex >= state.data.length) {
                    state.reorderIndex = state.data.length > 0 ? state.data.length - 1 : null;
                }
                state.mode = 'normal';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Color button ───────────────────────────────────────────────────
            if (id === 'cb_color') {
                state.mode = 'color';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Color selector ─────────────────────────────────────────────────
            if (id === 'cb_color_sel') {
                state.colorKey = interaction.values[0];
                state.mode     = 'normal';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Reorder button ─────────────────────────────────────────────────
            if (id === 'cb_reorder') {
                state.mode        = 'reorder';
                state.reorderIndex = null;
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Reorder selector → pick component ─────────────────────────────
            if (id === 'cb_reorder_sel') {
                state.reorderIndex = parseInt(interaction.values[0], 10);
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Move up ────────────────────────────────────────────────────────
            if (id === 'cb_move_up') {
                const i = state.reorderIndex;
                if (i !== null && i > 0) {
                    [state.data[i], state.data[i - 1]] = [state.data[i - 1], state.data[i]];
                    state.reorderIndex = i - 1;
                }
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Move down ──────────────────────────────────────────────────────
            if (id === 'cb_move_down') {
                const i = state.reorderIndex;
                if (i !== null && i < state.data.length - 1) {
                    [state.data[i], state.data[i + 1]] = [state.data[i + 1], state.data[i]];
                    state.reorderIndex = i + 1;
                }
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Send button → channel picker ───────────────────────────────────
            if (id === 'cb_send') {
                state.mode = 'send';
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }

            // ── Channel selector → send container ──────────────────────────────
            if (id === 'cb_channel_sel') {
                const channelId = interaction.values[0];
                const channel   = interaction.guild.channels.cache.get(channelId);
                if (!channel) {
                    return interaction.reply({
                        content: ' Could not find that channel.',
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const color        = COLORS[state.colorKey];
                const outContainer = new ContainerBuilder();
                if (color) outContainer.setAccentColor(color);

                if (state.data.length === 0) {
                    outContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('*(empty container)*')
                    );
                } else {
                    for (const comp of state.data) {
                        renderComp(outContainer, comp);
                    }
                }

                try {
                    await channel.send({
                        flags: MessageFlags.IsComponentsV2,
                        components: [outContainer],
                    });
                } catch (err) {
                    return interaction.reply({
                        content: ` Could not send to ${channel}: \`${err.message}\``,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                state.mode        = 'sent';
                state.sentChannel = channel.toString();
                return interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: buildMessage(state),
                });
            }
        });

        collector.on('end', () => {
            sent.edit({
                flags: MessageFlags.IsComponentsV2,
                components: buildMessage(state),
            }).catch(() => {});
        });
    },
};
