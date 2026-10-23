import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

export default {
    name: 'setvoicestats',
    description: 'Voice Stats Channels Configuration',
    usage: '&setvoicestats',
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
            console.error('[VoiceStatsSetup] Error:', err);
            await message.reply({ content: ' An error occurred. Please try again.' });
        }
    },

    _buildMain(settings, theme, client, guild) {
        const themeColor = Number(theme.color) || 0x010101;
        const membersCh = settings?.serverMembersChannelId ? `<#${settings.serverMembersChannelId}>` : '`Not created`';
        const voiceCh   = settings?.voiceOnlineChannelId   ? `<#${settings.voiceOnlineChannelId}>`   : '`Not created`';

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(getPanelBanner(guild, client))
                        .setDescription('Voice Stats Setup')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __Voice Stats Channels__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Server Members Channel:__** ${membersCh}\n` +
                            `> ${theme.emojis?.star || ''} **__Voice Online Channel:__** ${voiceCh}\n\n` +
                            `> -# These voice channels auto-update their name to show live counts`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Total Members Counter__**\n` +
                            `> -# Creates a voice channel showing total server members`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setvoice_create_members')
                            .setLabel(settings?.serverMembersChannelId ? 'Recreate' : 'Create')
                            .setStyle(ButtonStyle.Primary)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis?.star || ''} **__Voice Online Counter__**\n` +
                            `> -# Creates a voice channel showing members currently in voice`
                        )
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setvoice_create_online')
                            .setLabel(settings?.voiceOnlineChannelId ? 'Recreate' : 'Create')
                            .setStyle(ButtonStyle.Primary)
                    )
            );
    },

    _setupCollector(sent, message, theme, themeColor, client) {
        const filter = i =>
            i.user.id === message.author.id &&
            i.customId.startsWith('setvoice_');

        const collector = sent.createMessageComponentCollector({ filter, time: this._sessionTimeout });

        collector.on('collect', async interaction => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;
                const guild = message.guild;

                if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return interaction.reply({
                        content: ' I need **Manage Channels** permission to create voice channels.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.deferUpdate().catch(() => {});

                // ── Server Members Channel ────────────────────────────────────
                if (customId === 'setvoice_create_members') {
                    const count = guild.memberCount;
                    const channel = await guild.channels.create({
                        name: `Members: ${count}`,
                        type: ChannelType.GuildVoice,
                        permissionOverwrites: [{
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect],
                            allow: [PermissionFlagsBits.ViewChannel]
                        }]
                    });

                    await GuildConfig.findOneAndUpdate(
                        { guildId },
                        { $set: { serverMembersChannelId: channel.id } },
                        { upsert: true }
                    );
                }

                // ── Voice Online Channel ──────────────────────────────────────
                if (customId === 'setvoice_create_online') {
                    const count = guild.members.cache.filter(m => m.voice?.channel).size;
                    const channel = await guild.channels.create({
                        name: `Voice Online: ${count}`,
                        type: ChannelType.GuildVoice,
                        permissionOverwrites: [{
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect],
                            allow: [PermissionFlagsBits.ViewChannel]
                        }]
                    });

                    await GuildConfig.findOneAndUpdate(
                        { guildId },
                        { $set: { voiceOnlineChannelId: channel.id } },
                        { upsert: true }
                    );
                }

                const settings = await GuildConfig.findOne({ guildId });
                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [this._buildMain(settings, theme, client, guild)]
                }).catch(() => {});

            } catch (err) {
                console.error('[VoiceStatsSetup] Collector error:', err);
                try { await interaction.followUp({ content: 'An error occurred.', flags: MessageFlags.Ephemeral }); } catch {}
            }
        });
    }
};
