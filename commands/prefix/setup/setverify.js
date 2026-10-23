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
    SeparatorBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'setverify',
    description: 'Verification System Configuration',
    usage: '&setverify',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    _sessionTimeout: 300000,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const settings = await GuildConfig.findOne({ guildId });
            const container = this._buildMainContainer(settings, theme, client, message.guild);

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            this._setupCollector(sent, message, theme, client);
        } catch (error) {
            console.error('[VerifySetup] Critical error:', error);
            await message.reply({ content: 'An unexpected error occurred. Please try again.' });
        }
    },

    _buildMainContainer(settings, theme, client, guild) {
        const themeColor = Number(theme.color) || 0x010101;
        const e = theme.emojis || {};

        const unverified   = settings?.unverifiedRoleId    ? `<@&${settings.unverifiedRoleId}>`    : '`Not Set`';
        const verified     = settings?.verifiedRoleId      ? `<@&${settings.verifiedRoleId}>`      : '`Not Set`';
        const female       = settings?.femaleRoleId        ? `<@&${settings.femaleRoleId}>`        : '`Not Set`';
        const logsChannel  = settings?.verifyLogChannelId  ? `<#${settings.verifyLogChannelId}>`  : '`Not Set`';
        const voiceHub     = settings?.verifyVoiceChannelId ? `<#${settings.verifyVoiceChannelId}>` : '`Not Set`';
        const staffRoles   = (settings?.verificatorsRoleIds || []).filter(Boolean);
        const staffDisplay = staffRoles.length > 0 ? staffRoles.map(id => `<@&${id}>`).join(', ') : '`Not Set`';

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            // 1: title + status
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${e.title || ''} __Verification System Setup__\n` +
                    `> ${e.star || ''} **Unverified Role:** ${unverified}\n` +
                    `> ${e.star || ''} **Male (Verified) Role:** ${verified}\n` +
                    `> ${e.star || ''} **Female Role:** ${female}\n` +
                    `> ${e.star || ''} **Verification Staff:** ${staffDisplay}\n` +
                    `> ${e.star || ''} **Logs Channel:** ${logsChannel}\n` +
                    `> ${e.star || ''} **Voice Hub:** ${voiceHub}`
                )
            )
            // 2: separator
            .addSeparatorComponents(new SeparatorBuilder())
            // 3+4: Unverified role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setverify_unverified_role')
                        .setPlaceholder('Unverified Role — given to new members')
                )
            )
            // 5+6: Verified (Male) role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setverify_verified_role')
                        .setPlaceholder('Male (Verified) Role — given after verifying as male')
                )
            )
            // 7+8: Female role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setverify_female_role')
                        .setPlaceholder('Female Role — given after verifying as female')
                )
            )
            // 9+10: Verification staff add (multi)
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setverify_staff_add')
                        .setPlaceholder('Verification Staff Roles — add up to 10 at once')
                        .setMinValues(1)
                        .setMaxValues(10)
                )
            )
            // 11+12: Logs channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setverify_logs_channel')
                        .setPlaceholder('Verify Logs Channel')
                        .setChannelTypes(ChannelType.GuildText)
                )
            )
            // 13+14: Voice hub channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setverify_voice_channel')
                        .setPlaceholder('Verification Voice Hub Channel')
                        .setChannelTypes(ChannelType.GuildVoice)
                )
            );

        // 15+16: Remove a Verification Staff Role (conditional)
        if (staffRoles.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setverify_staff_remove')
                        .setPlaceholder('  Remove a Verification Staff Role')
                        .addOptions(staffRoles.slice(0, 25).map(id => {
                            const role = guild?.roles.cache.get(id);
                            return { label: role ? role.name : 'Unknown Role', value: id };
                        }))
                )
            );
        }

        // Clear a field — lists all currently-set fields
        const clearOptions = [];
        if (settings?.unverifiedRoleId)    clearOptions.push({ label: 'Unverified Role',    value: 'unverified' });
        if (settings?.verifiedRoleId)      clearOptions.push({ label: 'Male Role',           value: 'verified' });
        if (settings?.femaleRoleId)        clearOptions.push({ label: 'Female Role',         value: 'female' });
        if (settings?.verifyLogChannelId)  clearOptions.push({ label: 'Logs Channel',        value: 'logs' });
        if (settings?.verifyVoiceChannelId) clearOptions.push({ label: 'Voice Hub',          value: 'voice' });
        if (staffRoles.length > 0)         clearOptions.push({ label: 'All Staff Roles',     value: 'staff_all' });

        if (clearOptions.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setverify_clear_field')
                        .setPlaceholder('  Clear a field — pick one to remove it')
                        .addOptions(clearOptions)
                )
            );
        }

        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setverify_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setverify_reset_all')
                        .setLabel('Reset All')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return container;
    },

    _setupCollector(sent, message, theme, client) {
        const themeColor = Number(theme.color) || 0x010101;

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('setverify_'),
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;

                if (customId === 'setverify_done') {
                    collector.stop('done');
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis?.yes || ''} __Setup Complete__\n` +
                                        `> ${theme.emojis?.star || ''} Verification system configuration has been saved.`
                                    )
                                )
                        ]
                    });
                    return;
                }

                if (customId === 'setverify_reset_all') {
                    await GuildConfig.findOneAndUpdate({ guildId }, {
                        $set: {
                            unverifiedRoleId: null, verifiedRoleId: null, femaleRoleId: null,
                            verificatorsRoleIds: [], verifyLogChannelId: null, verifyVoiceChannelId: null
                        }
                    }, { upsert: true });
                }
                else if (customId === 'setverify_unverified_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { unverifiedRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_verified_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { verifiedRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_female_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { femaleRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_staff_add') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $addToSet: { verificatorsRoleIds: { $each: interaction.values } } }, { upsert: true });
                }
                else if (customId === 'setverify_staff_remove') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $pull: { verificatorsRoleIds: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_logs_channel') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { verifyLogChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_voice_channel') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { verifyVoiceChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setverify_clear_field') {
                    const clearMap = {
                        unverified: { unverifiedRoleId: null },
                        verified:   { verifiedRoleId: null },
                        female:     { femaleRoleId: null },
                        logs:       { verifyLogChannelId: null },
                        voice:      { verifyVoiceChannelId: null },
                        staff_all:  { verificatorsRoleIds: [] }
                    };
                    const update = clearMap[interaction.values[0]];
                    if (update) await GuildConfig.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true });
                }

                const updated = await GuildConfig.findOne({ guildId });
                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [this._buildMainContainer(updated, theme, client, message.guild)]
                });

            } catch (err) {
                console.error('[VerifySetup] Interaction error:', err);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (_) { }
            }
        });
    }
};
