/**
 * builderHandler.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Interactive ComponentsV2 Container Builder.
 *
 * Commands  : &builder
 * Components: bldr_*
 * Modals    : bldr_modal_*
 */

import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder,
    SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
} from 'discord.js';
import { startColorCycle, getColorPalette, CYCLE_COLORS } from '../utils/colorCycler.js';

// ── Session store ─────────────────────────────────────────────────────────────
// key: `${userId}:${guildId}`
const sessions = new Map();
const key  = (uid, gid) => `${uid}:${gid}`;
const get  = (uid, gid) => sessions.get(key(uid, gid));
const save = (uid, gid, s) => sessions.set(key(uid, gid), s);

const MAX_ITEMS = 20;

// ── divider helper ────────────────────────────────────────────────────────────
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ── Label for an item (used in select menus) ──────────────────────────────────
function itemLabel(item, index) {
    const prefix = `#${index + 1}`;
    switch (item.type) {
        case 'text':      return `${prefix}: Text — "${item.content.slice(0, 40)}${item.content.length > 40 ? '…' : ''}"`;
        case 'header':    return `${prefix}: Header — "${item.content.slice(0, 38)}${item.content.length > 38 ? '…' : ''}"`;
        case 'separator': return `${prefix}: Separator (small)`;
        case 'sep_large': return `${prefix}: Separator (large)`;
        case 'section':   return `${prefix}: Section — "${item.content.slice(0, 38)}${item.content.length > 38 ? '…' : ''}"`;
        case 'btn_row':   return `${prefix}: Button Row — [${item.buttons.map(b => b.label).join(', ')}]`;
        default:          return `${prefix}: ${item.type}`;
    }
}

