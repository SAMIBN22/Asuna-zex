import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'jailconfig',
    description: 'Displays the jail system configuration',
    category: 'Jail',
    usage: '+jailconfig',
    permissions: ['ManageRoles'],
    requiredRoles: 'jailerRoleId',
    guildOnly: true,
    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const config = (await GuildConfig.findOne({ guildId })) || {};

            const getV = (id) => (id && String(id).length > 5) ? `<@&${id}>` : '`Not Set`';
            const getC = (id) => (id && String(id).length > 5) ? `<#${id}>` : '`Not Set`';

            const jailers = (config?.jailerRoleId || [])
                .filter(id => id && String(id).trim() !== '')
                .map(id => `<@&${id}>`)
                .join(' ') || '`Not Set`';

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Jail Config__\n\n` +
                                `> ${emojis.star || ''} **__Roles and Channels configuration.__**\n` +
                                `> ${emojis.star || ''} __For the jail system.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL())
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> ${emojis.star || ''} **__Jail Roles:__**\n` +
                                `> ${emojis.right || ''} **Jail Role:** ${getV(config.jailRoleId)}\n` +
                                `> ${emojis.right || ''} **Anti-Jail:** ${getV(config.antiJailRoleId)}\n\n` +
                                `> ${emojis.star || ''} **__Jailers Roles:__**\n` +
                                `> ${emojis.right || ''} ${jailers}`
                            )
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> ${emojis.star || ''} **__Jail Channels:__**\n` +
                                `> ${emojis.right || ''} **Category:** ${getC(config.jailVCCategoryId)}\n` +
                                `> ${emojis.right || ''} **Logs:** ${getC(config.jailLogsChannelId)}\n` +
                                `> ${emojis.right || ''} **Voice:** ${getC(config.jailVCId)}`
                            )
                        )
                );

            await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('[JailConfig Error]:', error);
            const errorContainer = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##  __Error Executing Command__\n\n` +
                                `>  **__An error occurred while fetching the config.__**\n` +
                                `>  __Details:__ \`${error.message}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            message.channel.send({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        }
    }
};
