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
    name: 'checkjail',
    aliases: ['checkreason', 'checkjailinfo', 'check'],
    description: 'Check information about a jailed user',
    usage: '&checkjail <@user|ID>',
    category: 'Jail',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);

            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&checkjail <@user|ID>\`**`
                                )
                            )
                    ]
                });
            }

            const targetUser = await client.users.fetch(targetId).catch(() => null);
            if (!targetUser) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} Could not find user: \`${targetId}\``
                                )
                            )
                    ]
                });
            }

            const record = await GuildSetup.findOne({ guildId, userId: targetId, type: 'jail-record', isActive: true });

            if (!record) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `### ${emojis.yes || ''} __No Active Jail Record__\n` +
                                            `> ${emojis.star || ''} <@${targetId}> is not currently jailed.`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                                    )
                            )
                    ],
                    allowedMentions: { parse: [] }
                });
            }

            const jailedBy = record.jailedBy ? await client.users.fetch(record.jailedBy).catch(() => null) : null;
            const timestamp = record.jailedAt ? Math.floor(record.jailedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `# ${emojis.title || ''} __Jail Information__\n\n` +
                                        `> ${emojis.star || ''} **Member:** <@${targetId}>\n` +
                                        `> ${emojis.star || ''} **Jailed By:** ${jailedBy ? jailedBy.tag : 'Unknown'}\n` +
                                        `> ${emojis.star || ''} **Reason:** ${record.reason || 'No reason'}\n` +
                                        `> ${emojis.star || ''} **Date:** <t:${timestamp}:F>`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        } catch (error) {
            console.error('[CheckJail] Error:', error);
            return message.reply('An error occurred while fetching jail information.');
        }
    }
};
