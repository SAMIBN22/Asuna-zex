import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionsBitField,
    MessageFlags
} from 'discord.js';
import themeManager from '../../../themes/themeManager.js';

function getThemeAnsiCode(theme) {
    const themeColors = {
        cyan: '34',
        red: '31',
        green: '32',
        gold: '33',
        yellow: '33',
        purple: '45',
        pink: '35',
        grey: '37',
        black: '30',
        white: '37'
    };
    try {
        const themes = themeManager.themes || {};
        const themeName = Object.keys(themes).find(name =>
            themes[name].color === theme.color
        );
        return themeColors[themeName] || '36';
    } catch (error) {
        return '36';
    }
}

export default {
    name: 'noprefix',
    description: 'Manage no-prefix commands system',
    category: 'Setup',
    usage: '+prefix <enable/disable/status> [commandName]',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const themeColor = client.themeManager.getRGBColor(theme.color);

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Access Denied__\n` +
                                `> ${theme.emojis.star || ''} __You need Administrator permission to use this command.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const subCommand = args[0]?.toLowerCase();
        const cmdName = args[1]?.toLowerCase();

        const config = await client.getSettings(guildId);

        if (!subCommand || !['status', 'enable', 'disable'].includes(subCommand)) {
            const helpContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Prefix System__\n` +
                                `> ${theme.emojis.star || ''} __Manage commands that work without a prefix.__\n\n` +
                                `> ${theme.emojis.star || ''} **__Usage:__**\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}prefix status\`  View list\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}prefix enable <command>\`  Enable No-Prefix\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}prefix disable <command>\`  Disable No-Prefix`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [helpContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (subCommand === 'status') {
            const commands = config.noPrefixCommands || [];
            const themeAnsi = getThemeAnsiCode(theme);
            
            let listContent = '';
            if (commands.length === 0) {
                listContent = `\u001b[${themeAnsi}m// No commands enabled for no-prefix yet\u001b[0m`;
            } else {
                listContent = `\u001b[${themeAnsi}m// No-Prefix Active Commands\u001b[0m\n`;
                commands.forEach((cmd, index) => {
                    listContent += `\u001b[${themeAnsi}m[${(index + 1).toString().padStart(2, '0')}] = "${cmd}";\u001b[0m\n`;
                });
            }

            const statusContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __No-Prefix Status__\n` +
                                `> ${theme.emojis.star || ''} __Commands currently active without a prefix:__\n\n` +
                                `\`\`\`ansi\n${listContent}\n\`\`\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [statusContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (!cmdName) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Missing Argument__\n` +
                                `> ${theme.emojis.star || ''} __Please provide a command name.__\n` +
                                `> ${theme.emojis.star || ''} __Example:__ \`${client.config.prefix}prefix ${subCommand} avatar\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const command = client.prefixCommands.get(cmdName);
        if (!command) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Invalid Command__\n` +
                                `> ${theme.emojis.star || ''} __Command \`${cmdName}\` not found in bot commands list.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const realCmdName = command.name;

        if (subCommand === 'enable') {
            if (config.noPrefixCommands?.includes(realCmdName)) {
                const infoContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${theme.emojis.title || ''} __Already Enabled__\n` +
                                    `> ${theme.emojis.star || ''} __Command \`${realCmdName}\` is already working without a prefix.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                            )
                    );
                return message.reply({ components: [infoContainer], flags: MessageFlags.IsComponentsV2 });
            }

            const noPrefixCommands = config.noPrefixCommands || [];
            if (!noPrefixCommands.includes(realCmdName)) {
                noPrefixCommands.push(realCmdName);
                await client.saveSettings(guildId, 'noPrefixCommands', noPrefixCommands);
            }

            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes || ''} __Success__\n` +
                        `> ${theme.emojis.star} __Command \`${realCmdName}\` is now enabled for No-Prefix.__`
                    )
                );
            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (subCommand === 'disable') {
            if (!config.noPrefixCommands?.includes(realCmdName)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${theme.emojis.title || ''} __Not Enabled__\n` +
                                    `> ${theme.emojis.star || ''} __Command \`${realCmdName}\` is not in the No-Prefix list.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                            )
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }

            const noPrefixCommands = (config.noPrefixCommands || []).filter(c => c !== realCmdName);
            await client.saveSettings(guildId, 'noPrefixCommands', noPrefixCommands);

            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes || ''} __Success__\n` +
                        `> ${theme.emojis.star} __Command \`${realCmdName}\` has been disabled for No-Prefix.__`
                    )
                );
            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
