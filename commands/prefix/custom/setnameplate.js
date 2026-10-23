import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} from 'discord.js';

import GuildConfig from '../../../models/guildConfig.js';
import {
    applyNameplate,
    DEFAULT_NAMEPLATE,
    NAMEPLATE_FONTS,
    NAMEPLATE_EFFECTS,
} from '../../../lib/nameplate.js';

export default {
    name: 'setnameplate',
    description: "Applies a custom nameplate style (font, effect, color) to the bot in this server",
    category: 'BotManage',
    usage: '+setnameplate <font> <effect> <hexcolor>',
    aliases: ['nameplate', 'botplate'],
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const guildConfig = await GuildConfig.findOne({ guildId });

        const isPermitted = client.config.devIds.includes(message.author.id) || guildConfig?.customPermitUsers?.includes(message.author.id);

        if (!isPermitted) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Permission Denied__\n` +
                                `> ${emojis.star || ''} Only the bot owners can use this command.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const fontName = args[0]?.toLowerCase();
        const effectName = args[1]?.toLowerCase();
        const hexInput = args[2];

        if (!fontName || !effectName || !(fontName in NAMEPLATE_FONTS) || !(effectName in NAMEPLATE_EFFECTS)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __How To Use__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}setnameplate\` <font> <effect> <hexcolor>\n` +
                                `> ${emojis.star || ''} **__Fonts:__** \`${Object.keys(NAMEPLATE_FONTS).join('`, `')}\`\n` +
                                `> ${emojis.star || ''} **__Effects:__** \`${Object.keys(NAMEPLATE_EFFECTS).join('`, `')}\`\n` +
                                 `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}setnameplate vampyre holographic #F2A04A\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let color = DEFAULT_NAMEPLATE.colors[0];
        if (hexInput) {
            const parsed = parseInt(hexInput.replace('#', ''), 16);
            if (!Number.isNaN(parsed)) color = parsed;
        }

        try {
            await applyNameplate(client, guildId, {
                fontId: NAMEPLATE_FONTS[fontName],
                effectId: NAMEPLATE_EFFECTS[effectName],
                colors: [color],
            });

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Nameplate Updated__\n` +
                                `> ${emojis.star || ''} **Font:** \`${fontName}\`\n` +
                                `> ${emojis.star || ''} **Effect:** \`${effectName}\`\n` +
                                `> ${emojis.star || ''} **Color:** \`#${color.toString(16).padStart(6, '0')}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __System Error__\n` +
                                `> ${emojis.star || ''} Failed to set nameplate: \`${error.message}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
