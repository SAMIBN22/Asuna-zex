import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionsBitField,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import config from '../../../config/config.js';

const createResponse = (theme, client, type, header, content) => new ContainerBuilder()
    .setAccentColor(theme.color)
    .addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${theme.emojis[type === 'info' ? 'title' : type === 'success' ? 'yes' : 'slap']} __${header}__\n` +
                `> ${theme.emojis.star} ${content}`
            ))
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
            )
    );

export default {
    name: "antitokens",
    aliases: ["antitoken", "tokenprotection", "blocktokens", "tokenfilter"],
    description: "Setup anti-token protection system to prevent token leaks",
    category: "Security",
    usage: "+antitokens <enable/disable>",
    examples: [
        "+antitokens enable",
        "+antitokens disable",
        "+antitokens status"
    ],
    permissions: ["ManageGuild"],
    guildOnly: true,
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const settings = await GuildConfig.findOne({ guildId: message.guild.id }) || new GuildConfig({ guildId: message.guild.id });

        // Permission Check
        if (message.author.id !== message.guild.ownerId && !client.config.devIds.includes(message.author.id)) {
            return message.reply({
                components: [new ContainerBuilder()
                    .setAccentColor(theme.color)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `# ${theme.emojis.slap || ''} __Permission Denied__\n` +
                                `> ${theme.emojis.star || ''} You do not have enough permissions to use this command.`
                            ))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                            )
                    )],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Bot Permission Check
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({
                components: [createResponse(theme, client, 'error', 'Bot Permission', 'I need Manage Messages permission to delete token messages.')],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            const status = settings.antiTokenEnabled ? 'Enabled' : 'Disabled';
            const action = settings.antiTokenAction || 'delete';
            const logChannel = settings.antiTokenLogsChannel ? `<#${settings.antiTokenLogsChannel}>` : 'Not set';

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Token Protection__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title} **__Current Status__**\n` +
                                `> ${theme.emojis.star} **State:** \`${status}\`\n` +
                                `> ${theme.emojis.star} **Action:** \`${action}\`\n` +
                                `> ${theme.emojis.star} **Logs:** ${logChannel}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title} **__Configuration Usage__**\n` +
                        `> ${theme.emojis.star} \`antitokens enable\` - Enable protection\n` +
                        `> ${theme.emojis.star} \`antitokens disable\` - Disable protection\n` +
                        `> ${theme.emojis.star} \`antitokens action\` \`kick\` \`ban\` \`jail\` - Set violation action\n` +
                        `> ${theme.emojis.star} \`antitokens logs\` \`#channel\` - Set log channel`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`> ${theme.emojis.title} *__Need more assistance? Join our support community below__*`)
                        )
                        .setButtonAccessory(
                            new ButtonBuilder()
                                .setLabel("Support")
                                .setStyle(ButtonStyle.Link)
                                .setURL(config.supportServer)
                        )
                );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'enable') {
            settings.antiTokenEnabled = true;
            await settings.save();
            return message.reply({
                components: [createResponse(theme, client, 'success', 'Success', 'Anti-token protection has been enabled.')],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'disable') {
            settings.antiTokenEnabled = false;
            await settings.save();
            return message.reply({
                components: [createResponse(theme, client, 'success', 'Success', 'Anti-token protection has been disabled.')],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'action') {
            const action = args[1]?.toLowerCase();
            if (!action || !['delete', 'warn', 'kick', 'ban', 'jail'].includes(action)) {
                return message.reply({
                    components: [createResponse(theme, client, 'error', 'Invalid Action', 'Action must be one of: `delete`, `warn`, `kick`, `ban`, `jail`.')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            settings.antiTokenAction = action;
            await settings.save();
            return message.reply({
                components: [createResponse(theme, client, 'success', 'Success', `Anti-token action set to \`${action}\`.`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'logs') {
            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

            if (!channel || !channel.isTextBased()) {
                return message.reply({
                    components: [createResponse(theme, client, 'error', 'Invalid Channel', 'Please provide a valid text channel for logs.')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            settings.antiTokenLogsChannel = channel.id;
            await settings.save();
            return message.reply({
                components: [createResponse(theme, client, 'success', 'Success', `Anti-token logs set to ${channel}.`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Fallback for unknown subcommand
        return message.reply({
            components: [createResponse(theme, client, 'error', 'Unknown Command', 'Use `antitokens` to see available options.')],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
