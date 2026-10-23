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
    name: 'susinfo',
    aliases: ['sc', 'sus_check', 'sus_info'],
    description: 'Check suspension information for a user',
    usage: '+sus-check <user_id/mention>',
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
                                    `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}susinfo\` \`user\`\n` +
                                    `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}susinfo\` <@${message.author.id}>`
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

            const record = await GuildSetup.findOne({ guildId, userId: targetId, type: 'sus-record', isActive: true });

            if (!record) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `### ${emojis.yes || ''} __No SUS Record__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetId}> __has no SUS record.__**\n` +
                                    `> ${emojis.star || ''} __This user is clean in the database.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const markedBy = record.jailedBy ? await client.users.fetch(record.jailedBy).catch(() => null) : null;
            const markedByTag = markedBy ? markedBy.tag : 'Unknown';
            const timestamp = record.jailedAt ? Math.floor(record.jailedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __SUS Information__\n\n` +
                                `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                `> ${emojis.star || ''} **__Marked By:__ <@${record.jailedBy || ''}> (\`${markedByTag}\`)**\n` +
                                `> ${emojis.star || ''} **__Reason:__ ${record.reason || 'No reason'}**\n` +
                                `> ${emojis.star || ''} **__Date:__ <t:${timestamp}:F> (<t:${timestamp}:R>)**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        } catch (error) {
            console.error('[SusCheck] Error:', error);
            const errorContainer = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##  __Error Occurred__\n\n` +
                                `>  **__An error occurred while fetching SUS info.__**`
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
