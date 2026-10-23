import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: 'unjail',
    description: 'Release a member from jail and optionally restore their roles',
    usage: '+unjail <user_id/mention>',
    category: 'Jail',
    requiredRoles: 'jailerRoleId',
    aliases: ['uj', 'unhabs'],

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const guildConfig = await GuildConfig.findOne({ guildId });
            const isHammer = guildConfig?.jailerRoleId?.some(id => message.member.roles.cache.has(id));
            const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isAdmin && !isHammer) {
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
                                    `> ${emojis.star || ''} **__Could not find that member.__**\n` +
                                    `> ${emojis.star || ''} __Please provide a valid mention or ID.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            // Look up the active jail record
            const record = await GuildSetup.findOne({ guildId, userId: targetId, type: 'jail-record', isActive: true });

            if (!record && !targetMember.roles.cache.has(guildConfig?.jailRoleId)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Not Jailed__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetId}> __is not currently jailed.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            // Remove the jail role
            if (guildConfig?.jailRoleId) {
                await targetMember.roles.remove(guildConfig.jailRoleId).catch(() => null);
            }

            // Restore basic roles (e.g. a "Member" role configured by the server)
            const basicRolesToRestore = guildConfig?.jailBasicRoles || [];
            if (basicRolesToRestore.length > 0) {
                await targetMember.roles.add(basicRolesToRestore).catch(() => null);
            }

            // Mark jail record inactive
            if (record) {
                record.isActive = false;
                record.unjailedBy = message.author.id;
                record.unjailedAt = new Date();
                await record.save();
            }

            // Log to jail logs channel if configured
            if (guildConfig?.jailLogsChannelId) {
                const logsChannel = message.guild.channels.cache.get(guildConfig.jailLogsChannelId);
                if (logsChannel?.isTextBased?.()) {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const logContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `# ${emojis.info || ''} __Member Released__\n\n` +
                                        `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                        `> ${emojis.star || ''} **__Released by:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                        `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );
                    await logsChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                }
            }

            // If no saved roles exist, skip the restore prompt and finish immediately
            const hasSavedRoles = record?.savedRoles?.length > 0;
            if (!hasSavedRoles) {
                const doneContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Unjail Complete__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetId}> __has been released from jail.__**\n` +
                                    `> ${emojis.star || ''} __No saved roles to restore.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [doneContainer], flags: MessageFlags.IsComponentsV2 });
            }

            // Ask whether to restore saved roles
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`yes_restore_${targetId}_${message.author.id}`)
                    .setLabel('Restore Roles')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`no_restore_${targetId}_${message.author.id}`)
                    .setLabel('Skip')
                    .setStyle(ButtonStyle.Secondary)
            );

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Member Released__\n\n` +
                                `> ${emojis.star || ''} **<@${targetId}> __has been released from jail.__**\n` +
                                `> ${emojis.star || ''} __Would you like to restore their previous roles?__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder());

            const response = await message.reply({
                components: [container, row],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (i) => {
                if (!i.isButton()) return;

                // Re-check member is still in server
                const currentMember = await message.guild.members.fetch(targetId).catch(() => null);
                if (!currentMember) {
                    return i.reply({ content: 'Member is no longer in the server.', ephemeral: true });
                }

                if (i.customId === `yes_restore_${targetId}_${message.author.id}`) {
                    const dangerousPerms = [
                        PermissionFlagsBits.Administrator,
                        PermissionFlagsBits.ManageWebhooks,
                        PermissionFlagsBits.ManageGuild,
                        PermissionFlagsBits.ManageRoles,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.BanMembers,
                        PermissionFlagsBits.KickMembers,
                        PermissionFlagsBits.ManageMessages
                    ];

                    const rolesToRestore = record?.savedRoles || [];
                    const filteredRoles = [];

                    for (const roleId of rolesToRestore) {
                        if (basicRolesToRestore.includes(roleId)) continue;
                        const role = message.guild.roles.cache.get(roleId);
                        if (!role) continue;
                        const hasDangerous = dangerousPerms.some(perm => role.permissions.has(perm));
                        if (!hasDangerous && role.id !== message.guild.id) {
                            filteredRoles.push(roleId);
                        }
                    }

                    if (filteredRoles.length > 0) {
                        await currentMember.roles.add(filteredRoles).catch(() => null);
                    }

                    const successContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Roles Restored__\n\n` +
                                        `> ${emojis.star || ''} **__Roles restored for:__ <@${targetId}>**\n` +
                                        `> ${emojis.star || ''} __Total restored:__ \`${filteredRoles.length + basicRolesToRestore.length}\``
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(currentMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );

                    await i.update({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
                } else if (i.customId === `no_restore_${targetId}_${message.author.id}`) {
                    const cancelContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Unjail Complete__\n\n` +
                                        `> ${emojis.star || ''} **__Member released.__**\n` +
                                        `> ${emojis.star || ''} __Only basic roles were restored.__`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(currentMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );
                    await i.update({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
                }
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await response.edit({ components: [container] }).catch(() => null);
                }
            });
        } catch (error) {
            console.error('[Unjail] Error:', error);
            return message.reply("An error occurred during unjail.");
        }
    }
};
