import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import GuildSetup from '../../../models/guildSetup.js';

export default {
    name: 'unsus',
    description: 'Remove a member from the suspicious list',
    usage: '+unsus <user_id>',
    category: 'Verification',
    requiredRoles: 'verificatorsRoleIds',

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const config = await GuildConfig.findOne({ guildId });
            if (!config || !config.verificatorsRoleIds) {
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
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (!args[0]) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __How To Use__\n\n` +
                                    `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}unsus\` \`user\`\n` +
                                    `> ${emojis.star || ''} __Please provide a valid user mention or ID.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            }

            const targetMember = await resolveMember(message, args[0]);
            const targetId = targetMember?.id || args[0].replace(/[<@!>]/g, '');
            try {
                if (targetMember) {
                    const dmContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `### ${emojis.yes || ''} __Account Unflagged__\n\n` +
                                        `> ${emojis.star || ''} **__Your account has been removed from the SUS list.__**\n` +
                                        `> ${emojis.star || ''} **__Server:__ \`${message.guild.name}\`**\n` +
                                        `> ${emojis.star || ''} __You can now interact with the server normally.__`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png' }) || client.user.displayAvatarURL())
                                )
                        );

                    await targetMember.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                }
            } catch (dmError) { }

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
                                        `## ${emojis.yes || ''} __Member Unflagged (UNSUS)__\n\n` +
                                        `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                        `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                        `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember ? targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }) : client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );

                    await logsChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                }
            }

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Member Unflagged__\n\n` +
                                `> ${emojis.star || ''} **__Member:__ <@${targetId}>**\n` +
                                `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}>**\n\n` +
                                `**Do you want to restore the roles they had before?**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember ? targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }) : client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`restore_roles_${targetId}_${message.author.id}`)
                    .setLabel('Restore Roles')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`no_restore_${targetId}_${message.author.id}`)
                    .setLabel('Keep as is')
                    .setStyle(ButtonStyle.Danger)
            );

            container.addActionRowComponents(row);

            const response = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000,
                max: 1
            });

            collector.on('collect', async i => {
                if (i.customId.startsWith('restore_roles_')) {
                    if (!targetMember) return i.reply({ content: "Member is no longer in the server.", ephemeral: true });

                    const rolesToRestore = record?.savedRoles || [];
                    const filteredRoles = rolesToRestore.filter(id => {
                        const role = message.guild.roles.cache.get(id);
                        return role && role.position < message.guild.members.me.roles.highest.position && !role.managed;
                    });

                    if (filteredRoles.length > 0) {
                        await targetMember.roles.add(filteredRoles).catch(() => null);
                    }

                    const successContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Action Complete__\n\n` +
                                        `> ${emojis.star || ''} **__Roles restored for:__ <@${targetId}>**\n` +
                                        `> ${emojis.star || ''} __Total restored:__ \`${filteredRoles.length}\``
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );

                    await i.update({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (i.customId.startsWith('no_restore_')) {
                    const cancelContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Action Complete__\n\n` +
                                        `> ${emojis.star || ''} **<@${targetId}> __remains unflagged.__**\n` +
                                        `> ${emojis.star || ''} __No role restoration was performed.__`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember ? targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }) : client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                )
                        );

                    await i.update({
                        components: [cancelContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    try {
                        const timeoutContainer = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `## ${emojis.info || ''} __Action Timed Out__\n\n` +
                                            `> ${emojis.star || ''} **<@${targetId}> __was unflagged.__**\n` +
                                            `> ${emojis.star || ''} __No role restoration was performed.__`
                                        )
                                    )
                                    .setThumbnailAccessory(
                                        new ThumbnailBuilder().setURL(targetMember ? targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }) : client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                                    )
                            );
                        await response.edit({ components: [timeoutContainer] }).catch(() => null);
                    } catch (err) { }
                }
            });

        } catch (error) {
            console.error('[Unsus] Error:', error);
            return message.reply("An error occurred during unsus.");
        }
    }
};
