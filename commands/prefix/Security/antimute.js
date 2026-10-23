import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ActionRowBuilder
} from 'discord.js';

export default {
    name: "antimute",
    aliases: ["antimutes", "muteprotection", "limitmutes", "antitimeout"],
    description: "Setup anti-mute protection system to limit unauthorized timeouts",
    category: "Security",
    usage: "+antimute <enable/disable/limit> [number]",
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
            const isEnabled = settings.antiMuteEnabled === true;
            const status = isEnabled ? 'Enabled' : 'Disabled';
            const action = settings.antiMuteAction || 'kick';
            const limit = settings.antiMuteLimit || 5;

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Mute Protection__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title} **__Current Status__**\n` +
                                `> ${theme.emojis.star} **State:** \`${status}\`\n` +
                                `> ${theme.emojis.star} **Action:** \`${action.toUpperCase()}\`\n` +
                                `> ${theme.emojis.star} **Limit:** \`${limit} mutes/hour\``
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
                        `> ${theme.emojis.star} \`antimute enable\` - Enable protection\n` +
                        `> ${theme.emojis.star} \`antimute disable\` - Disable protection\n` +
                        `> ${theme.emojis.star} \`antimute limit <number>\` - Set mute limit\n` +
                        `> ${theme.emojis.star} \`antimute action <type>\` - Set violation action`
                    )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (["on", "enable"].includes(option)) {
            await client.saveSettings(guildId, "antiMuteEnabled", true);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Mute Protection is now **Enabled**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (["off", "disable"].includes(option)) {
            await client.saveSettings(guildId, "antiMuteEnabled", false);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Mute Protection is now **Disabled**`)],
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

            await client.saveSettings(guildId, "antiMuteLimit", limit);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Mute limit has been set to **${limit} mutes/hour**.`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (option === "action") {
            const newAction = args[1]?.toLowerCase();
            if (!['none', 'warn', 'jail', 'kick', 'ban', 'clearroles'].includes(newAction)) {
                return message.reply({
                    components: [createResponse('error', 'Invalid Action', 'Please choose from: `none, warn, jail, kick, ban, clearroles`')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            await client.saveSettings(guildId, "antiMuteAction", newAction);
            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Mute violation action is now **${newAction.toUpperCase()}**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
