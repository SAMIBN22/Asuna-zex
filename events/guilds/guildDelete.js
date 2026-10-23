import { Events, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags, MediaGalleryBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import colors from '../../utils/colors.js';
import config from '../../config/config.js';

export default {
    name: Events.GuildDelete,
    async execute(guild, client) {
        try {
            const theme = await client.themeManager.getTheme(guild.id);
            const totalGuilds = client.guilds.cache.size;

            await this.sendLeaveNotification(guild, client, theme, totalGuilds);

            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logGuildEvent('Left', guild);

        } catch (err) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Guild Delete Error', err, guild.id);
        }
    },

    async sendLeaveNotification(guild, client, theme, totalGuilds) {
        try {
            let owner = null;
            try {
                owner = await guild.fetchOwner();
                if (owner) {
                    await this.sendLeaveDM(owner, guild, client, theme);
                }
            } catch (ownerError) {
                console.log(colors.yellow(`[DM] Could not fetch owner for guild ${guild.id}: ${ownerError.message}`));
            }

            if (!client.webhookLogger) {
                const WebhookLogger = (await import('../../functions/webhookLogger.js')).default;
                client.webhookLogger = new WebhookLogger(client);
            }

            const embed = new EmbedBuilder()
                .setColor(theme.color)
                .setTitle(`Guild Left`)
                .setDescription(`**Guild:** \`${guild.name}\` (\`${guild.id}\`)\n**Members:** \`${guild.memberCount || 'Unknown'}\`\n**Owner:** <@${guild.ownerId || 'Unknown'}>`)
                .setThumbnail(theme.images?.thumbnail || null)
                .setImage(theme.images?.main || null)
                .addFields(
                    { name: `Guild ID`, value: guild.id, inline: false },
                    { name: `Member Count`, value: (guild.memberCount || 'Unknown').toString(), inline: false },
                    { name: `Channels`, value: (guild.channels?.cache?.size || 'Unknown').toString(), inline: false },
                    { name: `Roles`, value: (guild.roles?.cache?.size || 'Unknown').toString(), inline: false },
                    { name: `Emojis`, value: (guild.emojis?.cache?.size || 'Unknown').toString(), inline: false },
                    { name: `Boost Level`, value: (guild.premiumTier || 'Unknown').toString(), inline: false },
                    { name: `Boosts`, value: (guild.premiumSubscriptionCount || 0).toString(), inline: false },
                    { name: `Left At`, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: `Remaining Guilds`, value: totalGuilds.toString(), inline: false }
                )
                .setTimestamp();

            if (client.webhookLogger.webhook) {
                await client.webhookLogger.webhook.send({ embeds: [embed] });
            }

        } catch (webhookError) {
            console.log(colors.red(`[WEBHOOK] Guild leave notification failed: ${webhookError.message}`));
        }
    },

    async sendLeaveDM(owner, guild, client, theme) {
        try {
            const botName = client.user?.globalName || client.user?.username || 'Discord Bot';
            const gallery = new MediaGalleryBuilder()
                .addItems(item => item
                    .setDescription(`${botName} - Goodbye`)
                    .setURL(theme.images?.main || client.user.displayAvatarURL())
                );

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${theme.emojis.title} __${botName} Left Your Server__`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${theme.emojis.title} __Server Information__\n` +
                                `> ${theme.emojis.star} **Server:** \`${guild.name}\`\n` +
                                `> ${theme.emojis.star} **Members:** \`${guild.memberCount}\`\n` +
                                `> ${theme.emojis.star} **Channels:** \`${guild.channels.cache.size}\`\n` +
                                `> ${theme.emojis.star} **Roles:** \`${guild.roles.cache.size}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title} __Why Did ${botName} Leave?__\n` +
                        `> ${theme.emojis.star} **Bot Removed** - Someone removed ${botName} from your server\n` +
                        `> ${theme.emojis.star} **Server Deleted** - The server may have been deleted\n` +
                        `> ${theme.emojis.star} **Permission Issues** - Insufficient permissions to stay\n` +
                        `> ${theme.emojis.star} **Manual Removal** - Bot was manually kicked or banned`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title} __Want ${botName} Back?__\n` +
                        `> ${theme.emojis.star} **Re-invite ${botName}** - Use the button below to invite it back\n` +
                        `> ${theme.emojis.star} **Check Permissions** - Make sure ${botName} has proper permissions\n` +
                        `> ${theme.emojis.star} **Need Help?** - Join our support server for assistance`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> ${theme.emojis.title} *Thank you for using ${botName}! We hope to serve you again soon.*`
                            )
                        )
                        .setButtonAccessory(
                            new ButtonBuilder()
                                .setLabel(`Re-invite ${botName}`)
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`)
                        )
                );

            await owner.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                allowedMentions: { parse: [] }
            });
        } catch (dmError) {
            console.log(colors.red(`[DM] Failed to send leave DM to ${guild.ownerId}: ${dmError.message}`));
        }
    }
};