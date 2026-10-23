import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField, MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import GuildSetup from '../models/guildSetup.js';
import helpCommand from '../commands/prefix/general/help.js';

export default {
    name: 'panelManager',
    async init(client) {
        this.client = client;
        client.panelManager = this;
        this.handlePanelInteraction = this.handlePanelInteraction.bind(this);
        this.handleJailPanel = this.handleJailPanel.bind(this);
        this.handleVerifyPanel = this.handleVerifyPanel.bind(this);
        this.handleWarnPanel = this.handleWarnPanel.bind(this);
        this.handleJailModal = this.handleJailModal.bind(this);
        this.handleVerifyModal = this.handleVerifyModal.bind(this);
        this.handleWarnModal = this.handleWarnModal.bind(this);
        this.handlePremiumPanel = this.handlePremiumPanel.bind(this);
        this.handlePremiumModal = this.handlePremiumModal.bind(this);
        this.showHelp = this.showHelp.bind(this);
        this.showPanelModal = this.showPanelModal.bind(this);
    },

    async handlePanelInteraction(interaction) {
        if (!interaction.guild) return;
        const { customId } = interaction;
        if (['panel_jail_user', 'panel_unjail_user', 'panel_jail_info', 'panel_help_jail'].includes(customId)) {
            return this.handleJailPanel(interaction);
        }
        if (['panel_verify_boy', 'panel_verify_girl', 'panel_verify_check', 'panel_sus', 'panel_unsus', 'panel_sus_info', 'panel_help_verification'].includes(customId)) {
            return this.handleVerifyPanel(interaction);
        }
        if (['panel_warn_first', 'panel_warn_second', 'panel_warn_last', 'panel_unwarn', 'panel_warn_info', 'panel_help_warn'].includes(customId)) {
            return this.handleWarnPanel(interaction);
        }
        if (customId.startsWith('panel_premium_')) {
            return this.handlePremiumPanel(interaction);
        }
        if (interaction.isModalSubmit()) {
            if (customId.startsWith('modal_panel_jail_') || customId.startsWith('modal_panel_unjail_')) return this.handleJailModal(interaction);
            if (customId.startsWith('modal_panel_verify_') || customId.startsWith('modal_panel_sus')) return this.handleVerifyModal(interaction);
            if (customId.startsWith('modal_panel_warn_') || customId.startsWith('modal_panel_unwarn')) return this.handleWarnModal(interaction);
            if (customId.startsWith('modal_panel_premium_')) return this.handlePremiumModal(interaction);
            if (customId.startsWith('modal_sec_reason_')) return this.handleSecurityModal(interaction);
            if (customId.startsWith('modal_sec_limit_')) return this.handleSecurityLimitModal(interaction);
        }
    },

    async handleJailPanel(interaction) {
        try {
            const { customId, client, guildId } = interaction;
            const theme = await client.themeManager.getTheme(guildId);
            const config = await client.getSettings(guildId);

            if (!config || !config.jailerRoleId) return interaction.reply({ content: "Jail system not configured.", ephemeral: true });

            if (interaction.replied || interaction.deferred) return;
            
            const jailerRoles = Array.isArray(config.jailerRoleId) ? config.jailerRoleId : [config.jailerRoleId];
            const isAuthorized = interaction.member.roles.cache.some(r => jailerRoles.includes(r.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            
            if (!isAuthorized) return interaction.reply({ content: "Permission denied.", ephemeral: true });

            if (customId === 'panel_help_jail') {
                return this.showHelp(interaction, 'Jail', theme);
            }

            const actionMap = {
                'panel_jail_user': 'Jail User',
                'panel_unjail_user': 'Unjail User',
                'panel_jail_info': 'Jail Info'
            };

            const title = actionMap[customId];
            if (!title) return;

            await this.showPanelModal(interaction, title, customId === 'panel_jail_user' ? 'Reason' : null);
        } catch (error) {
            console.error('[handleJailPanel] Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    },

    async handleVerifyPanel(interaction) {
        try {
            const { customId, client, guildId } = interaction;
            const theme = await client.themeManager.getTheme(guildId);
            const config = await client.getSettings(guildId);

            if (!config || !config.verificatorsRoleIds) return interaction.reply({ content: "Verification system not configured.", ephemeral: true });

            if (interaction.replied || interaction.deferred) return;
            
            const verificatorRoles = Array.isArray(config.verificatorsRoleIds) ? config.verificatorsRoleIds : [config.verificatorsRoleIds];
            const isAuthorized = interaction.member.roles.cache.some(r => verificatorRoles.includes(r.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            
            if (!isAuthorized) return interaction.reply({ content: "Permission denied.", ephemeral: true });

            if (customId === 'panel_help_verification') {
                return this.showHelp(interaction, 'Verification', theme);
            }

            const actionMap = {
                'panel_verify_boy': 'Verify Boy',
                'panel_verify_girl': 'Verify Girl',
                'panel_verify_check': 'Verify Check',
                'panel_sus': 'Sus User',
                'panel_unsus': 'Unsus User',
                'panel_sus_info': 'Sus Info'
            };

            const title = actionMap[customId];
            if (!title) return;

            await this.showPanelModal(interaction, title, customId === 'panel_sus' ? 'Reason' : null);
        } catch (error) {
            console.error('[handleVerifyPanel] Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    },

    async handleWarnPanel(interaction) {
        try {
            const { customId, client, guildId } = interaction;
            const theme = await client.themeManager.getTheme(guildId);
            const config = await client.getSettings(guildId);

            if (!config || !config.warnerRoleIds) return interaction.reply({ content: "Warn system not configured.", ephemeral: true });

            if (interaction.replied || interaction.deferred) return;

            const warnerRoles = Array.isArray(config.warnerRoleIds) ? config.warnerRoleIds : [config.warnerRoleIds];
            const isAuthorized = interaction.member.roles.cache.some(r => warnerRoles.includes(r.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            
            if (!isAuthorized) return interaction.reply({ content: "Permission denied.", ephemeral: true });

            if (customId === 'panel_help_warn') {
                return this.showHelp(interaction, 'Warn', theme);
            }

            const actionMap = {
                'panel_warn_first': 'First Warn',
                'panel_warn_second': 'Second Warn',
                'panel_warn_last': 'Last Warn',
                'panel_unwarn': 'Unwarn User',
                'panel_warn_info': 'Warn Info'
            };

            const title = actionMap[customId];
            if (!title) return;

            // Warn actions need a reason, unwarn needs type, info needs nothing extra
            let secondInput = null;
            if (['panel_warn_first', 'panel_warn_second', 'panel_warn_last'].includes(customId)) {
                secondInput = 'Reason';
            } else if (customId === 'panel_unwarn') {
                secondInput = 'Type (first, second, last, all)';
            }

            await this.showPanelModal(interaction, title, secondInput);
        } catch (error) {
            console.error('[handleWarnPanel] Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    },

    async handlePremiumPanel(interaction) {
        try {
            const { customId, client, member, guildId } = interaction;
            const theme = await client.themeManager.getTheme(guildId);
            const themeColor = client.themeManager.getRGBColor(theme.color);

            if (customId === 'panel_premium_help') {
                return this.showHelp(interaction, 'Premium', theme);
            }

            // 1. Find the room owned by the user OR the room the user is currently in (for managers/admins)
            let setup = await GuildSetup.findOne({ guildId, ownerId: member.id, type: 'prime-room' });
            const voiceChannel = member.voice.channel;

            if (!setup && voiceChannel) {
                setup = await GuildSetup.findOne({ channelId: voiceChannel.id });
            }

            if (!setup) {
                return interaction.reply({ 
                    content: "❌ You don't own a prime room and aren't currently in one you manage.", 
                    ephemeral: true 
                });
            }

            // Handle Info Button
            if (customId === 'panel_premium_info') {
                const managers = setup.managers?.length > 0 ? setup.managers.map(id => `<@${id}>`).join(", ") : "None";
                const role = setup.roleId ? `<@&${setup.roleId}>` : "None";

                const infoContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${theme.emojis.title || '☁️'} __Room Information__\n\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__Owner:__** <@${setup.ownerId}>\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__Managers:__** ${managers}\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__Room Role:__** ${role}\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **__Created:__** <t:${Math.floor(setup.createdAt / 1000)}:R>`
                        )
                    );
                return interaction.reply({ components: [infoContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
            }

            const isOwner = setup.ownerId === member.id;
            const isManager = setup.managers?.includes(member.id);
            const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!isAdmin && !isOwner && !isManager) {
                return interaction.reply({ content: "❌ Only the room owner and managers can use this control.", ephemeral: true });
            }

            if (customId === 'panel_premium_name') {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('panel_premium_rename_menu')
                    .setPlaceholder('Choose what to rename')
                    .addOptions([
                        { label: 'Voice Channel', value: 'channel', description: 'Rename only the voice channel' },
                        { label: 'Role', value: 'role', description: 'Rename only the room role' },
                        { label: 'Both', value: 'both', description: 'Rename both channel and role' }
                    ]);

                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.title || '☁️'} __Select Rename Target__\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **Choice:** Select which component you want to rename.`
                        )
                    )
                    .addActionRowComponents(row => row.setComponents(selectMenu));

                return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
            }

            // Handle the rename target selection
            if (customId === 'panel_premium_rename_menu') {
                const choice = interaction.values[0];
                const modal = new ModalBuilder()
                    .setCustomId(`modal_panel_premium_name_${choice}`)
                    .setTitle('Change Room Name');

                const input = new TextInputBuilder()
                    .setCustomId('input_value')
                    .setLabel('New Name')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the new name here...')
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            const actionMap = {
                'panel_premium_limit': { title: 'Change User Limit', label: 'Limit (0-99)', placeholder: 'Enter limit' },
                'panel_premium_user_add': { title: 'Add User to Room', label: 'User ID', placeholder: 'Enter user ID' },
                'panel_premium_user_remove': { title: 'Reject User from Room', label: 'User ID', placeholder: 'Enter user ID' },
                'panel_premium_manager_add': { title: 'Add Manager', label: 'User ID', placeholder: 'Enter user ID' },
                'panel_premium_manager_remove': { title: 'Remove Manager', label: 'User ID', placeholder: 'Enter user ID' }
            };

            const config = actionMap[customId];
            if (!config) return;

            const modal = new ModalBuilder().setCustomId(`modal_${customId}`).setTitle(config.title);
            const input = new TextInputBuilder()
                .setCustomId('input_value')
                .setLabel(config.label)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(config.placeholder)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        } catch (error) {
            console.error('[handlePremiumPanel] Error:', error);
            if (this.client.webhookLogger) {
                await this.client.webhookLogger.logError('Premium Panel Error', error, interaction.guildId).catch(() => { });
            }
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ An interaction error occurred: ${error.message}`, ephemeral: true }).catch(() => { });
            }
        }
    },

    async handlePremiumModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        try {
            const { customId, client, member, guild } = interaction;
            const theme = await client.themeManager.getTheme(guild.id);
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const value = interaction.fields.getTextInputValue('input_value');
            
            const fullAction = customId.replace('modal_panel_premium_', '');
            const actionParts = fullAction.split('_');
            const action = actionParts[0];
            const choice = actionParts[1];

            if (action === 'name' && choice) {
                let setup = await GuildSetup.findOne({ guildId: guild.id, ownerId: member.id, type: 'prime-room' });
                const voiceChannel = member.voice.channel;
                if (!setup && voiceChannel) setup = await GuildSetup.findOne({ channelId: voiceChannel.id });

                if (!setup) return interaction.editReply("❌ Setup not found for this room.");

                const targetChannel = guild.channels.cache.get(setup.channelId);
                if (choice === 'channel' || choice === 'both') {
                    if (targetChannel) await targetChannel.setName(value);
                }
                if ((choice === 'role' || choice === 'both') && setup.roleId) {
                    const role = guild.roles.cache.get(setup.roleId);
                    if (role) await role.setName(value);
                }

                setup.name = value;
                await setup.save();

                const successContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.emojis.yes || '✅'} __Name Updated__\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} __Target:__ \`${choice.toUpperCase()}\`\n` +
                            `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} __New Name:__ \`${value}\``
                        )
                    );
                return interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            }

            const commandMapping = {
                'limit': 'plimit',
                'user_add': 'puser',
                'user_remove': 'puser',
                'manager_add': 'pmanager',
                'manager_remove': 'pmanager'
            };

            const cmdName = commandMapping[fullAction];
            if (!cmdName) return interaction.editReply("Internal error: Command logic not found.");

            const command = client.prefixCommands.get(cmdName);
            if (!command) return interaction.editReply("Internal error: Command logic not found.");

            let args = [value];
            if (fullAction === 'user_add') args = ['add', value];
            if (fullAction === 'user_remove') args = ['remove', value];
            if (fullAction === 'manager_add') args = ['add', value];
            if (fullAction === 'manager_remove') args = ['remove', value];

            const mockMessage = this.createMockMessage(interaction, value);
            await command.execute(mockMessage, args, client);
        } catch (error) {
            console.error('[PremiumModal] Error:', error);
            if (!interaction.replied) await interaction.editReply("An error occurred while processing your request.").catch(() => { });
        } finally {
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: "Action completed." }).catch(() => { });
            }
        }
    },

    async showHelp(interaction, category, theme) {
        const themeColor = this.client.themeManager.getRGBColor(theme.color);
        const commands = await helpCommand.loadCommandsFromCategory(category, this.client);
        
        const starEmoji = theme.emojis.star || '<a:15278182396090124351:1528064846267158558>';
        const prefix = this.client.config.prefix || '+';
        const commandsList = commands.map(cmd => `> ${starEmoji} \`${prefix}${cmd.name}\` - ${cmd.description}`).join('\n');

        const helpContainer = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${theme.emojis.title || '🛡️'} __${category} Command Guide__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(commandsList || `> ${theme.emojis.dot || '•'} *No commands found in this category.*`)
            );

        if (interaction.replied || interaction.deferred) return;
        await interaction.reply({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        }).catch(() => { });
    },

    async showPanelModal(interaction, title, secondInputLabel) {
        const modal = new ModalBuilder()
            .setCustomId(`modal_${interaction.customId}`)
            .setTitle(title);

        const idInput = new TextInputBuilder()
            .setCustomId('target_user_id')
            .setLabel("Target User ID")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter user ID")
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(idInput));

        if (secondInputLabel) {
            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel(secondInputLabel)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        }

        await interaction.showModal(modal);
    },

    async handleJailModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetId = interaction.fields.getTextInputValue('target_user_id');

            let reason = null;
            try {
                reason = interaction.fields.getTextInputValue('reason');
            } catch (e) {
                try {
                    reason = interaction.fields.getTextInputValue('jail_reason');
                } catch (e2) { }
            }
            const action = interaction.customId.replace('modal_panel_', '');

            const args = [targetId];
            if (reason) args.push(reason);

            const command = this.client.prefixCommands.get(action.replace('_user', '').replace('_', ''));
            if (!command) return interaction.editReply("Command logic not found.");

            const mockMessage = this.createMockMessage(interaction, targetId);
            await command.execute(mockMessage, args, this.client);
        } catch (error) {
            console.error('[JailModal] Error:', error);
            if (!interaction.replied) await interaction.editReply("An error occurred while processing the jail action.").catch(() => { });
        } finally {
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: "Action completed." }).catch(() => { });
            }
        }
    },

    async handleVerifyModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetId = interaction.fields.getTextInputValue('target_user_id');

            let reason = null;
            try {
                reason = interaction.fields.getTextInputValue('reason');
            } catch (e) {
                try {
                    reason = interaction.fields.getTextInputValue('sus_reason');
                } catch (e2) { }
            }
            const action = interaction.customId.replace('modal_panel_', '').replace('verify_', '');

            const args = [targetId];
            if (reason) args.push(reason);

            let commandName = action;
            if (action === 'boy') commandName = 'verifyboy';
            if (action === 'girl') commandName = 'verifygirls';
            if (action === 'check') commandName = 'verifyinfo';
            if (action === 'sus_info') commandName = 'susinfo';

            const command = this.client.prefixCommands.get(commandName);
            if (!command) return interaction.editReply("Command logic not found.");

            const mockMessage = this.createMockMessage(interaction, targetId);
            await command.execute(mockMessage, args, this.client);
        } catch (error) {
            console.error('[VerifyModal] Error:', error);
            if (!interaction.replied) await interaction.editReply("An error occurred during verification.").catch(() => { });
        } finally {
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: "Action completed." }).catch(() => { });
            }
        }
    },

    async handleWarnModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        try {
            const targetId = interaction.fields.getTextInputValue('target_user_id');
            const action = interaction.customId.replace('modal_panel_', '');

            const args = [targetId];

            let commandName;
            if (['warn_first', 'warn_second', 'warn_last'].includes(action)) {
                const type = action.replace('warn_', '');
                let reason = 'No reason provided';
                try { reason = interaction.fields.getTextInputValue('reason') || reason; } catch (e) { }
                args.push(type);
                args.push(reason);
                commandName = 'warn';
            } else if (action === 'unwarn') {
                let type = 'all';
                try { type = interaction.fields.getTextInputValue('reason') || 'all'; } catch (e) { }
                args.push(type);
                args.push('Unwarned via Panel');
                commandName = 'unwarn';
            } else if (action === 'warn_info') {
                commandName = 'warninfo';
            }

            const command = this.client.prefixCommands.get(commandName);
            if (!command) return interaction.editReply("Command logic not found.");

            const mockMessage = this.createMockMessage(interaction, targetId);
            await command.execute(mockMessage, args, this.client);
        } catch (error) {
            console.error('[WarnModal] Error:', error);
            if (!interaction.replied) await interaction.editReply("An error occurred while managing warnings.").catch(() => { });
        } finally {
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: "Action completed." }).catch(() => { });
            }
        }
    },

    async handleSecurityModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        const { customId, guildId, client } = interaction;
        const parts = customId.split('_');
        const moduleName = parts[3];
        const action = parts[4];
        const reason = interaction.fields.getTextInputValue('punishment_reason');

        let actionKey = '';
        let reasonKey = '';

        if (moduleName === 'antilink') { actionKey = 'antiLinkAction'; reasonKey = 'antiLinkReason'; }
        if (moduleName === 'antibot') { actionKey = 'antiBotAction'; reasonKey = 'antiBotReason'; }
        if (moduleName === 'antiwebhook') { actionKey = 'antiWebhookAction'; reasonKey = 'antiWebhookReason'; }
        if (moduleName === 'antitokens') { actionKey = 'antiTokenAction'; reasonKey = 'antiTokenReason'; }
        if (moduleName === 'antiraid') { actionKey = 'antiRaidAction'; reasonKey = 'antiRaidReason'; }
        if (moduleName === 'antiban') { actionKey = 'antiBanAction'; reasonKey = 'antiBanReason'; }
        if (moduleName === 'antikick') { actionKey = 'antiKickAction'; reasonKey = 'antiKickReason'; }
        if (moduleName === 'antimute') { actionKey = 'antiMuteAction'; reasonKey = 'antiMuteReason'; }
        if (moduleName === 'antichannelcreate') { actionKey = 'antiChannelCreateAction'; reasonKey = 'antiChannelCreateReason'; }
        if (moduleName === 'antichanneldelete') { actionKey = 'antiChannelDeleteAction'; reasonKey = 'antiChannelDeleteReason'; }
        if (moduleName === 'antichannelupdate') { actionKey = 'antiChannelUpdateAction'; reasonKey = 'antiChannelUpdateReason'; }
        if (moduleName === 'antirolecreate') { actionKey = 'antiRoleCreateAction'; reasonKey = 'antiRoleCreateReason'; }
        if (moduleName === 'antiroledelete') { actionKey = 'antiRoleDeleteAction'; reasonKey = 'antiRoleDeleteReason'; }
        if (moduleName === 'antiroleupdate') { actionKey = 'antiRoleUpdateAction'; reasonKey = 'antiRoleUpdateReason'; }
        if (moduleName === 'antirolepermsupdate') { actionKey = 'antiRolePermsUpdateAction'; reasonKey = 'antiRolePermsUpdateReason'; }
        if (moduleName === 'antiguildupdate') { actionKey = 'antiGuildUpdateAction'; reasonKey = 'antiGuildUpdateReason'; }

        await client.saveSettings(guildId, actionKey, action);
        await client.saveSettings(guildId, reasonKey, reason);

        const theme = await client.themeManager.getTheme(guildId);
        const container = new ContainerBuilder()
            .setAccentColor(client.themeManager.getRGBColor(theme.color))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${theme.emojis.title || '🛡️'} __Settings Updated__\n` +
                    `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **Module:** \`${moduleName.toUpperCase()}\`\n` +
                    `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **Action:** \`${action.toUpperCase()}\`\n` +
                    `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **Reason:** \`${reason}\`\n\n` +
                    `> ${theme.emojis.star} *Re-open the module settings to see the changes.*`
                )
            );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    async handleSecurityLimitModal(interaction) {
        if (interaction.replied || interaction.deferred) return;
        await interaction.deferReply({ ephemeral: true });

        const { customId, guildId, client } = interaction;
        const moduleName = customId.split('_')[3];
        const limit = parseInt(interaction.fields.getTextInputValue('module_limit'));

        if (isNaN(limit) || limit < 1) {
            return interaction.editReply({ content: "❌ Please enter a valid number greater than 0.", ephemeral: true });
        }

        // Map module names to correct limit key casing
        const limitKeyMap = {
            'antilink': 'antiLinkLimit',
            'antibot': 'antiBotLimit',
            'antiwebhook': 'antiWebhookLimit',
            'antitokens': 'antiTokenLimit',
            'antiraid': 'antiRaidLimit',
            'antiban': 'antiBanLimit',
            'antikick': 'antiKickLimit',
            'antimute': 'antiMuteLimit',
            'antichannelcreate': 'antiChannelCreateLimit',
            'antichanneldelete': 'antiChannelDeleteLimit',
            'antichannelupdate': 'antiChannelUpdateLimit',
            'antirolecreate': 'antiRoleCreateLimit',
            'antiroledelete': 'antiRoleDeleteLimit',
            'antiroleupdate': 'antiRoleUpdateLimit',
            'antirolepermsupdate': 'antiRolePermsUpdateLimit',
            'antiguildupdate': 'antiGuildUpdateLimit'
        };

        const limitKey = limitKeyMap[moduleName] || `${moduleName}Limit`;
        await client.saveSettings(guildId, limitKey, limit);

        const theme = await client.themeManager.getTheme(guildId);
        const container = new ContainerBuilder()
            .setAccentColor(client.themeManager.getRGBColor(theme.color))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${theme.emojis.title || '🛡️'} __Limit Updated__\n` +
                    `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **Module:** \`${moduleName.toUpperCase()}\`\n` +
                    `> ${theme.emojis.star || '<a:15278182396090124351:1528064846267158558>'} **New Limit:** \`${limit} violations\`\n\n` +
                    `> ${theme.emojis.star} *Re-open the module settings to see the changes.*`
                )
            );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },

    createMockMessage(interaction, targetId) {
        return {
            guild: interaction.guild,
            member: interaction.member,
            author: interaction.user,
            client: this.client,
            id: interaction.id,
            createdTimestamp: Date.now(),
            mentions: {
                members: { first: () => interaction.guild.members.cache.get(targetId) || null },
                users: { first: () => this.client.users.cache.get(targetId) || null }
            },
            reply: async (payload) => {
                if (typeof payload === 'string') payload = { content: payload };
                if (!interaction.deferred && !interaction.replied) {
                    return interaction.reply(payload).catch(() => { });
                }
                return interaction.editReply(payload).catch(() => { });
            },
            channel: {
                id: interaction.channelId,
                send: async (payload) => {
                    if (typeof payload === 'string') payload = { content: payload };
                    return interaction.followUp({ ...payload, ephemeral: true }).catch(() => { });
                },
                cache: interaction.channel.cache
            }
        };
    }
};
