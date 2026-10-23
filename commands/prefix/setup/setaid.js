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
    ChannelType,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'setneedhelp',
    description: 'Need Help System Configuration',
    usage: '&setneedhelp',
    aliases: ['setaid'],
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    _sessionTimeout: 300000,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;

            const theme = await client.themeManager.getTheme(guildId);
            const themeColor = Number(theme.color) || 0x010101;



            const settings = await GuildConfig.findOne({ guildId });
            const container = this._buildMainContainer(settings, theme, client);

            const sent = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });



            this._setupCollector(sent, message, theme, themeColor, client);

        } catch (error) {
            console.error('[AidSetup] Critical error:', error);
            await message.reply({ content: ' An unexpected error occurred. Please try again.', flags: MessageFlags.SuppressEmbeds });
        }
    },

    _buildMainContainer(settings, theme, client) {
        const themeColor = Number(theme.color) || 0x010101;

        const helperRoles = settings?.helperRoleIds?.length > 0
            ? settings.helperRoleIds.map(id => `<@&${id}>`).join(', ')
            : `\`.v setneedhelp\``;
        const logsChannel = settings?.needHelpLogsChannelId ? `<#${settings.needHelpLogsChannelId}>` : `\`.v setneedhelp\``;
        const templateVC = settings?.templateChannelId ? `<#${settings.templateChannelId}>` : `\`.v setneedhelp\``;
        const category = settings?.needHelpCategoryId ? `<#${settings.needHelpCategoryId}>` : `\`.v setneedhelp\``;

        const helperSelect = new RoleSelectMenuBuilder()
            .setCustomId('setaid_helper_role')
            .setPlaceholder('Select Helper Staff Role');

        const logsSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setaid_logs_channel')
            .setPlaceholder('Select Need Help Logs Channel')
            .setChannelTypes(ChannelType.GuildText);

        const vcSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setaid_template_vc')
            .setPlaceholder('Select Template Voice Channel (Hub)')
            .setChannelTypes(ChannelType.GuildVoice);

        const categorySelect = new ChannelSelectMenuBuilder()
            .setCustomId('setaid_category')
            .setPlaceholder('Select Need Help Category')
            .setChannelTypes(ChannelType.GuildCategory);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis.title || ''} __Setup Need Help__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star || ''} **__Helper Roles:__** ${helperRoles}\n` +
                            `> ${theme.emojis.star || ''} **__Logs Channel:__** ${logsChannel}\n` +
                            `> ${theme.emojis.star || ''} **__Template Voice (Hub):__** ${templateVC}\n` +
                            `> ${theme.emojis.star || ''} **__Category:__** ${category}\n\n` +
                            `${theme.emojis.title || ''} ___Configure need help roles and channels here.___`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(helperSelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(logsSelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(vcSelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(categorySelect))
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> -# ${theme.emojis.title || ''} __Press Done when finished or Reset to clear all settings__`)
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('setaid_done')
                            .setLabel('Done')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
    },

    _setupCollector(sent, message, theme, themeColor, client) {


        const filter = (interaction) =>
            interaction.user.id === message.author.id &&
            interaction.customId.startsWith('setaid_');

        const collector = sent.createMessageComponentCollector({
            filter,
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;

                if (customId === 'setaid_done') {
                    collector.stop('done');
                    await interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `## ${theme.emojis.yes || ''} __Setup Complete__\n` +
                                            `> ${theme.emojis.star || ''} __Need help system configuration has been saved.__`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                                    )
                            )
                        ]
                    });
                    return;
                }

                if (customId === 'setaid_helper_role') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $addToSet: { helperRoleIds: interaction.values[0] } },
                        { upsert: true, new: true }
                    );
                }
                if (customId === 'setaid_logs_channel') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { needHelpLogsChannelId: interaction.values[0] } },
                        { upsert: true, new: true }
                    );
                }
                if (customId === 'setaid_template_vc') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { templateChannelId: interaction.values[0] } },
                        { upsert: true, new: true }
                    );
                }
                if (customId === 'setaid_category') {
                    await GuildConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { needHelpCategoryId: interaction.values[0] } },
                        { upsert: true, new: true }
                    );
                }

                const updatedSettings = await GuildConfig.findOne({ guildId: message.guild.id });
                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [this._buildMainContainer(updatedSettings, theme, client)]
                });

            } catch (error) {
                console.error('[AidSetup] Interaction error:', error);
                try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (e) { }
            }
        });


    }
};
