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
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';
import { MediaGalleryItemBuilder } from 'discord.js';
import colors from '../../../utils/colors.js';
import themeManager from '../../../themes/themeManager.js';

export default {
    name: 'autonick',
    description: 'Auto Nickname Configuration',
    usage: 'autonick',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],
    _activeSessions: new Map(),
    _sessionTimeout: 300000,

    async execute(message, args) {
        const sessionKey = `${message.guild.id}-${message.author.id}`;
        const theme = await message.client.themeManager.getTheme(message.guild.id);
        const themeData = this._processThemeData(theme);



        const settings = await this._loadAutonickSettings(message.guild.id);
        const container = this._buildMainContainer(settings, themeData, message.guild, message.client);

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        this._activeSessions.set(sessionKey, {
            messageId: sent.id,
            timestamp: Date.now(),
            guildId: message.guild.id,
            userId: message.author.id,
            currentFormat: null,
            theme // Store theme
        });

        this._setupEventHandlers(sent, message, settings, themeData);
        this._setupModalHandlers(message, settings, themeData);
    },

    async _loadAutonickSettings(guildId) {
        const config = await GuildConfig.findOne({ guildId });
        return {
            autonickEnabled: !!config?.autonickEnabled,
            autonickFormat: config?.autonickFormat || null
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
                status: theme?.emojis?.status || {},
            },
            themeColor: theme?.color || 0x2f3136,
            rawTheme: theme // Pass raw theme for ANSI helper
        };
    },

    _buildMainContainer(settings, themeData, guild, client) {
        const thumbnail = new ThumbnailBuilder()
            .setURL(guild.iconURL({ dynamic: true }) || themeData.thumbnailImage)
            .setDescription('Auto Nickname System Status');

        const isEnabled = settings?.autonickEnabled || false;
        const nicknameFormat = settings?.autonickFormat || '{tag}{displayname}';

        // Calculate ANSI code
        const themeAnsi = this._getThemeAnsiCode(themeData.rawTheme);
        const format1Text = `\u001b[${themeAnsi}mFormat: {tag} {displayname}\u001b[0m`;
        const format2Text = `\u001b[${themeAnsi}mFormat: {displayname} {tag}\u001b[0m`;

        return new ContainerBuilder()
            .setAccentColor(themeData.themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(getPanelBanner(guild, client, themeData.rawTheme))
                        .setDescription('Auto Nickname Setup')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${themeData.generalEmojis.clouds} __Auto Nickname Setup__\n` +
                    `> ${themeData.generalEmojis.clouds} ***__Current Configuration__***\n` +
                    `${this._generateStatusReport(settings, themeData)}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `> ${themeData.generalEmojis.clouds} ***__Tag First__***\n` +
                        `> ${themeData.generalEmojis.dot} \`Put the tag before the display name ({tag} {name}).\`\n` +
                        `\`\`\`ansi\n${format1Text}\n\`\`\``
                    ))
                    .setThumbnailAccessory(thumbnail)
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('autonick_format1')
                            .setLabel('Select Tag First')
                            .setStyle(isEnabled && nicknameFormat.includes('{displayname}') ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `> ${themeData.generalEmojis.clouds} ***__Tag Last__***\n` +
                        `> ${themeData.generalEmojis.dot} \`Put the tag after the display name ({name} {tag}).\`\n` +
                        `\`\`\`ansi\n${format2Text}\n\`\`\``
                    ))
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId('autonick_format2')
                            .setLabel('Select Tag Last')
                            .setStyle(isEnabled && nicknameFormat.includes('{tag}') && !nicknameFormat.includes('{displayname}') ? ButtonStyle.Secondary : ButtonStyle.Primary)
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
                            .setCustomId('autonick_done')
                            .setLabel('Done')
                            .setStyle(ButtonStyle.Secondary)
                    )
            );
    },

    _generateStatusReport(settings, themeData) {
        if (!settings) {
            return `> **${themeData.generalEmojis.clouds} System Status**: Not Configured\n> ${themeData.generalEmojis.clouds} Auto nickname system requires initial setup`;
        }

        const isEnabled = settings.autonickEnabled || false;
        const format = settings.autonickFormat || '{tag}{displayname}';

        return `> **${themeData.generalEmojis.clouds} System Status**: ${isEnabled ? 'Enabled' : 'Disabled'}\n> ${themeData.generalEmojis.clouds} **Format**: \`${format}\``;
    },

    _setupEventHandlers(sent, message, settings, themeData) {
        const filter = (interaction) =>
            interaction.user.id === message.author.id &&
            this._isValidInteraction(interaction.customId);

        const collector = sent.createMessageComponentCollector({
            filter,
            time: this._sessionTimeout
        });

        collector.on('collect', async (interaction) => {
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 3000) {
                console.log(colors.yellow('[AutonickSetup] Interaction too old, ignoring'));
                return;
            }

            await this._handleInteraction(interaction, message, settings, themeData);
        });

        collector.on('end', async () => {
            await this._handleSessionEnd(sent, themeData);
            this._cleanupSession(message.guild.id, message.author.id);
        });
    },

    _isValidInteraction(customId) {
        const validIds = [
            'autonick_format1',
            'autonick_format2',
            'autonick_done'
        ];
        return validIds.includes(customId);
    },

    async _handleInteraction(interaction, message, settings, themeData) {
        const { customId } = interaction;

        switch (customId) {
            case 'autonick_done':
                const container = new ContainerBuilder()
                    .setAccentColor(themeData.themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${themeData.generalEmojis.yes || ''} __Setup Complete__\n` +
                                    `> ${themeData.generalEmojis.dot || '•'} __Auto Nickname configuration has been saved.__`
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
                break;
            case 'autonick_format1':
                await this._handleFormatModal(interaction, message, settings, themeData, '{tag}{displayname}');
                break;
            case 'autonick_format2':
                await this._handleFormatModal(interaction, message, settings, themeData, '{displayname}{tag}');
                break;
        }
    },

    async _handleFormatModal(interaction, message, settings, themeData, format) {
        const sessionKey = `${message.guild.id}-${message.author.id}`;
        if (this._activeSessions.has(sessionKey)) {
            this._activeSessions.get(sessionKey).currentFormat = format;
        }

        const modal = new ModalBuilder()
            .setCustomId('autonick_format_modal')
            .setTitle(`Format: ${format}`);

        const formatInput = new TextInputBuilder()
            .setCustomId('nickname_format')
            .setLabel('Enter Tag (e.g., #VI)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your tag like #VI')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(20);

        modal.addComponents(new ActionRowBuilder().addComponents(formatInput));
        await interaction.showModal(modal);
    },

    async _handleSessionEnd(sent, themeData) {
        // Do nothing on session end to prevent "Session Expired" message.
    },

    _setupModalHandlers(message, settings, themeData) {
        const sessionKey = `${message.guild.id}-${message.author.id}`;

        const modalHandler = async (interaction) => {
            if (interaction.user.id === message.author.id &&
                interaction.isModalSubmit() &&
                interaction.customId === 'autonick_format_modal') {

                const currentSession = this._activeSessions.get(sessionKey);
                if (!currentSession) return;

                const format = currentSession.currentFormat || '{tag}{displayname}';
                const tag = interaction.fields.getTextInputValue('nickname_format');
                const fullFormat = format.replace('{tag}', tag);

                await GuildConfig.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { autonickFormat: fullFormat, autonickEnabled: true },
                    { upsert: true, new: true }
                );

                const updatedSettings = await this._loadAutonickSettings(message.guild.id);
                const container = this._buildMainContainer(updatedSettings, themeData, message.guild, message.client);

                try {
                    await interaction.reply({
                        content: `${themeData.generalEmojis.yes} Auto nickname format has been set`,
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.log(colors.red('[AutonickSetup] Failed to reply to interaction:', error.message));
                    return;
                }

                if (currentSession.messageId) {
                    try {
                        const originalMessage = await message.channel.messages.fetch(currentSession.messageId);
                        await originalMessage.edit({
                            flags: MessageFlags.IsComponentsV2,
                            components: [container]
                        });
                    } catch (error) {
                        await message.channel.send({
                            flags: MessageFlags.IsComponentsV2,
                            components: [container]
                        });
                    }
                } else {
                    await message.channel.send({
                        flags: MessageFlags.IsComponentsV2,
                        components: [container]
                    });
                }

                this._cleanupSession(message.guild.id, message.author.id);
                message.client.off('interactionCreate', modalHandler);
            }
        };

        // Register as a persistent listener but with a 5-minute self-destruct
        // timeout. Using a named function reference allows clean removal.
        // This prevents the leak where each autonick invocation added a listener
        // that was never removed if the modal was dismissed.
        message.client.on('interactionCreate', modalHandler);
        setTimeout(() => {
            message.client.off('interactionCreate', modalHandler);
        }, 5 * 60 * 1000);
    },

    _getThemeAnsiCode(theme) {
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
            if (!theme) return '36';
            const themes = themeManager.themes || {};
            const themeName = Object.keys(themes).find(name =>
                themes[name].color === theme.color
            );
            return themeColors[themeName] || '36';
        } catch (error) {
            return '36';
        }
    },

    _cleanupSession(guildId, userId) {
        const sessionKey = `${guildId}-${userId}`;
        this._activeSessions.delete(sessionKey);
    }
};