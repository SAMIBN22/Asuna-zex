import { EmbedBuilder, WebhookClient } from 'discord.js';
import config from '../config/config.js';
import colors from '../utils/colors.js';

class WebhookLogger {
    constructor(client) {
        this.client = client;
        this.webhook = null;
        this.initializeWebhook();
    }

    initializeWebhook() {
        if (!config.webhookUrl) {
            console.warn(colors.yellow('[WEBHOOK] No webhook URL configured'));
            return;
        }

        try {
            const webhookId = config.webhookUrl.split('/').slice(-2)[0];
            const webhookToken = config.webhookUrl.split('/').slice(-1)[0];

            if (!webhookId || !webhookToken) {
                console.warn(colors.yellow('[WEBHOOK] Invalid webhook URL format'));
                return;
            }

            this.webhook = new WebhookClient({ id: webhookId, token: webhookToken });
        } catch (error) {
            console.error(colors.red('[WEBHOOK] Failed to initialize webhook:'), error.message);
        }
    }

    async logError(type, error, guildId, additionalInfo = {}) {
        console.error(colors.red(`[${type}] ${error.message}`));
        if (error.stack) console.error(colors.red(error.stack));
        if (Object.keys(additionalInfo).length > 0) {
            console.error(colors.red(`[${type}] context: ${JSON.stringify(additionalInfo)}`));
        }

        if (!this.webhook) {
            return;
        }

        try {
            const theme = await this.client.themeManager.getTheme(guildId);
            const embed = new EmbedBuilder()
                .setColor(theme.color)
                .setTitle(`Bot Error Log`)
                .setThumbnail(theme.images?.thumbnail || this.client.user?.displayAvatarURL() || null)
                .setImage(theme.images?.main || null)
                .addFields(
                    { name: `Error Type`, value: type, inline: false },
                    { name: `Guild ID`, value: guildId || 'N/A', inline: false },
                    { name: `Time`, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: `Error Message`, value: `\`\`\`${error.message}\`\`\``, inline: false }
                )
                .setTimestamp();

            if (error.stack) {
                embed.addFields(
                    { name: `Stack Trace`, value: `\`\`\`${error.stack.slice(0, 1000)}\`\`\``, inline: false }
                );
            }

            if (Object.keys(additionalInfo).length > 0) {
                embed.addFields(
                    { name: `Additional Info`, value: `\`\`\`json\n${JSON.stringify(additionalInfo, null, 2)}\`\`\``, inline: false }
                );
            }

            await this.webhook.send({ embeds: [embed] });
        } catch (webhookError) {
            console.log(colors.red(`[WEBHOOK] Failed to send error log: ${webhookError.message}`));
        }
    }

    async logInfo(title, description, guildId, additionalInfo = {}) {
        if (!this.webhook) {
            console.log(colors.cyan(`[INFO] ${title}: ${description}`));
            return;
        }

        try {
            const theme = await this.client.themeManager.getTheme(guildId);
            const embed = new EmbedBuilder()
                .setColor(theme.color)
                .setTitle(`🌟 ${title}`)
                .setDescription(description)
                .setThumbnail(theme.images?.thumbnail || this.client.user?.displayAvatarURL() || null)
                .setImage(theme.images?.main || null)
                .addFields(
                    { name: `Guild ID`, value: guildId || 'N/A', inline: false },
                    { name: `Time`, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setTimestamp();

            if (Object.keys(additionalInfo).length > 0) {
                embed.addFields(
                    { name: `Additional Info`, value: `\`\`\`json\n${JSON.stringify(additionalInfo, null, 2)}\`\`\``, inline: false }
                );
            }

            await this.webhook.send({ embeds: [embed] });
        } catch (webhookError) {
            console.log(colors.cyan(`[INFO] ${title}: ${description}`));
        }
    }

    async logGuildEvent(eventType, guild, additionalInfo = {}) {
        if (!this.webhook) {
            console.log(colors.blue(`[GUILD ${eventType.toUpperCase()}] ${guild.name} (${guild.id})`));
            return;
        }

        try {
            const theme = await this.client.themeManager.getTheme(guild.id);
            const embed = new EmbedBuilder()
                .setColor(theme.color) // Dark red color
                .setTitle(`🏰 Guild ${eventType}`)
                .setDescription(`**Guild:** \`${guild.name}\` (\`${guild.id}\`)\n**Members:** \`${guild.memberCount}\`\n**Owner:** <@${guild.ownerId}>`)
                .setThumbnail(theme.images?.thumbnail || guild.iconURL() || this.client.user?.displayAvatarURL() || null)
                .setImage(theme.images?.main || null)
                .addFields(
                    { name: `Guild ID`, value: guild.id, inline: false },
                    { name: `Member Count`, value: guild.memberCount.toString(), inline: false },
                    { name: `Event Type`, value: eventType, inline: false }
                )
                .setTimestamp();

            if (Object.keys(additionalInfo).length > 0) {
                embed.addFields(
                    { name: `Additional Info`, value: `\`\`\`json\n${JSON.stringify(additionalInfo, null, 2)}\`\`\``, inline: false }
                );
            }

            await this.webhook.send({ embeds: [embed] });
        } catch (webhookError) {
            console.log(colors.red(`[WEBHOOK] Failed to send guild event log: ${webhookError.message}`));
        }
    }

    async logCommandUsage(commandName, user, guild, success = true) {
        const title = `Command ${success ? 'Success' : 'Failed'}`;
        const description = `**Command:** \`${commandName}\`\n**User:** \`${user.tag}\` (\`${user.id}\`)\n**Guild:** \`${guild.name}\` (\`${guild.id}\`)`;

        await this.logInfo(title, description, guild.id, { success });
    }

    async logVoiceEvent(eventType, guild, channel, user, additionalInfo = {}) {
        const title = `Voice ${eventType}`;
        const description = `**User:** \`${user.tag}\` (\`${user.id}\`)\n**Channel:** \`${channel.name}\` (\`${channel.id}\`)\n**Guild:** \`${guild.name}\` (\`${guild.id}\`)`;

        await this.logInfo(title, description, guild.id, additionalInfo);
    }

    async logSystemEvent(eventType, description, additionalInfo = {}) {
        const title = `System ${eventType}`;

        await this.logInfo(title, description, null, additionalInfo);
    }

    async sendToLogChannel(client, title, description, thumbnail = null) {
        await this.logInfo(title, description, null, { thumbnail });
    }
}

export default WebhookLogger;
