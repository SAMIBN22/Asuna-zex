import {
    Events,
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';

import config from '../../config/config.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { applyNameplate } from '../../lib/nameplate.js';

export default {
    name: Events.GuildCreate,
    async execute(guild, client) {
        try {
            const theme = await client.themeManager.getTheme(guild.id);
            const totalGuilds = client.guilds.cache.size;

            await this.sendWelcomeDM(guild, client, theme);
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logGuildEvent('Joined', guild);

            setTimeout(() => {
                applyNameplate(client, guild.id).catch(() => {});
            }, 1500);

        } catch (err) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Guild Create Error', err, guild.id);
        }
    },

    async sendWelcomeDM(guild, client, theme) {
        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;
            const botName = client.user?.globalName || client.user?.username || 'Discord Bot';

            const gallery = new MediaGalleryBuilder()
                .addItems(item => item
                    .setDescription(`${botName} - Professional Discord Bot`)
                    .setURL(theme.images?.main || client.user.displayAvatarURL())
                );

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __Welcome to ${botName}!__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${theme.emojis.title} __About ${botName}__\n` +
                                `> ${theme.emojis.title} **${botName}** is a professional Discord bot designed to help you manage your server with advanced moderation tools, member management, and server organization features.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title} __Key Features__\n` +
                        `> ${theme.emojis.star} **__Moderation Tools__** **Advanced moderation and security features**\n` +
                        `> ${theme.emojis.star} **__Member Management__** **Comprehensive member control tools**\n` +
                        `> ${theme.emojis.star} **__Role Management__** **Customize roles and permissions**\n` +
                        `> ${theme.emojis.star} **__Server Setup__** **Easy server configuration**\n` +
                        `> ${theme.emojis.star} **__Jail System__** **advanced member restriction system**\n` +
                        `> ${theme.emojis.star} **__Voice Controls__** **Voice channel management tools**`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title} __Quick Start__\n` +
                        `> ${theme.emojis.star} **Prefix:** \`${config.prefix}\`\n` +
                        `> ${theme.emojis.star} **Ping:** \`${config.prefix}ping\`\n` +
                        `> ${theme.emojis.star} **Help:** \`${config.prefix}help\`\n` +
                        `> ${theme.emojis.star} **Setup:** \`${config.prefix}setup\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                        `> ${theme.emojis.title} *Thank you for choosing ${botName}! Start with \`${config.prefix}setup\` to configure your server*`
                            )
                        )
                        .setButtonAccessory(
                            new ButtonBuilder()
                                .setLabel("Support Server")
                                .setStyle(ButtonStyle.Link)
                                .setURL("https://discord.gg/vihub")
                        )
                );

            await owner.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                allowedMentions: { parse: [] }
            });
        } catch (dmError) {
            // 50278 = cannot DM (no mutual guilds) - expected when owner has no mutual guild with bot.
            // 50007 = cannot send messages to this user (DMs closed).
            // Silently skip these; log anything unexpected via the webhook.
            const SILENT_CODES = new Set([50007, 50278]);
            if (SILENT_CODES.has(dmError.code)) return;
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Guild Create DM Error', dmError, guild.id);
        }
    }
};