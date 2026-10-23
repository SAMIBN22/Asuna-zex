import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import GuildSetup from '../../../models/guildSetup.js';
import Warn from '../../../models/warn.js';

export default {
    name: 'warn',
    description: 'Issue a warning to a user',
    usage: '+warn <user_id/mention> <type> [reason]',
    category: 'Warn',
    aliases: ['w'],
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

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const type = args[1]?.toLowerCase();

        if (!targetId || !type) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}warn\` \`user\` \`first/second/last\` \`reason\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}warn\` <@${message.author.id}> \`first\` \`Repeated toxicity\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!['first', 'second', 'last'].includes(type)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Invalid Type__\n\n` +
                                `> ${emojis.star || ''} **__Warn type must be valid.__**\n` +
                                `> ${emojis.star || ''} __Use \`first\`, \`second\`, or \`last\`.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetMember = await resolveMember(message, targetId || args[0]);
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
                                `> ${emojis.star || ''} **__Cannot warn this member.__**\n` +
                                `> ${emojis.star || ''} __Their role is higher or equal to yours.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let roleToAddId;
        if (type === 'first') roleToAddId = config.firstWarnRoleId;
        if (type === 'second') roleToAddId = config.secondWarnRoleId;
        if (type === 'last') roleToAddId = config.lastWarnRoleId;

        if (!roleToAddId) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                `> ${emojis.star || ''} **__Role for \`${type}\` warning is not configured.__**\n` +
                                `> ${emojis.star || ''} __Use \`${client.config.prefix}setwarn\` to set it up.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const roleToAdd = message.guild.roles.cache.get(roleToAddId);
        if (!roleToAdd) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Configuration Error__\n\n` +
                                `> ${emojis.star || ''} **__Role for \`${type}\` warning not found.__**\n` +
                                `> ${emojis.star || ''} __The role may have been deleted.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';

        await targetMember.roles.add(roleToAdd).catch(() => null);

        await Warn.create({
            guildId: message.guild.id,
            userId: targetMember.id,
            moderatorId: message.author.id,
            reason: reason,
            type: type
        });

        // ── Auto-jail on "last" warning ────────────────────────────────────────
        // Triggered automatically when type is "last" and the jail system is
        // configured via &setjail — no extra &maxwarn command required.
        // Also respects &maxwarn if a custom limit/action is configured.
        const shouldAutoJail = type === 'last' && config?.jailRoleId;
        const shouldAutoAction = (() => {
            if (!config?.maxWarnLimit || config.maxWarnLimit <= 0) return false;
            // Will be checked after counting below
            return true;
        })();

        if (shouldAutoJail || shouldAutoAction) {
            try {
                let triggerAction = null;
                let autoReason = '';

                if (shouldAutoJail) {
                    triggerAction = 'jail';
                    autoReason = 'Auto-jail: final warning issued.';
                }

                // Override with &maxwarn config if that threshold is reached
                if (shouldAutoAction) {
                    const warnCount = await Warn.countDocuments({
                        guildId: message.guild.id,
                        userId: targetMember.id,
                        active: true
                    });
                    if (warnCount >= config.maxWarnLimit) {
                        triggerAction = (config.maxWarnAction || 'kick').toLowerCase();
                        autoReason = `Auto-action: reached ${warnCount}/${config.maxWarnLimit} warnings.`;
                    }
                }

                if (triggerAction === 'jail') {
                    // Re-fetch member so roles are up to date after the warn role was added
                    await targetMember.fetch().catch(() => null);
                    if (config.jailRoleId && !targetMember.roles.cache.has(config.jailRoleId)) {
                        const savedRoles = targetMember.roles.cache
                            .filter(r => r.id !== message.guild.id)
                            .map(r => r.id);

                        await GuildSetup.create({
                            guildId: message.guild.id,
                            userId: targetMember.id,
                            type: 'jail-record',
                            savedRoles,
                            jailedBy: client.user.id,
                            reason: autoReason,
                            isActive: true,
                            jailedAt: new Date()
                        });

                        await targetMember.roles.set([config.jailRoleId]).catch(() => null);
                    }
                } else if (triggerAction === 'ban') {
                    await message.guild.members.ban(targetMember.id, { reason: autoReason }).catch(() => null);
                } else if (triggerAction === 'kick') {
                    await targetMember.kick(autoReason).catch(() => null);
                } else if (triggerAction === 'timeout') {
                    await targetMember.timeout(24 * 60 * 60 * 1000, autoReason).catch(() => null);
                }

                if (triggerAction) {
                    // Notify the channel
                    const autoContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Auto-Action Triggered__\n\n` +
                                        `> ${emojis.star || ''} **Member:** <@${targetMember.id}>\n` +
                                        `> ${emojis.star || ''} **Action:** \`${triggerAction.toUpperCase()}\`\n` +
                                        `> ${emojis.star || ''} **Reason:** ${autoReason}`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );
                    await message.channel.send({ components: [autoContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);

                    // Log to jail logs channel
                    if (triggerAction === 'jail' && config.jailLogsChannelId) {
                        const logsChannel = message.guild.channels.cache.get(config.jailLogsChannelId);
                        if (logsChannel) {
                            const timestamp = Math.floor(Date.now() / 1000);
                            const jailLogContainer = new ContainerBuilder()
                                .setAccentColor(themeColor)
                                .addSectionComponents(
                                    new SectionBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(
                                                `# ${emojis.info || ''} __Member Auto-Jailed__\n\n` +
                                                `> ${emojis.star || ''} **Member:** <@${targetMember.id}> (\`${targetMember.id}\`)\n` +
                                                `> ${emojis.star || ''} **Reason:** ${autoReason}\n` +
                                                `> ${emojis.star || ''} **Time:** <t:${timestamp}:F>`
                                            )
                                        )
                                        .setThumbnailAccessory(
                                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                        )
                                );
                            await logsChannel.send({ components: [jailLogContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                        }
                    }
                }
            } catch (autoErr) {
                console.error('[Warn Auto-Action Error]:', autoErr);
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        try {
            const serverIcon = message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL({ extension: 'png', size: 512 });

            const dmContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Warning Notice__\n\n` +
                                `> ${emojis.star || ''} **__You have been warned in__ \`${message.guild.name}\`**\n` +
                                `> ${emojis.star || ''} **__Type:__ \`${type.toUpperCase()}\`**\n` +
                                `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                `> ${emojis.star || ''} __Please follow the server rules to avoid further actions.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(serverIcon)
                        )
                );

            await targetMember.send({
                components: [dmContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (dmError) { }

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
                                    `# ${emojis.info || ''} __Member Warned__\n\n` +
                                    `> ${emojis.star || ''} **__Member:__ <@${targetMember.id}> (\`${targetMember.id}\`)**\n` +
                                    `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                    `> ${emojis.star || ''} **__Type:__ ${type}**\n` +
                                    `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                    `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**`
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
                            `## ${emojis.yes || ''} __Warning Success__\n\n` +
                            `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                            `> ${emojis.star || ''} **__Type:__ ${type}**\n` +
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
