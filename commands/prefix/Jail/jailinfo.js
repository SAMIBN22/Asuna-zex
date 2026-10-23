import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: 'jailinfo',
    aliases: ['jc', 'jail_check', 'jail_info'],
    description: 'Check jail information for a user',
    usage: '+jail-check <user_id/mention>',
    category: 'Jail',
    requiredRoles: 'jailerRoleId',

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
                                    `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}jailinfo\` \`user\`\n` +
                                    `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}jailinfo\` <@${message.author.id}>`
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

            const record = await GuildSetup.findOne({ guildId, userId: targetId, type: 'jail-record', isActive: true });

            if (!record) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `### ${emojis.yes || ''} __No Active Jail Record__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetId}> __is not currently jailed.__**\n` +
                                    `> ${emojis.star || ''} __No active record found in the database.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const jailedBy = record.jailedBy ? await client.users.fetch(record.jailedBy).catch(() => null) : null;
            const jailedByTag = jailedBy ? jailedBy.tag : 'Unknown';
            const timestamp = record.jailedAt ? Math.floor(record.jailedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

            const savedRoles = record.savedRoles || [];
            let rolesList = savedRoles.length > 0
                ? savedRoles.map(id => `<@&${id}>`).join(', ')
                : 'No roles saved';

            if (rolesList.length > 1000) rolesList = rolesList.substring(0, 1000) + '...';

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Jail Information__\n\n` +
                                `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                `> ${emojis.star || ''} **__Jailed By:__ <@${record.jailedBy || message.author.id}> (\`${jailedByTag}\`)**\n` +
                                `> ${emojis.star || ''} **__Reason:__ ${record.reason || 'No reason'}**\n` +
                                `> ${emojis.star || ''} **__Date:__ <t:${timestamp}:F>**\n` +
                                `> ${emojis.star || ''} **__Roles Saved:__ \`${savedRoles.length}\` roles**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.title || ''} __Old Roles__\n\n` +
                                `> ${emojis.star || ''} ${rolesList}`
                            )
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        } catch (error) {
            console.error('[JailCheck] Error:', error);
            return message.reply("An error occurred while fetching jail information.");
        }
    }
};