// ── Build preview container from items ────────────────────────────────────────
function buildPreview(items, accentColor) {
    const c = new ContainerBuilder().setAccentColor(accentColor);

    if (!items.length) {
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '> *Your container is empty. Use the controls below to add components.*'
            )
        );
        return c;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        switch (item.type) {

            case 'text':
                c.addTextDisplayComponents(new TextDisplayBuilder().setContent(item.content));
                break;

            case 'header':
                c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${item.content}`));
                break;

            case 'separator':
                c.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                );
                break;

            case 'sep_large':
                c.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
                );
                break;

            case 'section': {
                const sec = new SectionBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(item.content)
                );
                if (item.btnLabel) {
                    // Button accessory (side button)
                    const b = new ButtonBuilder().setLabel(item.btnLabel);
                    if (item.btnStyle === 'Link') {
                        b.setStyle(ButtonStyle.Link).setURL(item.btnUrl || 'https://discord.com');
                    } else {
                        b.setStyle(ButtonStyle[item.btnStyle] || ButtonStyle.Secondary)
                         .setCustomId(`bldr_prev_sec_${i}`);
                    }
                    sec.setButtonAccessory(b);
                } else if (item.thumbnail) {
                    sec.setThumbnailAccessory(new ThumbnailBuilder().setURL(item.thumbnail));
                }
                c.addSectionComponents(sec);
                break;
            }

            case 'btn_row': {
                const row = new ActionRowBuilder();
                for (let bi = 0; bi < Math.min(item.buttons.length, 5); bi++) {
                    const btn = item.buttons[bi];
                    const b   = new ButtonBuilder().setLabel(btn.label);
                    if (btn.style === 'Link') {
                        b.setStyle(ButtonStyle.Link).setURL(btn.url || 'https://discord.com');
                    } else {
                        b.setStyle(ButtonStyle[btn.style] || ButtonStyle.Primary)
                         .setCustomId(`bldr_prev_btn_${i}_${bi}`);
                    }
                    row.addComponents(b);
                }
                c.addActionRowComponents(row);
                break;
            }
        }
    }
    return c;
}

// ── Build control panel ───────────────────────────────────────────────────────
function buildControl(session) {
    const { items, colorConfig, selected } = session;
    const count    = items.length;
    const atLimit  = count >= MAX_ITEMS;
    const hasItems = count > 0;
    const selItem  = (selected !== null && items[selected]) ? items[selected] : null;

    const colorLine = colorConfig.animated
        ? `🌈 **Animated** · ${colorConfig.count} colors  ·  changes every 2s`
        : `⬜ **Static**`;

    const selLine = selItem
        ? `  ·  Selected: \`#${selected + 1} ${selItem.type}\``
        : '';

    const c = new ContainerBuilder()
        .setAccentColor([25, 25, 40])
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Container Builder**\n` +
            `─────────────────────\n` +
            `Color: ${colorLine}  |  Components: **${count} / ${MAX_ITEMS}**${selLine}`
        ))
        .addSeparatorComponents(divS())
        // ── Add component dropdown ───────────────────────────────────────────
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('bldr_add')
                    .setPlaceholder(atLimit ? '⚠️  Limit reached (20 / 20)' : '➕  Add a component…')
                    .setDisabled(atLimit)
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('📝  Text Display').setValue('text').setDescription('A plain text block'),
                        new StringSelectMenuOptionBuilder().setLabel('📌  Header').setValue('header').setDescription('Large bold heading text'),
                        new StringSelectMenuOptionBuilder().setLabel('📦  Section').setValue('section').setDescription('Text with side thumbnail or button'),
                        new StringSelectMenuOptionBuilder().setLabel('▬  Separator — Small').setValue('separator').setDescription('Thin divider line'),
                        new StringSelectMenuOptionBuilder().setLabel('▬  Separator — Large').setValue('sep_large').setDescription('Thick divider with extra spacing'),
                        new StringSelectMenuOptionBuilder().setLabel('<a:vdgd:1528066996527431691>  Button Row').setValue('btn_row').setDescription('A row of up to 5 buttons'),
                    )
            )
        );

    // ── Item selector (shown only when there are items) ──────────────────────
    if (hasItems) {
        const opts = items.map((item, i) =>
            new StringSelectMenuOptionBuilder()
                .setLabel(itemLabel(item, i).slice(0, 100))
                .setValue(String(i))
        );
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('bldr_select')
                    .setPlaceholder(selItem ? `Selected: ${itemLabel(selItem, selected).slice(0, 50)}` : 'Select a component to edit…')
                    .addOptions(opts)
            )
        );
    }

    c.addSeparatorComponents(divS())
     // ── Action buttons ───────────────────────────────────────────────────────
     .addActionRowComponents(
         new ActionRowBuilder().addComponents(
             new ButtonBuilder().setCustomId('bldr_edit')   .setLabel('Edit')      .setStyle(ButtonStyle.Secondary).setDisabled(!selItem),
             new ButtonBuilder().setCustomId('bldr_remove') .setLabel('Remove')    .setStyle(ButtonStyle.Danger)   .setDisabled(!selItem),
             new ButtonBuilder().setCustomId('bldr_color')  .setLabel('🎨 Color')  .setStyle(ButtonStyle.Secondary),
             new ButtonBuilder().setCustomId('bldr_reorder').setLabel('↕ Reorder') .setStyle(ButtonStyle.Secondary).setDisabled(!selItem),
             new ButtonBuilder().setCustomId('bldr_send')   .setLabel('✉ Send')    .setStyle(ButtonStyle.Primary)  .setDisabled(!hasItems),
         )
     );

    return c;
}

// ── Refresh the full builder message ──────────────────────────────────────────
async function refresh(session) {
    if (!session?.message) return;
    const { items, colorConfig } = session;

    const baseColor = colorConfig.animated
        ? getColorPalette(colorConfig.count)[0]
        : (colorConfig.staticColor ?? CYCLE_COLORS[6]);

    const preview = buildPreview(items, baseColor);
    const control = buildControl(session);

    await session.message.edit({
        flags:      MessageFlags.IsComponentsV2,
        components: [preview, control],
    }).catch(() => {});

    // Restart colour cycle
    if (session.stopCycle) { session.stopCycle(); session.stopCycle = null; }
    if (colorConfig.animated) {
        const palette = getColorPalette(colorConfig.count);
        let pi = 0;
        session.stopCycle = startColorCycle(session.message, () => {
            pi = (pi + 1) % palette.length;
            return [buildPreview(items, palette[pi]), buildControl(session)];
        });
    }
}

// ── Ephemeral: colour settings panel ─────────────────────────────────────────
function colorPanel(session) {
    const { colorConfig } = session;
    const anim = colorConfig.animated;

    const c = new ContainerBuilder().setAccentColor([25, 25, 50])
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## 🎨  Color Settings\n` +
            `> **Mode:** ${anim ? `🌈 Animated · ${colorConfig.count} colors` : '⬜ Static'}`
        ))
        .addSeparatorComponents(divS())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bldr_color_static')   .setLabel('⬜ Static')   .setStyle(anim ? ButtonStyle.Secondary : ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('bldr_color_animated') .setLabel('🌈 Animated') .setStyle(anim ? ButtonStyle.Primary   : ButtonStyle.Secondary),
            )
        );

    if (anim) {
        c.addSeparatorComponents(divS())
         .addTextDisplayComponents(new TextDisplayBuilder().setContent('**How many colors to cycle through?**'))
         .addActionRowComponents(
             new ActionRowBuilder().addComponents(
                 new StringSelectMenuBuilder()
                     .setCustomId('bldr_color_count')
                     .setPlaceholder(`Currently: ${colorConfig.count} colors`)
                     .addOptions(
                         ['5','10','15','20','25','30'].map(n =>
                             new StringSelectMenuOptionBuilder().setLabel(`${n} colors`).setValue(n)
                         )
                     )
             )
         );
    }

    return {
        flags:      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [c],
    };
}

