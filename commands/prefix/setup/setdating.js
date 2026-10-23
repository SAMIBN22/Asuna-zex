/**
 * setdating.js  —  &setdating
 * Configure the 𝐀𝐬𝐮𝐧𝐚Cord Dating System channel settings.
 * Also accessible from &setup → 𝐀𝐬𝐮𝐧𝐚Cord Dating.
 *
 * Channels:
 *   Panel Channel        — where the &dating public panel is posted
 *   Male Profiles        — male profiles posted here on "Post Profile"
 *   Female Profiles      — female profiles posted here on "Post Profile"
 *   Thread Posts         — thread messages posted here on "Thread"
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType,
} from 'discord.js';

import DatingConfig from '../../../models/datingConfig.js';

export default {
    name:        'setdating',
    aliases:     ['setvynel', 'datingsetup'],
    description: 'Configure the 𝐀𝐬𝐮𝐧𝐚Cord Dating System',
    usage:       '&setdating',
    category:    'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    _sessionTimeout: 300_000,

    async execute(message, args, client) {
        try {
            const guildId  = message.guild.id;
            const theme    = await client.themeManager.getTheme(guildId);
            const settings = await DatingConfig.findOne({ guildId });
            const container = this._buildMainContainer(settings, theme);

            const sent = await message.reply({
                flags:      MessageFlags.IsComponentsV2,
                components: [container]
            });

            this._setupCollector(sent, message, theme, client);
        } catch (error) {
            console.error('[DatingSetup] Critical error:', error);
            await message.reply({ content: 'An unexpected error occurred. Please try again.' });
        }
    },

    _buildMainContainer(settings, theme) {
        const themeColor = Number(theme.color) || 0x2b2d31;

        const panel    = settings?.panelChannelId   ? `<#${settings.panelChannelId}>`   : '`Not Set`';
        const male     = settings?.maleChannelId    ? `<#${settings.maleChannelId}>`    : '`Not Set`';
        const female   = settings?.femaleChannelId  ? `<#${settings.femaleChannelId}>` : '`Not Set`';
        const thread   = settings?.threadChannelId  ? `<#${settings.threadChannelId}>` : '`Not Set`';

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            // Title + status summary
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `##  __𝐀𝐬𝐮𝐧𝐚Cord Dating System Setup__\n` +
                    `> **Panel Channel:** ${panel}\n` +
                    `> **Male Profiles Channel:** ${male}\n` +
                    `> **Female Profiles Channel:** ${female}\n` +
                    `> **Thread Posts Channel:** ${thread}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            // Panel channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setdating_panel_channel')
                        .setPlaceholder('Panel Channel — where the public dating panel is posted')
                        .setChannelTypes(ChannelType.GuildText)
                )
            )
            // Male profiles channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setdating_male_channel')
                        .setPlaceholder('Male Profiles Channel — male profiles posted here')
                        .setChannelTypes(ChannelType.GuildText)
                )
            )
            // Female profiles channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setdating_female_channel')
                        .setPlaceholder('Female Profiles Channel — female profiles posted here')
                        .setChannelTypes(ChannelType.GuildText)
                )
            )
            // Thread posts channel
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('setdating_thread_channel')
                        .setPlaceholder('Thread Posts Channel — thread posts sent here')
                        .setChannelTypes(ChannelType.GuildText)
                )
            );

        // Clear a field — only show if at least one is configured
        const clearOptions = [];
        if (settings?.panelChannelId)  clearOptions.push({ label: 'Panel Channel',          value: 'panel' });
        if (settings?.maleChannelId)   clearOptions.push({ label: 'Male Profiles Channel',  value: 'male' });
        if (settings?.femaleChannelId) clearOptions.push({ label: 'Female Profiles Channel', value: 'female' });
        if (settings?.threadChannelId) clearOptions.push({ label: 'Thread Posts Channel',   value: 'thread' });

        if (clearOptions.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('setdating_clear_field')
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
                        .setCustomId('setdating_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('setdating_reset_all')
                        .setLabel('Reset All')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return container;
    },

    _setupCollector(sent, message, theme, client) {
        const themeColor = Number(theme.color) || 0x2b2d31;

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('setdating_'),
            time:   this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;
                const guildId      = message.guild.id;

                if (customId === 'setdating_done') {
                    collector.stop('done');
                    return interaction.update({
                        flags:      MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `##  __Setup Complete__\n` +
                                        `> 𝐀𝐬𝐮𝐧𝐚Cord Dating System has been configured.\n` +
                                        `> Run \`&dating\` to post the public panel.`
                                    )
                                )
                        ]
                    });
                }

                if (customId === 'setdating_reset_all') {
                    await DatingConfig.findOneAndUpdate({ guildId }, {
                        $set: { panelChannelId: null, maleChannelId: null, femaleChannelId: null, threadChannelId: null }
                    }, { upsert: true });
                }
                else if (customId === 'setdating_panel_channel') {
                    await DatingConfig.findOneAndUpdate({ guildId }, { $set: { panelChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setdating_male_channel') {
                    await DatingConfig.findOneAndUpdate({ guildId }, { $set: { maleChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setdating_female_channel') {
                    await DatingConfig.findOneAndUpdate({ guildId }, { $set: { femaleChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setdating_thread_channel') {
                    await DatingConfig.findOneAndUpdate({ guildId }, { $set: { threadChannelId: interaction.values[0] } }, { upsert: true });
                }
                else if (customId === 'setdating_clear_field') {
                    const clearMap = {
                        panel:  { panelChannelId: null },
                        male:   { maleChannelId: null },
                        female: { femaleChannelId: null },
                        thread: { threadChannelId: null },
                    };
                    const update = clearMap[interaction.values[0]];
                    if (update) await DatingConfig.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true });
                }

                const updated  = await DatingConfig.findOne({ guildId });
                return interaction.update({
                    flags:      MessageFlags.IsComponentsV2,
                    components: [this._buildMainContainer(updated, theme)]
                });

            } catch (err) {
                console.error('[DatingSetup] Interaction error:', err);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (_) { }
            }
        });
    }
};
