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
import { getPanelBanner } from '../../../utils/panelBanner.js';

export default {
    name: 'jail',
    description: 'Jail a member and remove their roles',
    usage: '+jail <user_id/mention> [reason]',
    category: 'Jail',
    aliases: ['habs'],
    requiredRoles: 'jailerRoleId',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const guildConfig = await GuildConfig.findOne({ guildId });

        if (!guildConfig?.jailRoleId) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __System Not Configured__\n\n` +
                                `> ${emojis.star || ''} **__The Jail system is not fully configured.__**\n` +
                                `> ${emojis.star || ''} __Use \`${client.config.prefix}setjail\` to configure it.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

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
                                `> ${emojis.star || ''} **__Cannot jail this member.__**\n` +
                                `> ${emojis.star || ''} __Their role is higher or equal to yours.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                `> ${emojis.star || ''} **__Cannot jail this member.__**\n` +
                                `> ${emojis.star || ''} __Their role is higher or equal to mine.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const existingRecord = await GuildSetup.findOne({ guildId, userId: targetId, type: 'jail-record', isActive: true });
        if (existingRecord || targetMember.roles.cache.has(guildConfig.jailRoleId)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Already Jailed__\n\n` +
                                `> ${emojis.star || ''} **<@${targetId}> __is already jailed.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const savedRoles = targetMember.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.id);

        await GuildSetup.create({
            guildId,
            userId: targetId,
            type: 'jail-record',
            savedRoles,
            jailedBy: message.author.id,
            reason,
            isActive: true,
            jailedAt: new Date()
        });

        await targetMember.roles.set([guildConfig.jailRoleId]).catch(() => null);

        try {
            const themeBanner = getPanelBanner(message.guild, client);
            const serverIcon = message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL({ extension: 'png', size: 512 });

            const jailDM = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        item => item
                            .setURL(themeBanner)
                            .setDescription(`Jail Notice: ${reason}`)
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Jail Notice__\n\n` +
                                `> ${emojis.star || ''} **__You have been jailed in__ \`${message.guild.name}\`**\n` +
                                `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                `> ${emojis.star || ''} __Contact staff if you believe this is a mistake.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(serverIcon)
                        )
                );

            await targetMember.send({
                components: [jailDM],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (dmError) { }

        if (guildConfig.jailLogsChannelId) {
            const logsChannel = message.guild.channels.cache.get(guildConfig.jailLogsChannelId);
            if (logsChannel) {
                const timestamp = Math.floor(Date.now() / 1000);
                const logContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Member Jailed__\n\n` +
                                    `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
                                    `> ${emojis.star || ''} **__Moderator:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                    `> ${emojis.star || ''} **__Reason:__ ${reason}**\n` +
                                    `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**\n` +
                                    `> ${emojis.star || ''} **__Roles Removed:__ \`${savedRoles.length}\` roles**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                await logsChannel.send({
                    components: [logContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.yes || ''} __Jail Success__\n\n` +
                            `> ${emojis.star || ''} **__Member:__ <@${targetId}> (\`${targetId}\`)**\n` +
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
