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
    name: 'aliases',
    aliases: ['customalias', 'setalias'],
    description: 'Manage custom command aliases for this server',
    category: 'Setup',
    usage: '+aliases <add/remove/list> [alias] [commandName]',
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
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        const subCommand = args[0]?.toLowerCase();
        const settings = await client.getSettings(guildId);

        if (!subCommand || !['add', 'remove', 'list'].includes(subCommand)) {
            const helpContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Custom Aliases__\n` +
                                `> ${theme.emojis.star || ''} __Create your own shortcuts for commands.__\n\n` +
                                `> ${theme.emojis.star || ''} **__Usage:__**\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}aliases list\`  View all\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}aliases add <alias> <command>\`\n` +
                                `> ${theme.emojis.star || ''} \`${client.config.prefix}aliases remove <alias>\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [helpContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        const rawAliases = settings.customAliases;

        // Extract entries properly — handles Mongoose Map, native Map, and plain objects
        let aliasEntries = [];
        if (rawAliases) {
            if (typeof rawAliases.entries === 'function' && rawAliases instanceof Map) {
                aliasEntries = Array.from(rawAliases.entries());
            } else if (typeof rawAliases === 'object') {
                aliasEntries = Object.entries(rawAliases).filter(([key]) => !key.startsWith('$') && !key.startsWith('_'));
            }
        }

        if (subCommand === 'list') {
            let listContent = '';
            const themeAnsi = getThemeAnsiCode(theme);

            if (aliasEntries.length === 0) {
                listContent = `\u001b[${themeAnsi}m// No custom shortcuts configured yet\u001b[0m`;
            } else {
                listContent = `\u001b[${themeAnsi}m// Active Server Shortcuts\u001b[0m\n`;
                aliasEntries.forEach(([alias, cmd], index) => {
                    listContent += `\u001b[${themeAnsi}m[${(index + 1).toString().padStart(2, '0')}] ${alias} = "${cmd}";\u001b[0m\n`;
                });
            }

            const statusContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Custom Aliases Status__\n` +
                                `> ${theme.emojis.star || ''} __Currently configured shortcuts:__\n\n` +
                                `\`\`\`ansi\n${listContent}\n\`\`\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [statusContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        if (subCommand === 'add') {
            const alias = args[1]?.toLowerCase();
            const cmdName = args[2]?.toLowerCase();

            if (!alias || !cmdName) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis.info || ''} __Usage: \`${client.config.prefix}aliases add <shortcut> <original_command>\`__`)
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
            }

            const command = client.prefixCommands.get(cmdName);
            if (!command) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis.info || ''} __Command \`${cmdName}\` not found.__`)
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
            }

            // Prevent overwriting core commands — tell user it already exists
            if (client.prefixCommands.has(alias)) {
                const existingCmd = client.prefixCommands.get(alias);
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${theme.emojis.title || ''} __Already Exists__\n` +
                                    `> ${theme.emojis.star || ''} __\`${alias}\` is already a built-in shortcut for \`${existingCmd.name}\`.__\n` +
                                    `> ${theme.emojis.star || ''} __You can use \`${client.config.prefix}${alias}\` directly.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL({ extension: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                            )
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
            }

            // Build a clean plain object from entries for saving
            const aliasObj = Object.fromEntries(aliasEntries);
            aliasObj[alias] = command.name;
            await client.saveSettings(guildId, 'customAliases', aliasObj);

            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes || ''} __Success__\n` +
                        `> ${theme.emojis.star} __Shortcut \`${alias}\` now points to \`${command.name}\`.__`
                    )
                );
            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        if (subCommand === 'remove') {
            const alias = args[1]?.toLowerCase();
            if (!alias) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis.info || ''} __Usage: \`${client.config.prefix}aliases remove <shortcut>\`__`)
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
            }

            if (!aliasEntries.some(([key]) => key === alias)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> ${theme.emojis.info || ''} __Shortcut \`${alias}\` not found.__`)
                    );
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
            }

            const aliasObj = Object.fromEntries(aliasEntries.filter(([key]) => key !== alias));
            await client.saveSettings(guildId, 'customAliases', aliasObj);

            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes || ''} __Success__\n` +
                        `> ${theme.emojis.star} __Shortcut \`${alias}\` has been removed.__`
                    )
                );
            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }
    }
};
