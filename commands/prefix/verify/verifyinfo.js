import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: 'verifyinfo',
    aliases: ['vc', 'verify_check', 'verify_info'],
    description: 'Check verification information for a user',
    usage: '+verify-check <user_id/mention>',
    category: 'Verification',
    requiredRoles: 'verificatorsRoleIds',

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);

            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __How To Use__\n\n` +
                                    `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}verifyinfo\` \`user\`\n` +
                                    `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}verifyinfo\` <@${message.author.id}>`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const targetUser = await client.users.fetch(targetId).catch(() => null);
            if (!targetUser) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __User Not Found__\n\n` +
                                    `> ${emojis.star || ''} **__Could not find user with ID:__ \`${targetId}\`**`
                                )
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const record = await GuildSetup.findOne({ guildId, userId: targetId, type: 'verify-record' });

            if (!record) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __No Verification Record__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetId}> __has no verification record.__**\n` +
                                    `> ${emojis.star || ''} __This user is not in the database.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const verifiedBy = record.jailedBy ? await client.users.fetch(record.jailedBy).catch(() => null) : null;
            const verifiedByTag = verifiedBy ? verifiedBy.tag : 'Unknown';
            const timestamp = record.jailedAt ? Math.floor(record.jailedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Verification Information__\n\n` +
                                `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                `> ${emojis.star || ''} **__Verified By:__ <@${record.jailedBy || ''}> (\`${verifiedByTag}\`)**\n` +
                                `> ${emojis.star || ''} **__Date:__ <t:${timestamp}:F> (<t:${timestamp}:R>)**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        } catch (error) {
            console.error('[VerifyCheck] Error:', error);
            const errorContainer = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##  __Error Occurred__\n\n` +
                                `>  **__An error occurred while fetching verification info.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser?.displayAvatarURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }
    }
};
