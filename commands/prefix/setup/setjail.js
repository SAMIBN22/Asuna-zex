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
    ThumbnailBuilder,
    SectionBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'setjail',
    description: 'Jail System Configuration',
    usage: '&setjail',
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
            console.error('[JailSetup] Critical error:', error);
            await message.reply({ content: 'An unexpected error occurred. Please try again.' });
        }
    },

    _buildMainContainer(settings, theme, client, guild) {
        const themeColor = Number(theme.color) || 0x010101;
        const e = theme.emojis || {};

        const jailRole     = settings?.jailRoleId        ? `<@&${settings.jailRoleId}>`        : '`Not Set`';
        const antiJail     = settings?.antiJailRoleId    ? `<@&${settings.antiJailRoleId}>`    : '`Not Set`';
        const logsChannel  = settings?.jailLogsChannelId ? `<#${settings.jailLogsChannelId}>` : '`Not Set`';
        const jailVC       = settings?.jailVCId           ? `<#${settings.jailVCId}>`           : '`Not Set`';
        const jailCategory = settings?.jailVCCategoryId  ? `<#${settings.jailVCCategoryId}>`  : '`Not Set`';
        const hammerRoles  = (settings?.jailerRoleId || []).filter(Boolean);
        const hammerDisplay = hammerRoles.length > 0 ? hammerRoles.map(id => `<@&${id}>`).join(', ') : '`Not Set`';

        // Component budget: every node counts toward Discord's 40-component limit.
        // This panel is designed to stay well under 40 at all times.
        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            // 1: TextDisplay (title + status)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${e.title || ''} __Jail System Setup__\n` +
                    `> ${e.star || ''} **Jail Role:** ${jailRole}\n` +
                    `> ${e.star || ''} **Hammer Roles:** ${hammerDisplay}\n` +
                    `> ${e.star || ''} **Anti-Jail Role:** ${antiJail}\n` +
                    `> ${e.star || ''} **Logs Channel:** ${logsChannel}\n` +
                    `> ${e.star || ''} **Jail Voice:** ${jailVC}\n` +
                    `> ${e.star || ''} **Jail Category:** ${jailCategory}`
                )
            )
            // 2: Separator
            .addSeparatorComponents(new SeparatorBuilder())
            // 3+4: Jail Role select
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setjail_jail_role')
                        .setPlaceholder('Jail Role — select to set or replace')
                )
            )
            // 5+6: Hammer Roles add (multi)
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setjail_hammer_add')
                        .setPlaceholder('Hammer (Jailer) Roles — add up to 10 at once')
                        .setMinValues(1)
                        .setMaxValues(10)
                )
            )
            // 7+8: Anti-Jail role select
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('setjail_antijail_role')
                        .setPlaceholder('Anti-Jail Role — cannot be jailed')
                )
            )
            // 9+10: Logs channel select
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setjail_logs_channel')
                        .setPlaceholder('Jail Logs Channel')
                        .setChannelTypes(ChannelType.GuildText)
                )
            )
            // 11+12: Jail VC select
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setjail_vc_channel')
                        .setPlaceholder('Jail Voice Channel')
                        .setChannelTypes(ChannelType.GuildVoice)
                )
            )
            // 13+14: Jail Category select
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setjail_category')
                        .setPlaceholder('Jail Category')
                        .setChannelTypes(ChannelType.GuildCategory)
                )
            );

        // 15+16: Remove a Hammer Role (conditional — only if hammer roles exist)
        if (hammerRoles.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setjail_hammer_remove')
                        .setPlaceholder('  Remove a Hammer Role')
                        .addOptions(hammerRoles.slice(0, 25).map(id => {
                            const role = guild?.roles.cache.get(id);
                            return { label: role ? role.name : 'Unknown Role', value: id };
                        }))
                )
            );
        }

        // Clear a field — single StringSelect listing every currently-set field
        const clearOptions = [];
        if (settings?.jailRoleId)        clearOptions.push({ label: 'Jail Role',        value: 'jail_role' });
        if (settings?.antiJailRoleId)    clearOptions.push({ label: 'Anti-Jail Role',   value: 'antijail' });
        if (settings?.jailLogsChannelId) clearOptions.push({ label: 'Logs Channel',     value: 'logs' });
        if (settings?.jailVCId)          clearOptions.push({ label: 'Jail Voice Channel', value: 'vc' });
        if (settings?.jailVCCategoryId)  clearOptions.push({ label: 'Jail Category',    value: 'category' });
        if (hammerRoles.length > 0)      clearOptions.push({ label: 'All Hammer Roles', value: 'hammer_all' });

        if (clearOptions.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setjail_clear_field')
                        .setPlaceholder('  Clear a field — pick one to remove it')
                        .addOptions(clearOptions)
                )
            );
        }

        // Separator + Done / Reset All
        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setjail_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setjail_reset_all')
                        .setLabel('Reset All')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return container;
    },

    _setupCollector(sent, message, theme, client) {
        const themeColor = Number(theme.color) || 0x010101;

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('setjail_'),
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;
                const guildId = message.guild.id;

                if (customId === 'setjail_done') {
                    collector.stop('done');
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis?.yes || ''} __Setup Complete__\n` +
                                        `> ${theme.emojis?.star || ''} Jail system configuration has been saved.`
                                    )
                                )
                        ]
                    });
                    return;
                }

                if (customId === 'setjail_reset_all') {
                    await GuildConfig.findOneAndUpdate({ guildId }, {
                        $set: {
                            jailRoleId: null, antiJailRoleId: null, jailerRoleId: [],
                            jailLogsChannelId: null, jailVCId: null, jailVCCategoryId: null
                        }
                    }, { upsert: true });
                }
                else if (customId === 'setjail_jail_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { jailRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_hammer_add') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $addToSet: { jailerRoleId: { $each: interaction.values } } }, { upsert: true });
                }
                else if (customId === 'setjail_hammer_remove') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $pull: { jailerRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_antijail_role') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { antiJailRoleId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_logs_channel') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { jailLogsChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_vc_channel') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { jailVCId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_category') {
                    await GuildConfig.findOneAndUpdate({ guildId }, { $set: { jailVCCategoryId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setjail_clear_field') {
                    const clearMap = {
                        jail_role:   { jailRoleId: null },
                        antijail:    { antiJailRoleId: null },
                        logs:        { jailLogsChannelId: null },
                        vc:          { jailVCId: null },
                        category:    { jailVCCategoryId: null },
                        hammer_all:  { jailerRoleId: [] }
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
                console.error('[JailSetup] Interaction error:', err);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (_) { }
            }
        });
    }
};
