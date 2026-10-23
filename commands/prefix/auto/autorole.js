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
    RoleSelectMenuBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import colors from '../../../utils/colors.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';
import { MediaGalleryItemBuilder } from 'discord.js';

export default {
    name: 'autorole',
    aliases: ['autrole', 'arole'],
    description: 'Auto Role Configuration',
    usage: '& autorole',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],
    _activeSessions: new Map(),
    _sessionTimeout: 300000,

    async execute(message, args) {
        const sessionKey = `${message.guild.id}-${message.author.id}`;
        const theme = await message.client.themeManager.getTheme(message.guild.id);
        const themeData = this._processThemeData(theme);

        const settings = await this._loadSettings(message.guild.id);
        const container = this._buildMainContainer(settings, themeData, message.guild, theme, message.client);

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        this._activeSessions.set(sessionKey, {
            messageId: sent.id,
            timestamp: Date.now(),
            guildId: message.guild.id,
            userId: message.author.id,
            theme: theme // Store theme in session for later use
        });

        this._setupEventHandlers(sent, message, settings, themeData);
    },

    async _loadSettings(guildId) {
        const config = await GuildConfig.findOne({ guildId });
        return {
            autoRoleEnabled: !!config?.autoRoleEnabled,
            autoRole: config?.autoRole || null
        };
    },

    _processThemeData(theme) {
        const fallbackImage = 'https://media.discordapp.net/attachments/1482847336316145787/1482848551641026601/telechargement_1.jfif?ex=69b871d4&is=69b72054&hm=21eb2d93891ed8e3197039ffc0830f5fdf0c840d0ac3bfa44360818192e72c5b&=&format=webp';

        return {
            mainImage: theme?.images?.help || theme?.images?.main || fallbackImage,
            thumbnailImage: theme?.images?.thumbnail || fallbackImage,
            lineImage: theme?.images?.line || fallbackImage,
            generalEmojis: {
                clouds: theme?.emojis?.title || '',
                dot: theme?.emojis?.star || '•',
                info: theme?.emojis?.info || '',
                slap: theme?.emojis?.slap || '',
                yes: theme?.emojis?.yes || ''
            },
            statusEmojis: {
                online: theme?.emojis?.online || '',
                offline: theme?.emojis?.offline || ''
            },
            themeColor: theme?.color || 0x2f3136
        };
    },

    _buildMainContainer(settings, themeData, guild, theme, client) {
        const thumbnail = new ThumbnailBuilder()
            .setURL(guild.iconURL({ dynamic: true }) || themeData.thumbnailImage)
            .setDescription('Auto Role System Status');

        const isEnabled = settings?.autoRoleEnabled || false;
        const roleId = settings?.autoRole;
        const roleName = roleId ? (guild.roles.cache.get(roleId)?.name || 'Unknown Role') : 'None';

        const themeAnsi = getThemeAnsiCode(theme);

        const statusAnsi = isEnabled
            ? `\u001b[${themeAnsi}mENABLED\u001b[0m`
            : `\u001b[${themeAnsi}mDISABLED\u001b[0m`;

        const roleAnsi = roleId
            ? `\u001b[${themeAnsi}m${roleName}\u001b[0m`
            : `\u001b[${themeAnsi}mNone\u001b[0m`;

        return new ContainerBuilder()
            .setAccentColor(themeData.themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(getPanelBanner(guild, client))
                        .setDescription('Auto Role Setup')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${themeData.generalEmojis.clouds} __Auto Role Setup__\n` +
                    `> ${themeData.generalEmojis.clouds} ***__Current Configuration__***\n` +
                    `${this._generateStatusReport(settings, themeData, guild)}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `> ${themeData.generalEmojis.clouds} ***__Set Role__***\n` +
                        `> ${themeData.generalEmojis.dot} \`Pick a role to assign automatically.\`\n` +
                        `\`\`\`ansi\nCurrent Role: ${roleAnsi}\n\`\`\``
                    ))
                    .setThumbnailAccessory(thumbnail)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('autorole_set_select')
                        .setPlaceholder('Select the auto role...')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> -# ${themeData.generalEmojis.clouds || ''} __Press Done when finished__`)
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('autorole_done')
                            .setLabel('Done')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
    },

    _generateStatusReport(settings, themeData, guild) {
        if (!settings) {
            return `> **${themeData.generalEmojis.clouds} System Status**: Not Configured\n> ${themeData.generalEmojis.clouds} Auto role system requires initial setup`;
        }

        const isEnabled = settings.autoRoleEnabled || false;
        const roleId = settings.autoRole;
        const roleDisplay = roleId ? `<@&${roleId}>` : 'None';

        return `> **${themeData.generalEmojis.clouds} System Status**: ${isEnabled ? 'Enabled' : 'Disabled'}\n> ${themeData.generalEmojis.clouds} **Role**: ${roleDisplay}`;
    },

    _setupEventHandlers(sent, message, settings, themeData) {
        const filter = (interaction) =>
            interaction.user.id === message.author.id &&
            interaction.customId.startsWith('autorole_');

        const collector = sent.createMessageComponentCollector({
            filter,
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 3000) {
                return;
            }

            if (interaction.customId === 'autorole_done') {
                collector.stop('done');
                const container = new ContainerBuilder()
                    .setAccentColor(themeData.themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${themeData.generalEmojis.yes || ''} __Setup Complete__\n` +
                                    `> ${themeData.generalEmojis.dot || '•'} __Auto Role configuration has been saved.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true }) || themeData.thumbnailImage)
                            )
                    );

                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container]
                });
                return;
            }

            if (interaction.customId === 'autorole_set_select') {
                await this._handleSetRole(interaction, message, themeData);
            }
        });

        collector.on('end', async () => {
            await this._handleSessionEnd(sent, themeData);
            this._cleanupSession(message.guild.id, message.author.id);
        });
    },

    async _handleSetRole(interaction, message, themeData) {
        const sessionKey = `${message.guild.id}-${message.author.id}`;
        const currentSession = this._activeSessions.get(sessionKey);
        
        const roleId = interaction.values[0];
        const role = message.guild.roles.cache.get(roleId);

        if (!role) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { autoRole: roleId, autoRoleEnabled: true },
            { upsert: true, new: true }
        );

        // Reload settings to update UI
        const updatedSettings = await this._loadSettings(message.guild.id);

        let theme = currentSession?.theme;
        if (!theme) {
            theme = await message.client.themeManager.getTheme(message.guild.id);
        }

        const container = this._buildMainContainer(updatedSettings, themeData, message.guild, theme);

        await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },



    async _handleSessionEnd(sent, themeData) {
        // Do nothing on session end to prevent "Session Expired" message.
    },

    _cleanupSession(guildId, userId) {
        const sessionKey = `${guildId}-${userId}`;
        this._activeSessions.delete(sessionKey);
    }
};

function getThemeAnsiCode(theme) {
    const themeColors = {
        cyan: '34',
        red: '31',
        green: '32',
        gold: '33',
        yellow: '33',
        purple: '45',
        pink: '35',
        grey: '37',
        black: '30',
        white: '37'
    };
    try {
        if (!theme) return '36'; // Default cyan

        const themes = themeManager.themes || {};
        const themeName = Object.keys(themes).find(name =>
            themes[name].color === theme.color
        );

        return themeColors[themeName] || '36';
    } catch (error) {
        return '36';
    }
}
