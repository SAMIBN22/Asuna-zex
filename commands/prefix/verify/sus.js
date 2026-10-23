import { resolveUser } from '../../../lib/resolveUser.js';
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
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: 'sus',
    description: 'Mark a member as suspicious to prevent them from being verified',
    usage: '+sus <user_id>',
    category: 'Verification',
    requiredRoles: 'verificatorsRoleIds',

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const config = await GuildConfig.findOne({ guildId });
            if (!config || !config.verificatorsRoleIds || !config.verifiedRoleId || !config.unverifiedRoleId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                    `> ${emojis.star || ''} **__Verification system is not configured.__**\n` +
                                    `> ${emojis.star || ''} __Use \`/setupverify\` first.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }


            const hasVerificatorRole = config.verificatorsRoleIds.some(roleId => message.member.roles.cache.has(roleId));
            const isAdministrator = message.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!hasVerificatorRole && !isAdministrator) {
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
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            const targetId = args[0]?.replace(/[<@!>]/g, '');
            const reason = args.slice(1).join(' ');

            if (!targetId || !reason) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __How To Use__\n\n` +
                                    `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}sus\` \`user\` \`reason\`\n` +
                                    `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}sus\` <@${message.author.id}> \`spammer\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
            }

            try {
                const targetMember = await resolveMember(message, args[0]);
                if (targetMember) {
                    if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                        const container = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `## ${emojis.info || ''} __Operation Failed__\n\n` +
                                            `> ${emojis.star || ''} **__Cannot mark__ <@${targetId}> __as SUS.__**\n` +
                                            `> ${emojis.star || ''} __Reason:__ Role is higher or equal to mine.`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                    )
                            );
                        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
                    }
                }
            } catch (memberError) { }

            if (!config.suspendedUsers) config.suspendedUsers = [];
            if (!config.suspendedUsers.includes(targetId)) {
                config.suspendedUsers.push(targetId);
                await GuildConfig.updateOne({ guildId }, { $set: { suspendedUsers: config.suspendedUsers } });
            }

            await GuildSetup.findOneAndUpdate(
                { guildId, userId: targetId, type: 'sus-record' },
                {
                    jailedBy: message.author.id,
                    reason: reason,
                    isActive: true,
                    jailedAt: new Date()
                },
                { upsert: true, new: true }
            );

            let rolesRemoved = false;
            let savedRoles = [];
            try {
                const targetMember = await resolveMember(message, args[0]);
                if (targetMember) {
                    savedRoles = targetMember.roles.cache.filter(role =>
                        role.id !== message.guild.id &&
                        !role.managed
                    ).map(r => r.id);

                    const rolesToRemove = targetMember.roles.cache.filter(role =>
                        role.id !== message.guild.id &&
                        role.position < message.guild.members.me.roles.highest.position &&
                        !role.managed
                    );

                    if (rolesToRemove.size > 0) {
                        await targetMember.roles.remove(rolesToRemove).catch(() => null);
                        rolesRemoved = true;
                    }

                    if (config.unverifiedRoleId) {
                        const unverifiedRole = message.guild.roles.cache.get(config.unverifiedRoleId);
                        if (unverifiedRole && unverifiedRole.position < message.guild.members.me.roles.highest.position) {
                            await targetMember.roles.add(unverifiedRole).catch(() => null);
                        }
                    }

                    await GuildSetup.findOneAndUpdate(
                        { guildId, userId: targetId, type: 'sus-record', isActive: true },
                        { savedRoles }
                    );

                    try {
                        const dmContainer = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `## ${emojis.info || ''} __Suspicious Activity Detected__\n\n` +
                                            `> ${emojis.star || ''} **__Your account has been flagged as SUS__**\n` +
                                            `> ${emojis.star || ''} **__Server:__ \`${message.guild.name}\`**\n` +
                                            `> ${emojis.star || ''} **__Reason:__ ${reason}**`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png' }) || client.user.displayAvatarURL())
                                    )
                            );

                        await targetMember.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => null);
                    } catch (dmError) { }
                }
            } catch (memberError) { }

            if (config.verifyLogChannelId) {
                const logsChannel = message.guild.channels.cache.get(config.verifyLogChannelId);
                if (logsChannel) {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const logContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `# ${emojis.info || ''} __Member Flagged (SUS)__\n\n` +
                                        `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                        `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                        `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                        `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );

                    await logsChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => null);
                }
            }

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Member Marked as SUS__\n\n` +
                                `> ${emojis.star || ''} **__Member:__ <@${targetId}>**\n` +
                                `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                `> ${emojis.star || ''} **__Status:__ ${rolesRemoved ? 'Roles removed & Unverified' : 'Marked (Not in server)'}**\n` +
                                `> ${emojis.star || ''} **__Note:__ Cannot be verified until \`+unsus\` is used.**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        } catch (error) {
            console.error('[Sus] Error:', error);
            return message.reply("An error occurred during SUS labeling.");
        }
    }
};
