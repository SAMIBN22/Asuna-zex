import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import Warn from '../../../models/warn.js';

export default {
    name: 'unwarn',
    description: 'Remove all warnings from a user',
    usage: '+unwarn <user_id/mention> [reason]',
    category: 'Warn',
    aliases: ['uw'],
    requiredRoles: 'warnerRoleIds',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const config = await GuildConfig.findOne({ guildId });

        if (!config || !config.warnerRoleIds || config.warnerRoleIds.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __System Not Configured__\n\n` +
                                `> ${emojis.star || ''} **__The Warn system is not fully configured.__**\n` +
                                `> ${emojis.star || ''} __Use \`${client.config.prefix}setwarn\` to configure it.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const isWarner = config.warnerRoleIds.some(id => message.member.roles.cache.has(id));
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isAdmin && !isWarner) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Permission Denied__\n\n` +
                                `> ${emojis.star || ''} **__You don't have permission__**\n` +
                                `> ${emojis.star || ''} __to use this command.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetMember = await resolveMember(message, args[0]);
const targetId = targetMember?.id;
        if (!targetMember) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __User Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find a member.__**\n` +
                                `> ${emojis.star || ''} __ID:__ \`${targetId}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                `> ${emojis.star || ''} **__Cannot unwarn this member.__**\n` +
                                `> ${emojis.star || ''} __Their role is higher or equal to yours.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const rolesToRemove = [];
        if (config.firstWarnRoleId) rolesToRemove.push(config.firstWarnRoleId);
        if (config.secondWarnRoleId) rolesToRemove.push(config.secondWarnRoleId);
        if (config.lastWarnRoleId) rolesToRemove.push(config.lastWarnRoleId);

        if (rolesToRemove.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                `> ${emojis.star || ''} **__No warning roles configured to remove.__**\n` +
                                `> ${emojis.star || ''} __Use \`${client.config.prefix}setwarn\` to set them up.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        await targetMember.roles.remove(rolesToRemove).catch(() => null);
        await Warn.updateMany({ guildId, userId: targetMember.id, active: true }, { $set: { active: false } });

        if (config.warnLogsChannelId) {
            const logChannel = message.guild.channels.cache.get(config.warnLogsChannelId);
            if (logChannel) {
                const timestamp = Math.floor(Date.now() / 1000);
                const logContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Member Unwarned__\n\n` +
                                    `> ${emojis.star || ''} **__Member:__ <@${targetMember.id}> (\`${targetMember.id}\`)**\n` +
                                    `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                    `> ${emojis.star || ''} **__Type Removed:__ All**\n` +
                                    `> ${emojis.star || ''} **__Reason:__ ${reason}**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                logChannel.send({
                    components: [logContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => { });
            }
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.yes || ''} __Unwarn Success__\n\n` +
                            `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                            `> ${emojis.star || ''} **__All warnings have been removed.__**\n` +
                            `> ${emojis.star || ''} **__Reason:__ ${reason}**`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                    )
            );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
