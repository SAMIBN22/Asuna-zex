import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    PermissionsBitField
} from 'discord.js';

export default {
    name: "antirolecreate",
    aliases: ["arc", "antirolec"],
    description: "Setup anti-role create protection system to limit unauthorized role creation",
    category: "Security",
    usage: "+antirolecreate <enable/disable/limit/action> [value]",
    permissions: ["ManageGuild"],
    guildOnly: true,
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const createResponse = (type, header, content) => new ContainerBuilder()
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

        const option = args[0]?.toLowerCase();
        const settings = await client.getSettings(guildId);

        if (!option || !["on", "off", "enable", "disable", "limit", "action"].includes(option)) {
            const isEnabled = settings.antiRoleCreateEnabled === true;
            const status = isEnabled ? 'Enabled' : 'Disabled';
            const action = settings.antiRoleCreateAction || 'ban';
            const limit = settings.antiRoleCreateLimit || 3;

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Role Create Protection__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title} **__Current Status__**\n` +
                                `> ${theme.emojis.star} **State:** \`${status}\`\n` +
                                `> ${theme.emojis.star} **Action:** \`${action.toUpperCase()}\`\n` +
                                `> ${theme.emojis.star} **Limit:** \`${limit} roles/minute\``
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
                        `> ${theme.emojis.star} \`antirolecreate enable\` - Enable protection\n` +
                        `> ${theme.emojis.star} \`antirolecreate disable\` - Disable protection\n` +
                        `> ${theme.emojis.star} \`antirolecreate limit <number>\` - Set creation limit\n` +
                        `> ${theme.emojis.star} \`antirolecreate action <type>\` - Set violation action`
                    )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (["on", "enable"].includes(option)) {
            await client.saveSettings(guildId, "antiRoleCreateEnabled", true);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Role Create Protection is now **Enabled**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (["off", "disable"].includes(option)) {
            await client.saveSettings(guildId, "antiRoleCreateEnabled", false);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Role Create Protection is now **Disabled**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (option === "limit") {
            const limit = parseInt(args[1]);
            if (isNaN(limit) || limit < 1) {
                return message.reply({
                    components: [createResponse('error', 'Invalid Limit', 'Please provide a valid number greater than 0.')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            await client.saveSettings(guildId, "antiRoleCreateLimit", limit);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Role Create limit has been set to **${limit} roles/minute**.`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (option === "action") {
            const newAction = args[1]?.toLowerCase();
            if (!['warn', 'jail', 'kick', 'ban'].includes(newAction)) {
                return message.reply({
                    components: [createResponse('error', 'Invalid Action', 'Please choose from: `warn, jail, kick, ban`')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            await client.saveSettings(guildId, "antiRoleCreateAction", newAction);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Role Create violation action is now **${newAction.toUpperCase()}**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
