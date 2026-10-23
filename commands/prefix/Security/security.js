import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder
} from 'discord.js';

export default {
    name: 'security',
    aliases: ['secpanel', 'securitypanel', 'sec'],
    description: 'Universal Security Control Panel',
    category: 'Security',
    usage: '&security',
    permissions: [PermissionFlagsBits.Administrator],
    guildOnly: true,

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const settings = await client.getSettings(guildId);

            if (message.author.id !== message.guild.ownerId && !client.config.devIds.includes(message.author.id)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(client.themeManager.getRGBColor(theme.color))
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${theme.emojis.title || ''} __Permission Denied__\n` +
                                    `> ${theme.emojis.star || ''} You do not have enough permissions to use this command.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                            )
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }

            const container = this._buildMainPanel(settings, theme, client);

            const sent = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            this._setupCollector(sent, message, theme, client);

        } catch (error) {
            console.error('[SecurityPanel Error]:', error);
            message.reply({ content: ` **Error:** \`${error.message}\`` }).catch(() => { });
        }
    },

    _buildMainPanel(settings, theme, client) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const emoji = theme.emojis.title || '';
        const star = theme.emojis.star || '';

        const getStatus = (val) => val === 1 || val === true ? '`ON`' : '`OFF`';

        const moduleSelect = new StringSelectMenuBuilder()
            .setCustomId('sec_module_select')
            .setPlaceholder('Choose a protection to configure...')
            .addOptions([
                { label: 'Anti-Link', value: 'antilink', emoji: theme.emojis.title || '', description: 'Block invites and links.' },
                { label: 'Anti-Bot', value: 'antibot', emoji: theme.emojis.title || '', description: 'Block malicious bots.' },
                { label: 'Anti-Webhook', value: 'antiwebhook', emoji: theme.emojis.title || '', description: 'Block unauthorized webhooks.' },
                { label: 'Anti-Tokens', value: 'antitokens', emoji: theme.emojis.title || '', description: 'Block token leaks.' },
                { label: 'Anti-Raid', value: 'antiraid', emoji: theme.emojis.title || '', description: 'Block join raids.' },
                { label: 'Anti-Ban', value: 'antiban', emoji: theme.emojis.title || '', description: 'Limit unauthorized bans.' },
                { label: 'Anti-Kick', value: 'antikick', emoji: theme.emojis.title || '', description: 'Limit unauthorized kicks.' },
                { label: 'Anti-Mute', value: 'antimute', emoji: theme.emojis.title || '', description: 'Limit unauthorized timeouts.' },
                { label: 'Anti-Move', value: 'antimove', emoji: theme.emojis.title || '', description: 'Limit unauthorized voice moves.' },
                { label: 'Anti-Channel Create', value: 'antichannelcreate', emoji: theme.emojis.title || '', description: 'Limit channel creation.' },
                { label: 'Anti-Channel Delete', value: 'antichanneldelete', emoji: theme.emojis.title || '', description: 'Limit channel deletion.' },
                { label: 'Anti-Channel Update', value: 'antichannelupdate', emoji: theme.emojis.title || '', description: 'Prevent channel edits.' },
                { label: 'Anti-Role Create', value: 'antirolecreate', emoji: theme.emojis.title || '', description: 'Limit role creation.' },
                { label: 'Anti-Role Delete', value: 'antiroledelete', emoji: theme.emojis.title || '', description: 'Limit role deletion.' },
                { label: 'Anti-Role Update', value: 'antiroleupdate', emoji: theme.emojis.title || '', description: 'Prevent role edits (Rename/Color).' },
                { label: 'Anti-Role Perms Update', value: 'antirolepermsupdate', emoji: theme.emojis.title || '', description: 'Prevent role permission edits.' },
                { label: 'Anti-Server Update', value: 'antiguildupdate', emoji: theme.emojis.title || '', description: 'Prevent server property edits.' }
            ]);

        return new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${emoji} __Security Dashboard__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${star} **__Core Protection Overview__**\n\n` +
                            `> ${star} **__Anti-Link:__** ${getStatus(settings.antiLink)}  •  **__Anti-Bot:__** ${getStatus(settings.antiBot)}\n` +
                            `> ${star} **__Anti-Token:__** ${getStatus(settings.antiTokenEnabled)}  •  **__Anti-Webhook:__** ${getStatus(settings.antiWebhook)}\n` +
                            `> ${star} **__Anti-Raid:__** ${getStatus(settings.antiRaidEnabled)}  •  **__Anti-Ban:__** ${getStatus(settings.antiBanEnabled)}\n` +
                            `> ${star} **__Anti-Kick:__** ${getStatus(settings.antiKickEnabled)}  •  **__Anti-Mute:__** ${getStatus(settings.antiMuteEnabled)}\n` +
                            `> ${star} **__Anti-Move:__** ${getStatus(settings.antiMoveEnabled)}\n` +
                            `> ${star} **__Anti-Channel:__** ${getStatus(settings.antiChannelUpdateEnabled)}  •  **__Anti-Role:__** ${getStatus(settings.antiRoleUpdateEnabled)}\n` +
                            `> ${star} **__Anti-Server:__** ${getStatus(settings.antiGuildUpdateEnabled)}`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emoji} __Security Management__`)
            )
            .addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));
    },

    _buildModuleConfig(settings, theme, client, moduleName) {
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const emoji = theme.emojis.title || '';
        const star = theme.emojis.star || '';

        let title = '';
        let description = '';
        let statusKey = '';
        let actionKey = '';
        let limitKey = '';
        let isEnabled = false;
        let showWhitelist = false;
        let showLimit = false;

        switch (moduleName) {
            case 'antilink':
                title = 'Anti-Link';
                description = 'Block invites and links.';
                statusKey = 'antiLink';
                actionKey = 'antiLinkAction';
                isEnabled = settings.antiLink === 1;
                showWhitelist = true;
                break;
            case 'antibot':
                title = 'Anti-Bot';
                description = 'Block malicious bots.';
                statusKey = 'antiBot';
                actionKey = 'antiBotAction';
                isEnabled = settings.antiBot === 1;
                showWhitelist = true;
                break;
            case 'antiwebhook':
                title = 'Anti-Webhook';
                description = 'Block unauthorized webhooks.';
                statusKey = 'antiWebhook';
                actionKey = 'antiWebhookAction';
                isEnabled = settings.antiWebhook === 1;
                showWhitelist = true;
                break;
            case 'antitokens':
                title = 'Anti-Tokens';
                description = 'Block token leaks.';
                statusKey = 'antiTokenEnabled';
                actionKey = 'antiTokenAction';
                isEnabled = settings.antiTokenEnabled === true;
                showWhitelist = true;
                break;
            case 'antiraid':
                title = 'Anti-Raid';
                description = 'Block join raids.';
                statusKey = 'antiRaidEnabled';
                actionKey = 'antiRaidAction';
                limitKey = 'antiRaidLimit';
                isEnabled = settings.antiRaidEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antiban':
                title = 'Anti-Ban';
                description = 'Limit unauthorized bans.';
                statusKey = 'antiBanEnabled';
                actionKey = 'antiBanAction';
                limitKey = 'antiBanLimit';
                isEnabled = settings.antiBanEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antikick':
                title = 'Anti-Kick';
                description = 'Limit unauthorized kicks.';
                statusKey = 'antiKickEnabled';
                actionKey = 'antiKickAction';
                limitKey = 'antiKickLimit';
                isEnabled = settings.antiKickEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antimute':
                title = 'Anti-Mute';
                description = 'Limit unauthorized timeouts.';
                statusKey = 'antiMuteEnabled';
                actionKey = 'antiMuteAction';
                limitKey = 'antiMuteLimit';
                isEnabled = settings.antiMuteEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antimove':
                title = 'Anti-Move';
                description = 'Limit unauthorized voice channel moves.';
                statusKey = 'antiMoveEnabled';
                actionKey = 'antiMoveAction';
                limitKey = 'antiMoveLimit';
                isEnabled = settings.antiMoveEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antichannelcreate':
                title = 'Anti-Channel Create';
                description = 'Limit channel creation.';
                statusKey = 'antiChannelCreateEnabled';
                actionKey = 'antiChannelCreateAction';
                limitKey = 'antiChannelCreateLimit';
                isEnabled = settings.antiChannelCreateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antichanneldelete':
                title = 'Anti-Channel Delete';
                description = 'Limit channel deletion.';
                statusKey = 'antiChannelDeleteEnabled';
                actionKey = 'antiChannelDeleteAction';
                limitKey = 'antiChannelDeleteLimit';
                isEnabled = settings.antiChannelDeleteEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antichannelupdate':
                title = 'Anti-Channel Update';
                description = 'Prevent channel edits.';
                statusKey = 'antiChannelUpdateEnabled';
                actionKey = 'antiChannelUpdateAction';
                limitKey = 'antiChannelUpdateLimit';
                isEnabled = settings.antiChannelUpdateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antirolecreate':
                title = 'Anti-Role Create';
                description = 'Limit role creation.';
                statusKey = 'antiRoleCreateEnabled';
                actionKey = 'antiRoleCreateAction';
                limitKey = 'antiRoleCreateLimit';
                isEnabled = settings.antiRoleCreateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antiroledelete':
                title = 'Anti-Role Delete';
                description = 'Limit role deletion.';
                statusKey = 'antiRoleDeleteEnabled';
                actionKey = 'antiRoleDeleteAction';
                limitKey = 'antiRoleDeleteLimit';
                isEnabled = settings.antiRoleDeleteEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antiroleupdate':
                title = 'Anti-Role Update';
                description = 'Prevent role property edits (Name, Color, Position, etc).';
                statusKey = 'antiRoleUpdateEnabled';
                actionKey = 'antiRoleUpdateAction';
                limitKey = 'antiRoleUpdateLimit';
                isEnabled = settings.antiRoleUpdateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antirolepermsupdate':
                title = 'Anti-Role Permissions Update';
                description = 'Prevent unauthorized modification of role permissions.';
                statusKey = 'antiRolePermsUpdateEnabled';
                actionKey = 'antiRolePermsUpdateAction';
                limitKey = 'antiRolePermsUpdateLimit';
                isEnabled = settings.antiRolePermsUpdateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
            case 'antiguildupdate':
                title = 'Anti-Server Update';
                description = 'Prevent server property edits.';
                statusKey = 'antiGuildUpdateEnabled';
                actionKey = 'antiGuildUpdateAction';
                limitKey = 'antiGuildUpdateLimit';
                isEnabled = settings.antiGuildUpdateEnabled === true;
                showWhitelist = true;
                showLimit = true;
                break;
        }

        const currentAction = settings[actionKey] || 'none';
        const currentLimit = settings[limitKey] || (moduleName === 'antimute' || moduleName === 'antimove' ? 5 : 3);

        // Setup checks
        const isWarnSetup = !!(settings.firstWarnRoleId && settings.secondWarnRoleId && settings.lastWarnRoleId);
        const isJailSetup = !!settings.jailRoleId;

        const isDeleteOnlyModule = moduleName === 'antilink';

        const actionSelect = new StringSelectMenuBuilder()
            .setCustomId(`sec_action_${moduleName}`)
            .setPlaceholder('Choose violation punishment...')
            .addOptions([
                {
                    label: isDeleteOnlyModule ? 'None (Delete Only)' : 'None',
                    value: 'none',
                    emoji,
                    description: isDeleteOnlyModule ? 'Only delete the violating content.' : 'Take no punishment action.',
                    default: currentAction === 'none'
                },
                {
                    label: 'Warn',
                    value: 'warn',
                    emoji,
                    description: isWarnSetup ? 'Follow First -> Second -> Last setup.' : 'Warning: Setup Warn system first!',
                    default: currentAction === 'warn'
                },
                {
                    label: 'Jail',
                    value: 'jail',
                    emoji,
                    description: isJailSetup ? 'Send the user to jail.' : 'Warning: Setup Jail system first!',
                    default: currentAction === 'jail'
                },
                {
                    label: 'Kick',
                    value: 'kick',
                    emoji,
                    description: 'Kick the user from the server.',
                    default: currentAction === 'kick'
                },
                {
                    label: 'Ban',
                    value: 'ban',
                    emoji,
                    description: 'Permanently ban the user.',
                    default: currentAction === 'ban'
                },
                {
                    label: 'Clear Roles',
                    value: 'clearroles',
                    emoji,
                    description: 'Remove all roles from the user.',
                    default: currentAction === 'clearroles'
                }
            ]);

        const builder = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${emoji} __${title} Configuration__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${star} **Status:** ${isEnabled ? '`ENABLED`' : '`DISABLED`'}\n` +
                            `> ${star} **Action:** \`${currentAction.toUpperCase()}\`\n` +
                            (showLimit ? `> ${star} **Limit:** \`${currentLimit} violations\`\n` : '') +
                            `> ${star} ${description}`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji} __Punishment Action__`))
            .addActionRowComponents(new ActionRowBuilder().addComponents(actionSelect));

        if (showWhitelist) {
            const currentRoles = settings.whitelistedRoles || [];
            const currentUsers = settings.whitelistedUsers || [];

            builder.addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji} __Whitelist Settings__`))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new RoleSelectMenuBuilder()
                            .setCustomId(`sec_wl_roles_${moduleName}`)
                            .setPlaceholder('Add roles to bypass...')
                            .setMaxValues(10)
                            .setDefaultRoles(currentRoles)
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(`sec_wl_users_${moduleName}`)
                            .setPlaceholder('Add users to bypass...')
                            .setMaxValues(10)
                            .setDefaultUsers(currentUsers)
                    )
                );
        }

        builder.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sec_toggle_${moduleName}`)
                    .setLabel(isEnabled ? 'Disable Module' : 'Enable Module')
                    .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
                ...(showLimit ? [
                    new ButtonBuilder()
                        .setCustomId(`sec_limit_${moduleName}`)
                        .setLabel('Set Limit')
                        .setStyle(ButtonStyle.Primary)
                ] : []),
                new ButtonBuilder()
                    .setCustomId('sec_back')
                    .setLabel('Back to Hub')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        return builder;
    },

    _setupCollector(sent, message, theme, client) {
        const guildId = message.guild.id;
        const collector = sent.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 900000
        });

        collector.on('collect', async (interaction) => {
            try {
                const { customId } = interaction;
                const settings = await client.getSettings(guildId);

                if (customId === 'sec_module_select') {
                    const selected = interaction.values[0];
                    return interaction.update({ components: [this._buildModuleConfig(settings, theme, client, selected)] });
                }

                if (customId === 'sec_back') {
                    return interaction.update({ components: [this._buildMainPanel(settings, theme, client)] });
                }

                if (customId.startsWith('sec_toggle_')) {
                    const moduleName = customId.replace('sec_toggle_', '');
                    const { key, isBool } = this._getModuleKeys(moduleName);

                    if (!key) {
                        return interaction.reply({ content: ' Unknown module.', ephemeral: true });
                    }

                    const currentVal = settings[key];
                    const newVal = isBool ? !currentVal : (currentVal === 1 ? 0 : 1);

                    await client.saveSettings(guildId, key, newVal);
                    const updated = await client.getSettings(guildId);
                    return interaction.update({ components: [this._buildModuleConfig(updated, theme, client, moduleName)] });
                }

                if (customId.startsWith('sec_limit_')) {
                    const moduleName = customId.replace('sec_limit_', '');
                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
                    
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_sec_limit_${moduleName}_${sent.id}`)
                        .setTitle(`Set Limit`);

                    const limitInput = new TextInputBuilder()
                        .setCustomId('module_limit')
                        .setLabel(`${moduleName.toUpperCase()} — Violation Limit`)
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Enter a number (e.g., 3)...')
                        .setRequired(true)
                        .setMaxLength(2);

                    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                    return interaction.showModal(modal);
                }

                if (customId.startsWith('sec_action_')) {
                    const moduleName = customId.replace('sec_action_', '');
                    const selectedAction = interaction.values[0];
                    const themeColor = client.themeManager.getRGBColor(theme.color);

                    if (selectedAction === 'none' || selectedAction === 'clearroles') {
                        const { actionKey } = this._getModuleKeys(moduleName);
                        if (!actionKey) return interaction.reply({ content: ' Unknown module action.', ephemeral: true });

                        await client.saveSettings(guildId, actionKey, selectedAction);
                        const updated = await client.getSettings(guildId);
                        return interaction.update({ components: [this._buildModuleConfig(updated, theme, client, moduleName)] });
                    }

                    // Setup verification
                    if (selectedAction === 'jail') {
                        const isJailSetup = !!settings.jailRoleId;
                        if (!isJailSetup) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis.title || ''} __System Not Configured__\n` +
                                        `> ${theme.emojis.star || ''} __The Jail system is not configured (missing Jail Role).__\n` +
                                        `> ${theme.emojis.star || ''} __Use \`${client.config.prefix}setjail\` to configure it.__`
                                    )
                                );
                            return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
                        }
                    }

                    if (selectedAction === 'warn') {
                        const isWarnSetup = !!(settings.firstWarnRoleId && settings.secondWarnRoleId && settings.lastWarnRoleId);
                        if (!isWarnSetup) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(themeColor)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${theme.emojis.title || ''} __System Not Configured__\n` +
                                        `> ${theme.emojis.star || ''} __The Warn system is not configured (missing Warn Roles).__\n` +
                                        `> ${theme.emojis.star || ''} __Use \`${client.config.prefix}setwarn\` to configure it.__`
                                    )
                                );
                            return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
                        }
                    }

                    // Show Modal for Reason
                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_sec_reason_${moduleName}_${selectedAction}`)
                        .setTitle(`Configure ${selectedAction.toUpperCase()} Reason`);

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('punishment_reason')
                        .setLabel(`Reason for ${selectedAction.toUpperCase()}`)
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(`Enter the reason to be sent when a user is ${selectedAction}ed...`)
                        .setRequired(true)
                        .setMaxLength(500);

                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    return interaction.showModal(modal);
                }

                if (customId.startsWith('sec_wl_')) {
                    const parts = customId.split('_');
                    const type = parts[2]; // roles / users
                    const module = parts[3];
                    const key = type === 'roles' ? 'whitelistedRoles' : 'whitelistedUsers';

                    // Native SelectMenus submit the EXACT currently selected items.
                    // Because we use .setDefaultRoles / .setDefaultUsers, they show what's already saved.
                    // If a user deselects something, interaction.values won't have it.
                    // So we must direct overwrite.

                    const newSelections = interaction.values || [];
                    await client.saveSettings(guildId, key, newSelections);
                    
                    const updated = await client.getSettings(guildId);
                    return interaction.update({ components: [this._buildModuleConfig(updated, theme, client, module)] });
                }

            } catch (error) {
                console.error('[Security Hub Interaction Error]:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: ' Error processing your request.', ephemeral: true });
                }
            }
        });
    },

    _getModuleKeys(moduleName) {
        const map = {
            antilink:            { key: 'antiLink',                  isBool: false, actionKey: 'antiLinkAction',            reasonKey: 'antiLinkReason',            limitKey: 'antiLinkLimit' },
            antibot:             { key: 'antiBot',                   isBool: false, actionKey: 'antiBotAction',             reasonKey: 'antiBotReason',             limitKey: 'antiBotLimit' },
            antiwebhook:         { key: 'antiWebhook',               isBool: false, actionKey: 'antiWebhookAction',         reasonKey: 'antiWebhookReason',         limitKey: 'antiWebhookLimit' },
            antitokens:          { key: 'antiTokenEnabled',           isBool: true,  actionKey: 'antiTokenAction',           reasonKey: 'antiTokenReason',           limitKey: 'antiTokenLimit' },
            antiraid:            { key: 'antiRaidEnabled',            isBool: true,  actionKey: 'antiRaidAction',            reasonKey: 'antiRaidReason',            limitKey: 'antiRaidLimit' },
            antiban:             { key: 'antiBanEnabled',             isBool: true,  actionKey: 'antiBanAction',             reasonKey: 'antiBanReason',             limitKey: 'antiBanLimit' },
            antikick:            { key: 'antiKickEnabled',            isBool: true,  actionKey: 'antiKickAction',            reasonKey: 'antiKickReason',            limitKey: 'antiKickLimit' },
            antimute:            { key: 'antiMuteEnabled',            isBool: true,  actionKey: 'antiMuteAction',            reasonKey: 'antiMuteReason',            limitKey: 'antiMuteLimit' },
            antimove:            { key: 'antiMoveEnabled',            isBool: true,  actionKey: 'antiMoveAction',            reasonKey: 'antiMoveReason',            limitKey: 'antiMoveLimit' },
            antichannelcreate:   { key: 'antiChannelCreateEnabled',   isBool: true,  actionKey: 'antiChannelCreateAction',   reasonKey: 'antiChannelCreateReason',   limitKey: 'antiChannelCreateLimit' },
            antichanneldelete:   { key: 'antiChannelDeleteEnabled',   isBool: true,  actionKey: 'antiChannelDeleteAction',   reasonKey: 'antiChannelDeleteReason',   limitKey: 'antiChannelDeleteLimit' },
            antichannelupdate:   { key: 'antiChannelUpdateEnabled',   isBool: true,  actionKey: 'antiChannelUpdateAction',   reasonKey: 'antiChannelUpdateReason',   limitKey: 'antiChannelUpdateLimit' },
            antirolecreate:      { key: 'antiRoleCreateEnabled',      isBool: true,  actionKey: 'antiRoleCreateAction',      reasonKey: 'antiRoleCreateReason',      limitKey: 'antiRoleCreateLimit' },
            antiroledelete:      { key: 'antiRoleDeleteEnabled',      isBool: true,  actionKey: 'antiRoleDeleteAction',      reasonKey: 'antiRoleDeleteReason',      limitKey: 'antiRoleDeleteLimit' },
            antiroleupdate:      { key: 'antiRoleUpdateEnabled',      isBool: true,  actionKey: 'antiRoleUpdateAction',      reasonKey: 'antiRoleUpdateReason',      limitKey: 'antiRoleUpdateLimit' },
            antirolepermsupdate: { key: 'antiRolePermsUpdateEnabled', isBool: true,  actionKey: 'antiRolePermsUpdateAction', reasonKey: 'antiRolePermsUpdateReason', limitKey: 'antiRolePermsUpdateLimit' },
            antiguildupdate:     { key: 'antiGuildUpdateEnabled',     isBool: true,  actionKey: 'antiGuildUpdateAction',     reasonKey: 'antiGuildUpdateReason',     limitKey: 'antiGuildUpdateLimit' },
        };
        return map[moduleName] || { key: '', isBool: false, actionKey: '', reasonKey: '', limitKey: '' };
    }
};
