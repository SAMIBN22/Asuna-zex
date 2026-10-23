import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
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

export default {
    name: 'setnick',
    description: 'Nickname & Joined Tag Configuration',
    usage: '&setnick',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],
    _sessionTimeout: 300000,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await themeManager.getTheme(guildId);
            const themeColor = Number(theme.color) || 0x010101;
            const settings = await GuildConfig.findOne({ guildId });
            const container = this._buildMain(settings, theme, client, message.guild);

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            this._setupCollector(sent, message, theme, themeColor, client);
        } catch (err) {
            console.error('[NickSetup] Error:', err);
            await message.reply({ content: ' An error occurred. Please try again.' });
        }
    },

    _buildMain(settings, theme, client, guild) {
        const themeColor = Number(theme.color) || 0x010101;
        const tag = settings?.joinedTag || null;
        const tagEnabled = settings?.joinedTagEnabled ?? false;
        const tagStatus = tag
            ? (tagEnabled ? ` \`${tag}\` (enabled)` : ` \`${tag}\` (disabled)`)
            : '`Not set`';

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(getPanelBanner(guild, client))
                        .setDescription('Nickname & Tags Setup')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __Nickname & Tags Setup__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Joined Tag:__** ${tagStatus}\n` +
                            `> -# New members keep their name and receive this tag before it on join`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setnick_set_tag')
                        .setLabel('Set Joined Tag')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('setnick_toggle_tag')
                        .setLabel(tagEnabled ? 'Disable Tag' : 'Enable Tag')
                        .setStyle(tagEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setDisabled(!tag),
                    new ButtonBuilder()
                        .setCustomId('setnick_remove_tag')
                        .setLabel('Remove Tag')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(!tag)
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Check All Tags__**\n` +
                            `> -# Apply the joined tag to all existing members`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setnick_check_all')
                            .setLabel('Apply to All')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(!tag || !tagEnabled)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Reset All Nicknames__**\n` +
                            `> -# Clear all member nicknames in this server`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setnick_reset_all')
                            .setLabel('Reset All')
                            .setStyle(ButtonStyle.Danger)
                    )
            );
    },

    _setupCollector(sent, message, theme, themeColor, client) {
        const filter = i =>
            i.user.id === message.author.id &&
            i.customId.startsWith('setnick_');

        const collector = sent.createMessageComponentCollector({ filter, time: this._sessionTimeout });

        collector.on('collect', async interaction => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;

                // ── Set Tag via Modal ─────────────────────────────────────────
                if (customId === 'setnick_set_tag') {
                    const modal = new ModalBuilder()
                        .setCustomId('setnick_tag_modal')
                        .setTitle('Set Joined Tag');

                    const tagInput = new TextInputBuilder()
                        .setCustomId('tag_value')
                         .setLabel('Tag (placed before the nickname on join)')
                        .setStyle(TextInputStyle.Short)
                         .setPlaceholder('e.g. | Official or • AID')
                        .setRequired(true)
                        .setMaxLength(32);

                    modal.addComponents(new ActionRowBuilder().addComponents(tagInput));
                    await interaction.showModal(modal);

                    const modalRes = await interaction.awaitModalSubmit({
                        filter: i => i.user.id === interaction.user.id && i.customId === 'setnick_tag_modal',
                        time: 60_000
                    }).catch(() => null);

                    if (!modalRes) return;

                    const tag = modalRes.fields.getTextInputValue('tag_value').trim().slice(0, 32);
                    await GuildConfig.findOneAndUpdate(
                        { guildId },
                        { $set: { joinedTag: tag, joinedTagEnabled: true } },
                        { upsert: true }
                    );

                    await modalRes.deferUpdate().catch(() => {});
                    const updated = await GuildConfig.findOne({ guildId });
                    return modalRes.message.edit({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(updated, theme, client, message.guild)]
                    }).catch(() => {});
                }

                // ── Toggle Tag ────────────────────────────────────────────────
                if (customId === 'setnick_toggle_tag') {
                    const cur = await GuildConfig.findOne({ guildId });
                    await GuildConfig.findOneAndUpdate(
                        { guildId },
                        { $set: { joinedTagEnabled: !cur?.joinedTagEnabled } },
                        { upsert: true }
                    );
                }

                // ── Remove Tag ────────────────────────────────────────────────
                if (customId === 'setnick_remove_tag') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId },
                        { $set: { joinedTag: null, joinedTagEnabled: false } },
                        { upsert: true }
                    );
                }

                // ── Apply tag to all members ──────────────────────────────────
                if (customId === 'setnick_check_all') {
                    await interaction.deferUpdate().catch(() => {});
                    const cfg = await GuildConfig.findOne({ guildId });
                    const tag = cfg?.joinedTag;
                    if (!tag) return;
                            const prefix = `${tag} `;
                    await message.guild.members.fetch();
                    let updated = 0, skipped = 0;
                    for (const member of message.guild.members.cache.filter(m => !m.user.bot).values()) {
                        try {
                            const nick = member.nickname || '';
                            if (nick.startsWith(prefix)) { skipped++; continue; }
                            if (!member.manageable) { skipped++; continue; }
                            const baseName = nick || member.user.displayName || member.user.username;
                            await member.setNickname(`${prefix}${baseName}`.slice(0, 32).trim());
                            updated++;
                        } catch { skipped++; }
                    }
                    await interaction.followUp({
                        content: ` Applied tag to **${updated}** members. Skipped: **${skipped}**.`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                    return;
                }

                // ── Reset all nicknames ───────────────────────────────────────
                if (customId === 'setnick_reset_all') {
                    await interaction.deferUpdate().catch(() => {});
                    await message.guild.members.fetch();
                    let cleared = 0, skipped = 0;
                    for (const member of message.guild.members.cache.filter(m => !m.user.bot).values()) {
                        try {
                            if (!member.manageable) { skipped++; continue; }
                            await member.setNickname(null);
                            cleared++;
                        } catch { skipped++; }
                    }
                    await interaction.followUp({
                        content: ` Reset **${cleared}** nicknames. Skipped: **${skipped}**.`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                    return;
                }

                // Refresh panel
                if (customId !== 'setnick_check_all' && customId !== 'setnick_reset_all' && customId !== 'setnick_set_tag') {
                    const settings = await GuildConfig.findOne({ guildId });
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [this._buildMain(settings, theme, client, message.guild)]
                    });
                }

            } catch (err) {
                console.error('[NickSetup] Collector error:', err);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch {}
            }
        });
    }
};
