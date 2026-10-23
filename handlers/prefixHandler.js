import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

import WebhookLogger from '../functions/webhookLogger.js';
import CooldownManager from '../lib/cooldown.js';
import config from '../config/config.js';
import constants from '../config/constant.js';

class PrefixHandler {
    constructor(client) {
        this.client = client;
        this.webhookLogger = new WebhookLogger(client);
    }

    async getTheme(guildId) {
        return await this.client.themeManager.getTheme(guildId);
    }

    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        try {
            const settings = await this.client.getSettings(message.guild.id);
            const prefix = settings?.prefix || config.prefix || '+';

            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const trigger = args.shift().toLowerCase();

            // Check custom aliases first
            let commandName = trigger;
            if (settings?.customAliases && settings.customAliases.has(trigger)) {
                commandName = settings.customAliases.get(trigger);
            }

            const command = this.client.prefixCommands.get(commandName);
            if (!command) {
                return this.handleCommandNotFound(message, trigger, prefix);
            }

            const theme = await this.getTheme(message.guild.id);
            const cooldown = this.client.cooldowns?.checkCooldown('user', message.author.id, commandName);
            if (cooldown?.onCooldown) {
                const remaining = this.client.cooldowns.formatTime(cooldown.remaining);
                const container = new ContainerBuilder()
                    .setAccentColor(theme.color)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${theme.emojis.info || '⏳'} __Command On Cooldown__\n\n` +
                                    `> ${theme.emojis.star || '✦'} **__You are using this command too fast.__**\n` +
                                    `> ${theme.emojis.star || '✦'} **__Please wait \`${remaining}\` before trying again.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            this.client.cooldowns?.setCooldown('user', message.author.id, commandName);

            try {
                await command.execute(message, args, this.client);
            } catch (err) {
                await this.handleCommandError(message, commandName, err);
            }
        } catch (err) {
            await this.webhookLogger.logError('messageCreate', err, message.guild?.id);
            console.error('Error in messageCreate event:', err);
        }
    }

    async handleCommandNotFound(message, commandName, prefix) {
        const theme = await this.getTheme(message.guild.id);
        const userThumbnail = new ThumbnailBuilder()
            .setURL(message.author.displayAvatarURL({ extension: "png", size: 512 }))
            .setDescription(`${message.author.username}'s Avatar`);

        const container = new ContainerBuilder()
            .setAccentColor(theme.color)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${theme.emojis.title} __Command Not Found__`
                )
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star} *Hey there, I don't recognize that command*\n` +
                            `> ${theme.emojis.star} *Command: \`${commandName}\` doesn't exist*\n` +
                            `> ${theme.emojis.star} *Use \`${prefix}help\` to see all available commands*\n` +
                            `> ${theme.emojis.star} *Maybe you made a typo?*`
                        )
                    )
                    .setThumbnailAccessory(userThumbnail)
            );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false }
        });
    }

    async handleCommandError(message, commandName, error) {
        const theme = await this.getTheme(message.guild.id);
        const userThumbnail = new ThumbnailBuilder()
            .setURL(message.author.displayAvatarURL({ extension: "png", size: 512 }))
            .setDescription(`${message.author.username}'s Avatar`);

        const container = new ContainerBuilder()
            .setAccentColor(theme.color)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${theme.emojis.title} __Oops! Something Went Wrong__`
                )
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star} *The command \`${commandName}\` encountered an error*\n` +
                            `> ${theme.emojis.star} *Don't worry, I've logged this issue*\n` +
                            `> ${theme.emojis.star} *Try again in a moment or contact support*\n` +
                            `> ${theme.emojis.star} *Sometimes even bots have bad days*`
                        )
                    )
                    .setThumbnailAccessory(userThumbnail)
            );

        await this.webhookLogger.logError('commandExecution', error, message.guild?.id, {
            command: commandName,
            user: message.author.tag,
            guild: message.guild?.name
        });

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false }
        });
    }
}

export default PrefixHandler;