import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionsBitField,
    MessageFlags
} from 'discord.js';
import config from '../../../config/config.js';
import themeManager from '../../../themes/themeManager.js';

const OWNER_IDS = (config.devIds || []).map(String);
function isBotOwner(id) {
    return OWNER_IDS.includes(String(id));
}

const MAX_PREFIX_LENGTH = 5;
const FORBIDDEN_CHARS = /[@#`\s]/;

export default {
    name: 'prefix',
    description: "View or change this server's bot command prefix",
    category: 'Setup',
    usage: '&prefix [newPrefix]',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const thumbnail = theme.images?.thumbnail || client.user.displayAvatarURL();

        const isServerOwner = message.guild.ownerId === message.author.id;
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isAllowed = isServerOwner || isAdmin || isBotOwner(message.author.id);

        const settings = await client.getSettings(guildId);
        const currentPrefix = settings?.prefix || config.prefix || '&';

        // No argument → show the current prefix for this server only
        if (!args[0]) {
            const infoContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Server Prefix__\n` +
                                `> ${theme.emojis.star || ''} __The current prefix for this server is__ \`${currentPrefix}\`\n\n` +
                                `> ${theme.emojis.star || ''} **__Usage:__**\n` +
                                `> ${theme.emojis.star || ''} \`${currentPrefix}prefix <newPrefix>\`  Change the prefix for this server only`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
                );
            return message.reply({ components: [infoContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Permission check — only the server owner, an Administrator, or a bot owner can change it
        if (!isAllowed) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Access Denied__\n` +
                                `> ${theme.emojis.star || ''} __Only the server owner or an Administrator can change the prefix.__`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const newPrefix = args[0];

        if (newPrefix.length > MAX_PREFIX_LENGTH) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Invalid Prefix__\n` +
                                `> ${theme.emojis.star || ''} __The prefix cannot be longer than ${MAX_PREFIX_LENGTH} characters.__`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (FORBIDDEN_CHARS.test(newPrefix)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __Invalid Prefix__\n` +
                                `> ${theme.emojis.star || ''} __The prefix cannot contain spaces, backticks, \`@\`, or \`#\`.__`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (newPrefix === currentPrefix) {
            const infoContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${theme.emojis.title || ''} __No Change__\n` +
                                `> ${theme.emojis.star || ''} __The prefix is already set to__ \`${currentPrefix}\` __for this server.__`
                            )
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
                );
            return message.reply({ components: [infoContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Persist the new prefix for THIS guild only — every other server keeps its own prefix untouched
        await client.saveSettings(guildId, 'prefix', newPrefix);

        const successContainer = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${theme.emojis.yes || ''} __Prefix Updated__\n` +
                    `> ${theme.emojis.star} __This server's prefix has been changed from__ \`${currentPrefix}\` __to__ \`${newPrefix}\`\n` +
                    `> ${theme.emojis.star} __Example:__ \`${newPrefix}help\`\n` +
                    `> ${theme.emojis.star} __This change only applies to this server — all other servers keep their own prefix.__`
                )
            );
        return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
    }
};