// ── Ephemeral: reorder panel ──────────────────────────────────────────────────
function reorderPanel(session) {
    const { items, selected } = session;
    const item  = selected !== null ? items[selected] : null;
    const total = items.length;

    const c = new ContainerBuilder().setAccentColor([25, 25, 50])
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ↕  Reorder Components\n` +
            (item
                ? `> Selected: **#${selected + 1}** \`${item.type}\`  ·  Total: **${total}** components`
                : '> No component selected.')
        ))
        .addSeparatorComponents(divS())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bldr_ro_top')   .setLabel('⏫ Top')   .setStyle(ButtonStyle.Secondary).setDisabled(!item || selected === 0),
                new ButtonBuilder().setCustomId('bldr_ro_up')    .setLabel('⬆️ Up')    .setStyle(ButtonStyle.Primary)  .setDisabled(!item || selected === 0),
                new ButtonBuilder().setCustomId('bldr_ro_down')  .setLabel('⬇️ Down')  .setStyle(ButtonStyle.Primary)  .setDisabled(!item || selected >= total - 1),
                new ButtonBuilder().setCustomId('bldr_ro_bottom').setLabel('⏬ Bottom').setStyle(ButtonStyle.Secondary).setDisabled(!item || selected >= total - 1),
            )
        );

    return {
        flags:      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [c],
    };
}

// ── Modal builders ────────────────────────────────────────────────────────────
function addModal(type) {
    const titles = { text: 'Add Text Display', header: 'Add Header', section: 'Add Section' };
    const modal  = new ModalBuilder().setCustomId(`bldr_modal_add_${type}`).setTitle(titles[type]);

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('bldr_content')
                .setLabel(type === 'header' ? 'Heading Text' : 'Content')
                .setStyle(type === 'text' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(type === 'text' ? 1500 : 256)
                .setPlaceholder(type === 'header' ? 'Enter your heading…' : 'Enter your text…')
        )
    );

    if (type === 'section') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('bldr_thumbnail').setLabel('Thumbnail Image URL (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://…  Leave blank if using a button accessory')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('bldr_btn_label').setLabel('Side Button Label (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Click me  — overrides thumbnail if set')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('bldr_btn_style').setLabel('Button Style: Primary / Secondary / Danger / Link').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Secondary').setValue('Secondary')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('bldr_btn_url').setLabel('Button URL (only needed for Link style)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://…')
            )
        );
    }

    return modal;
}

