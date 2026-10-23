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
    name: 'verifyconfig',
    description: 'Displays the verification system configuration',
    category: 'Verification',
    usage: '+verifyconfig',
    permissions: ['ManageRoles'],
    requiredRoles: 'verificatorsRoleIds',
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

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Verification Config__\n\n` +
                                `> ${emojis.star || ''} **__Roles and Channels configuration.__**\n` +
                                `> ${emojis.star || ''} __For the verification system.__`
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
                                `> ${emojis.star || ''} **__Verification Roles:__**\n` +
                                `> ${emojis.right || ''} **Verified Role:** ${getV(config.verifiedRoleId)}\n` +
                                `> ${emojis.right || ''} **Unverified Role:** ${getV(config.unverifiedRoleId)}\n` +
                                `> ${emojis.right || ''} **Female Role:** ${getV(config.femaleRoleId)}\n\n` +
                                `> ${emojis.star || ''} **__Verification Channels:__**\n` +
                                `> ${emojis.right || ''} **Category:** ${getC(config.verifyCategoryId)}\n` +
                                `> ${emojis.right || ''} **Logs:** ${getC(config.verifyLogChannelId)}\n` +
                                `> ${emojis.right || ''} **Voice:** ${getC(config.verifyVoiceChannelId)}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                        )
                );

            await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('[VerifyConfig Error]:', error);
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
