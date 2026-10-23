import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    AuditLogEvent,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} from 'discord.js';
import config from '../../../config/config.js';

export default {
    name: "antiwebhook",
    aliases: ["antiwebhooks", "webhookblock"],
    description: "Enable or disable anti-webhook protection",
    category: "Security",
    usage: "+antiwebhook <on/off/status/wl/unwl> [role]",
    permissions: ["ManageGuild"],
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        // Helper for simple responses
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

        if (!option || !["on", "off", "whitelist", "wl", "unwhitelist", "unwl", "status", "enable", "disable"].includes(option)) {
            const isEnabled = settings.antiWebhook === 1;
            const status = isEnabled ? 'Enabled' : 'Disabled';
            const whitelistedRoles = settings.webhookWhitelist || [];

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Anti-Webhook Protection__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title} **__Current Status__**\n` +
                                `> ${theme.emojis.star} **State:** \`${status}\`\n` +
                                `> ${theme.emojis.star} **Whitelist:** ${whitelistedRoles.length > 0 ? whitelistedRoles.map(r => `<@&${r}>`).join(", ") : "None"}`
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
                        `> ${theme.emojis.star} \`antiwebhook on\` - Enable protection\n` +
                        `> ${theme.emojis.star} \`antiwebhook off\` - Disable protection\n` +
                        `> ${theme.emojis.star} \`antiwebhook wl @role\` - Whitelist a role\n` +
                        `> ${theme.emojis.star} \`antiwebhook unwl @role\` - Remove role from whitelist`
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

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const whitelistedRoles = settings.webhookWhitelist || [];

        if (option === "status") {
            return message.reply({
                components: [createResponse('info', 'Anti-Webhook Status',
                    `**State:** ${settings.antiWebhook === 1 ? "Enabled" : "Disabled"}\n` +
                    `**Whitelist:** ${whitelistedRoles.length > 0 ? whitelistedRoles.map(r => `<@&${r}>`).join(", ") : "None"}`
                )],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (["on", "off", "enable", "disable"].includes(option)) {
            const toggle = (option === "on" || option === "enable") ? 1 : 0;
            await client.saveSettings(guildId, "antiWebhook", toggle);

            return message.reply({
                components: [createResponse('success', 'Success', `Anti-Webhook Protection is now **${toggle ? "Enabled" : "Disabled"}**`)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (["wl", "whitelist", "unwl", "unwhitelist"].includes(option)) {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
            if (!role) {
                return message.reply({
                    components: [createResponse('error', 'Invalid Role', 'Please mention a role or provide a valid role ID.')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (["wl", "whitelist"].includes(option)) {
                if (whitelistedRoles.includes(role.id)) {
                    return message.reply({
                        components: [createResponse('info', 'Warning', `Role <@&${role.id}> is already whitelisted.`)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                whitelistedRoles.push(role.id);
                await client.saveSettings(guildId, "webhookWhitelist", whitelistedRoles);

                return message.reply({
                    components: [createResponse('success', 'Success', `Role <@&${role.id}> has been added to the whitelist.`)],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (["unwl", "unwhitelist"].includes(option)) {
                if (!whitelistedRoles.includes(role.id)) {
                    return message.reply({
                        components: [createResponse('info', 'Warning', `Role <@&${role.id}> is not in the whitelist.`)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                const index = whitelistedRoles.indexOf(role.id);
                whitelistedRoles.splice(index, 1);
                await client.saveSettings(guildId, "webhookWhitelist", whitelistedRoles);

                return message.reply({
                    components: [createResponse('success', 'Success', `Role <@&${role.id}> has been removed from the whitelist.`)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    },

    async onWebhookUpdate(guild, client) {
        const settings = await client.getSettings(guild.id);
        if (!settings || settings.antiWebhook !== 1) return;


        const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.WebhookCreate });
        const webhookLog = fetchedLogs.entries.first();
        if (!webhookLog) return;

        const { executor } = webhookLog;
        if (!executor || executor.bot) return;

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (!member) return;

        // Universal Bypass Check
        const botMember = guild.members.me;
        if (member.roles.highest.position >= botMember.roles.highest.position) return;
        if (member.permissions.has(PermissionsBitField.Flags.Administrator) || guild.ownerId === member.id) return;

        const whitelistedRoles = settings.whitelistedRoles || [];
        const whitelistedUsers = settings.whitelistedUsers || [];
        if (whitelistedUsers.includes(member.id)) return;
        if (member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return;

        // Delete the webhook
        const webhooks = await guild.fetchWebhooks();
        const targetWebhook = webhooks.find(w => w.owner?.id === executor.id);
        if (targetWebhook) await targetWebhook.delete("Anti-Webhook Protection").catch(() => null);

        // Punish the executor
        const action = settings.antiWebhookAction || 'none';
        if (action !== 'none') {
            const securityHandler = (await import('../../../utils/securityHandler.js')).default;
            await securityHandler.punish(
                client,
                member,
                action,
                "Anti-Webhook Protection: Unauthorized webhook creation",
                settings
            );
        }
    }
};