function editModal(item) {
    const modal = new ModalBuilder().setCustomId('bldr_modal_edit').setTitle(`Edit ${item.type}`);
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('bldr_content')
                .setLabel('Content')
                .setStyle(item.type === 'text' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setValue(item.content || '')
                .setRequired(true)
                .setMaxLength(1500)
        )
    );
    if (item.type === 'section') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_thumbnail').setLabel('Thumbnail URL (optional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(item.thumbnail || '').setPlaceholder('https://…')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_label').setLabel('Side Button Label (optional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(item.btnLabel || '').setPlaceholder('Click me')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_style').setLabel('Button Style: Primary / Secondary / Danger / Link').setStyle(TextInputStyle.Short).setRequired(false).setValue(item.btnStyle || 'Secondary')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_url').setLabel('Button URL (Link style only)').setStyle(TextInputStyle.Short).setRequired(false).setValue(item.btnUrl || '').setPlaceholder('https://…'))
        );
    }
    return modal;
}

function btnModal() {
    const modal = new ModalBuilder().setCustomId('bldr_modal_btn').setTitle('Add Button to Row');
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_label').setLabel('Button Label').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Click me')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_style').setLabel('Style: Primary / Secondary / Danger / Link').setStyle(TextInputStyle.Short).setRequired(false).setValue('Primary').setPlaceholder('Primary')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_url').setLabel('URL (Link style only)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://…')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bldr_btn_pos').setLabel('Position: top / bottom').setStyle(TextInputStyle.Short).setRequired(false).setValue('bottom').setPlaceholder('bottom'))
    );
    return modal;
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function handleBuilderInit(message, client) {
    // Permission: role must be above the bot
    const botTop    = message.guild.members.me.roles.highest.position;
    const memberTop = message.member.roles.highest.position;
    const isOwner   = message.guild.ownerId === message.author.id;

    if (!isOwner && memberTop <= botTop) {
        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor([255, 68, 68])
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ⛔  Access Denied\n> Only members whose role is **above the bot's role** can use this command.`
                    )),
            ],
        });
    }

    // Close existing session
    const existing = get(message.author.id, message.guild.id);
    if (existing?.stopCycle) existing.stopCycle();

    const session = {
        userId:    message.author.id,
        guildId:   message.guild.id,
        channelId: message.channel.id,
        items:     [],
        selected:  null,
        colorConfig: { animated: false, count: 10, staticColor: CYCLE_COLORS[6] },
        stopCycle: null,
        message:   null,
    };

    const preview = buildPreview([], session.colorConfig.staticColor);
    const control = buildControl(session);

    const sent = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [preview, control],
        allowedMentions: { parse: [] },
    });

    session.message = sent;
    save(message.author.id, message.guild.id, session);
}

