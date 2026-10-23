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
import themeManager from '../../../themes/themeManager.js';

export default {
    name: 'setwarn',
    description: 'Warn System Configuration',
    usage: '&setwarn',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    _sessionTimeout: 300000,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await themeManager.getTheme(guildId);
            const settings = await GuildConfig.findOne({ guildId });
            const container = this._buildMainContainer(settings, theme, client, message.guild);

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            this._setupCollector(sent, message, theme, client);
        } catch (error) {
            console.error('[WarnSetup] Critical error:', error);
            await message.reply({ content: 'An unexpected error occurred. Please try again.' });
        }
    },

    _buildMainContainer(settings, theme, client, guild) {
        const themeColor = Number(theme.color) || 0x010101;
        const e = theme.emojis || {};

        const firstWarn   = settings?.firstWarnRoleId  ? `<@&${settings.firstWarnRoleId}>`  : '`Not Set`';
        const secondWarn  = settings?.secondWarnRoleId ? `<@&${settings.secondWarnRoleId}>` : '`Not Set`';
        const lastWarn    = settings?.lastWarnRoleId   ? `<@&${settings.lastWarnRoleId}>`   : '`Not Set`';
        const logsChannel = settings?.warnLogsChannelId ? `<#${settings.warnLogsChannelId}>` : '`Not Set`';
        const warnerRoles = (settings?.warnerRoleIds || []).filter(Boolean);
        const warnerDisplay = warnerRoles.length > 0 ? warnerRoles.map(id => `<@&${id}>`).join(', ') : '`Not Set`';

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            // 1: title + status
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${e.title || ''} __Warn System Setup__\n` +
                    `> ${e.star || ''} **First Warn Role:** ${firstWarn}\n` +
                    `> ${e.star || ''} **Second Warn Role:** ${secondWarn}\n` +
                    `> ${e.star || ''} **Last Warn Role:** ${lastWarn}\n` +
                    `> ${e.star || ''} **Warner Staff:** ${warnerDisplay}\n` +
                    `> ${e.star || ''} **Logs Channel:** ${logsChannel}`
                )
            )
            // 2: separator
            .addSeparatorComponents(new SeparatorBuilder())
            // 3+4: First Warn Role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setwarn_first_role')
                        .setPlaceholder('First Warn Role — assigned on 1st warning')
                )
            )
            // 5+6: Second Warn Role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setwarn_second_role')
                        .setPlaceholder('Second Warn Role — assigned on 2nd warning')
                )
            )
            // 7+8: Last Warn Role
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setwarn_last_role')
                        .setPlaceholder('Last Warn Role — assigned on final warning')
                )
            )
            // 9+10: Warner Staff add (multi)
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setwarn_warner_add')
                        .setPlaceholder('Warner Staff Roles — add up to 10 at once')
                        .setMinValues(1)
                        .setMaxValues(10)
                )
            )
            // 11+12: Logs channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setwarn_logs_channel')
                        .setPlaceholder('Warn Logs Channel')
                        .setChannelTypes(ChannelType.GuildText)
                )
            );

        // 13+14: Remove a Warner Role (conditional)
        if (warnerRoles.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setwarn_warner_remove')
                        .setPlaceholder('  Remove a Warner Staff Role')
                        .addOptions(warnerRoles.slice(0, 25).map(id => {
                            const role = guild?.roles.cache.get(id);
                            return { label: role ? role.name : 'Unknown Role', value: id };
                        }))
                )
            );
        }

        // Clear a field — lists all currently-set fields
        const clearOptions = [];
        if (settings?.firstWarnRoleId)  clearOptions.push({ label: 'First Warn Role',  value: 'first' });
        if (settings?.secondWarnRoleId) clearOptions.push({ label: 'Second Warn Role', value: 'second' });
        if (settings?.lastWarnRoleId)   clearOptions.push({ label: 'Last Warn Role',   value: 'last' });
        if (settings?.warnLogsChannelId) clearOptions.push({ label: 'Logs Channel',    value: 'logs' });
        if (warnerRoles.length > 0)     clearOptions.push({ label: 'All Warner Staff Roles', value: 'warner_all' });

        if (clearOptions.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setwarn_clear_field')
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
                        .setCustomId('setwarn_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setwarn_reset_all')
                        .setLabel('Reset All')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return container;
    },

    _setupCollector(sent, message, theme, client) {
        const themeColor = Number(theme.color) || 0x010101;

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('setwarn_'),
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;

                if (customId === 'setwarn_done') {
                    collector.stop('done');
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis?.yes || ''} __Setup Complete__\n` +
                                        `> ${theme.emojis?.star || ''} Warn system configuration has been saved.`
                                    )
                                )
                        ]
                    });
                    return;
                }

                if (customId === 'setwarn_reset_all') {
                    await GuildConfig.findOneAndUpdate({ guildId }, {
                        $set: {
                            firstWarnRoleId: null, secondWarnRoleId: null, lastWarnRoleId: null,
                            warnerRoleIds: [], warnLogsChannelId: null
                        }
                    }, { upsert: true });
                }
                else if (customId === 'setwarn_first_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { firstWarnRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setwarn_second_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { secondWarnRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setwarn_last_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { lastWarnRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setwarn_warner_add') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $addToSet: { warnerRoleIds: { $each: interaction.values } } }, { upsert: true });
                }
                else if (customId === 'setwarn_warner_remove') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $pull: { warnerRoleIds: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setwarn_logs_channel') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { warnLogsChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setwarn_clear_field') {
                    const clearMap = {
                        first:      { firstWarnRoleId: null },
                        second:     { secondWarnRoleId: null },
                        last:       { lastWarnRoleId: null },
                        logs:       { warnLogsChannelId: null },
                        warner_all: { warnerRoleIds: [] }
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
                console.error('[WarnSetup] Interaction error:', err);
                try { await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true }); } catch (_) { }
            }
        });
    }
};