// ── Component interactions ────────────────────────────────────────────────────
export async function handleBuilderInteraction(interaction, client) {
    const uid  = interaction.user.id;
    const gid  = interaction.guild.id;
    const sess = get(uid, gid);
    const cid  = interaction.customId;

    if (!sess) {
        return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> ⚠️ No active builder session. Run `&builder` to start.' });
    }

    // ── Select component type to add ─────────────────────────────────────────
    if (cid === 'bldr_add') {
        const type = interaction.values[0];
        if (['text', 'header', 'section'].includes(type)) {
            return interaction.showModal(addModal(type));
        }
        if (type === 'btn_row') return interaction.showModal(btnModal());
        // Separator (no modal needed)
        await interaction.deferUpdate();
        sess.items.push({ type });
        sess.selected = sess.items.length - 1;
        return refresh(sess);
    }

    // ── Select which item is active ───────────────────────────────────────────
    if (cid === 'bldr_select') {
        sess.selected = parseInt(interaction.values[0]);
        await interaction.deferUpdate();
        return refresh(sess);
    }

    // ── Edit ──────────────────────────────────────────────────────────────────
    if (cid === 'bldr_edit') {
        const item = sess.items[sess.selected];
        if (!item) return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> Select a component first.' });
        // Separators: toggle large ↔ small
        if (item.type === 'separator' || item.type === 'sep_large') {
            await interaction.deferUpdate();
            item.type = item.type === 'separator' ? 'sep_large' : 'separator';
            return refresh(sess);
        }
        if (item.type === 'btn_row') return interaction.showModal(btnModal());
        return interaction.showModal(editModal(item));
    }

    // ── Remove ────────────────────────────────────────────────────────────────
    if (cid === 'bldr_remove') {
        if (sess.selected === null) return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> Select a component first.' });
        sess.items.splice(sess.selected, 1);
        sess.selected = sess.items.length > 0 ? Math.min(sess.selected, sess.items.length - 1) : null;
        await interaction.deferUpdate();
        return refresh(sess);
    }

    // ── Color button ──────────────────────────────────────────────────────────
    if (cid === 'bldr_color') return interaction.reply(colorPanel(sess));

    if (cid === 'bldr_color_static') {
        sess.colorConfig.animated = false;
        if (sess.stopCycle) { sess.stopCycle(); sess.stopCycle = null; }
        await interaction.update(colorPanel(sess));
        return refresh(sess);
    }

    if (cid === 'bldr_color_animated') {
        sess.colorConfig.animated = true;
        await interaction.update(colorPanel(sess));
        return refresh(sess);
    }

    if (cid === 'bldr_color_count') {
        sess.colorConfig.count = parseInt(interaction.values[0]);
        await interaction.update(colorPanel(sess));
        return refresh(sess);
    }

    // ── Reorder button ────────────────────────────────────────────────────────
    if (cid === 'bldr_reorder') return interaction.reply(reorderPanel(sess));

    if (['bldr_ro_top','bldr_ro_up','bldr_ro_down','bldr_ro_bottom'].includes(cid)) {
        const i = sess.selected;
        const n = sess.items.length;
        if (i === null || !sess.items[i]) return interaction.update(reorderPanel(sess));

        if (cid === 'bldr_ro_up'     && i > 0)     { [sess.items[i], sess.items[i-1]] = [sess.items[i-1], sess.items[i]]; sess.selected = i - 1; }
        if (cid === 'bldr_ro_down'   && i < n - 1) { [sess.items[i], sess.items[i+1]] = [sess.items[i+1], sess.items[i]]; sess.selected = i + 1; }
        if (cid === 'bldr_ro_top')   { const [it] = sess.items.splice(i, 1); sess.items.unshift(it); sess.selected = 0; }
        if (cid === 'bldr_ro_bottom'){ const [it] = sess.items.splice(i, 1); sess.items.push(it);    sess.selected = sess.items.length - 1; }

        await interaction.update(reorderPanel(sess));
        return refresh(sess);
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    if (cid === 'bldr_send') {
        if (!sess.items.length) return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> Add at least one component before sending.' });
        await interaction.deferUpdate();

        const baseColor = sess.colorConfig.animated
            ? getColorPalette(sess.colorConfig.count)[0]
            : (sess.colorConfig.staticColor ?? CYCLE_COLORS[6]);

        // Replace preview buttons with static IDs so the sent message is clean
        const sentContainer = buildFinalContainer(sess.items, baseColor);
        const sentMsg = await interaction.channel.send({
            flags:      MessageFlags.IsComponentsV2,
            components: [sentContainer],
        });

        // Animate the sent message if requested
        if (sess.colorConfig.animated) {
            const palette = getColorPalette(sess.colorConfig.count);
            let pi = 0;
            startColorCycle(sentMsg, () => {
                pi = (pi + 1) % palette.length;
                return [buildFinalContainer(sess.items, palette[pi])];
            });
        }

        // Reset builder (keep session alive for next build)
        sess.items    = [];
        sess.selected = null;
        if (sess.stopCycle) { sess.stopCycle(); sess.stopCycle = null; }
        return refresh(sess);
    }
}

// ── Modal submissions ─────────────────────────────────────────────────────────
export async function handleBuilderModal(interaction, client) {
    const uid  = interaction.user.id;
    const gid  = interaction.guild.id;
    const sess = get(uid, gid);
    const mcid = interaction.customId;

    if (!sess) return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> Session expired. Run `&builder` again.' });

    // ── Add item ──────────────────────────────────────────────────────────────
    if (mcid.startsWith('bldr_modal_add_')) {
        const type    = mcid.replace('bldr_modal_add_', '');
        const content = interaction.fields.getTextInputValue('bldr_content').trim();
        const item    = { type, content };

        if (type === 'section') {
            item.thumbnail = interaction.fields.getTextInputValue('bldr_thumbnail').trim() || null;
            item.btnLabel  = interaction.fields.getTextInputValue('bldr_btn_label').trim()  || null;
            item.btnStyle  = interaction.fields.getTextInputValue('bldr_btn_style').trim()  || 'Secondary';
            item.btnUrl    = interaction.fields.getTextInputValue('bldr_btn_url').trim()    || null;
        }

        sess.items.push(item);
        sess.selected = sess.items.length - 1;
        await interaction.deferUpdate();
        return refresh(sess);
    }

    // ── Edit item ─────────────────────────────────────────────────────────────
    if (mcid === 'bldr_modal_edit') {
        const item = sess.items[sess.selected];
        if (!item) return interaction.reply({ flags: MessageFlags.Ephemeral, content: '> No item selected.' });

        item.content = interaction.fields.getTextInputValue('bldr_content').trim();
        if (item.type === 'section') {
            item.thumbnail = interaction.fields.getTextInputValue('bldr_thumbnail').trim() || null;
            item.btnLabel  = interaction.fields.getTextInputValue('bldr_btn_label').trim()  || null;
            item.btnStyle  = interaction.fields.getTextInputValue('bldr_btn_style').trim()  || 'Secondary';
            item.btnUrl    = interaction.fields.getTextInputValue('bldr_btn_url').trim()    || null;
        }

        await interaction.deferUpdate();
        return refresh(sess);
    }

    // ── Add / edit button row ──────────────────────────────────────────────────
    if (mcid === 'bldr_modal_btn') {
        const label = interaction.fields.getTextInputValue('bldr_btn_label').trim();
        const style = interaction.fields.getTextInputValue('bldr_btn_style').trim() || 'Primary';
        const url   = interaction.fields.getTextInputValue('bldr_btn_url').trim()   || null;
        const pos   = interaction.fields.getTextInputValue('bldr_btn_pos').trim().toLowerCase() || 'bottom';

        const btn = { label, style, url };

        // If selected item is already a btn_row and has room, append button
        const sel = sess.items[sess.selected];
        if (sel?.type === 'btn_row' && sel.buttons.length < 5) {
            sel.buttons.push(btn);
        } else {
            const newRow = { type: 'btn_row', buttons: [btn] };
            if (pos === 'top') {
                sess.items.unshift(newRow);
                sess.selected = 0;
            } else {
                sess.items.push(newRow);
                sess.selected = sess.items.length - 1;
            }
        }

        await interaction.deferUpdate();
        return refresh(sess);
    }
}

// ── Build the final (sent) container — clean IDs ──────────────────────────────
function buildFinalContainer(items, accentColor) {
    const c = new ContainerBuilder().setAccentColor(accentColor);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        switch (item.type) {
            case 'text':      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(item.content)); break;
            case 'header':    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${item.content}`)); break;
            case 'separator': c.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)); break;
            case 'sep_large': c.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)); break;
            case 'section': {
                const sec = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(item.content));
                if (item.btnLabel) {
                    const b = new ButtonBuilder().setLabel(item.btnLabel);
                    if (item.btnStyle === 'Link') {
                        b.setStyle(ButtonStyle.Link).setURL(item.btnUrl || 'https://discord.com');
                    } else {
                        b.setStyle(ButtonStyle[item.btnStyle] || ButtonStyle.Secondary).setCustomId(`built_sec_${i}_${Date.now()}`);
                    }
                    sec.setButtonAccessory(b);
                } else if (item.thumbnail) {
                    sec.setThumbnailAccessory(new ThumbnailBuilder().setURL(item.thumbnail));
                }
                c.addSectionComponents(sec);
                break;
            }
            case 'btn_row': {
                const row = new ActionRowBuilder();
                item.buttons.slice(0, 5).forEach((btn, bi) => {
                    const b = new ButtonBuilder().setLabel(btn.label);
                    if (btn.style === 'Link') {
                        b.setStyle(ButtonStyle.Link).setURL(btn.url || 'https://discord.com');
                    } else {
                        b.setStyle(ButtonStyle[btn.style] || ButtonStyle.Primary).setCustomId(`built_btn_${i}_${bi}_${Date.now()}`);
                    }
                    row.addComponents(b);
                });
                c.addActionRowComponents(row);
                break;
            }
        }
    }
    return c;
}
