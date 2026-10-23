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
    name: 'verifygirls',
    description: 'Verify a female member and grant them access with female role',
    usage: '+verifygirls <user_id>',
    category: 'Verification',
    aliases: ['vg', 'female'],
    requiredRoles: 'verificatorsRoleIds',

    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            const theme = await client.themeManager.getTheme(guildId);
            const emojis = theme.emojis || {};
            const themeColor = client.themeManager.getRGBColor(theme.color);
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (!guildConfig || !guildConfig.verificatorsRoleIds || !guildConfig.verifiedRoleId || !guildConfig.unverifiedRoleId || !guildConfig.femaleRoleId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Verification Not Configured__\n\n` +
                                    `> ${emojis.star || ''} **__The verification system or female role is not set up.__**\n` +
                                    `> ${emojis.star || ''} __Please use \`/setupverif\` first.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }


            const hasVerificatorRole = guildConfig.verificatorsRoleIds.some(roleId => message.member.roles.cache.has(roleId));
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
                                    `> ${emojis.star || ''} __to verify members.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const targetMember = await resolveMember(message, args[0]);
const userId = targetMember?.id;
            if (!targetMember) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __User Not Found__\n\n` +
                                    `> ${emojis.star || ''} **__Could not find a member.__**\n` +
                                    `> ${emojis.star || ''} __ID:__ \`${userId}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (!targetMember.roles.cache.has(guildConfig.unverifiedRoleId)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Already Verified__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetMember.id}> __is already verified.__**\n` +
                                    `> ${emojis.star || ''} __Or doesn't have the unverified role.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (guildConfig.suspendedUsers?.includes(targetMember.id)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Verification Blocked__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetMember.id}> __is marked as SUS.__**\n` +
                                    `> ${emojis.star || ''} __Admin removal from sus list is required before verifying.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const jailRecord = await GuildSetup.findOne({ guildId, userId: targetMember.id, type: 'jail-record', isActive: true });
            if (jailRecord || targetMember.roles.cache.has(guildConfig.jailRoleId)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Verification Blocked__\n\n` +
                                    `> ${emojis.star || ''} **<@${targetMember.id}> __is currently JAILED.__**\n` +
                                    `> ${emojis.star || ''} __They must be released from jail before verifying.__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await targetMember.roles.remove(guildConfig.unverifiedRoleId).catch(() => null);
            await targetMember.roles.add([guildConfig.verifiedRoleId, guildConfig.femaleRoleId]).catch(() => null);
            await GuildSetup.findOneAndUpdate(
                { guildId, userId: targetMember.id, type: 'verify-record' },
                {
                    jailedBy: message.author.id,
                    jailedAt: new Date(),
                    isActive: true
                },
                { upsert: true, new: true }
            );


            try {
                const themeBanner = getPanelBanner(message.guild, client);
                const welcomeContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems([
                            {
                                media: { url: themeBanner },
                                title: `Welcome to ${message.guild.name}!`,
                                subtitle: 'You have been verified as a female member'
                            }
                        ])
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `### ${emojis.yes || ''} __Verification Successful!__\n\n` +
                                    `> ${emojis.star || ''} **__Your access has been unlocked in__ \`${message.guild.name}\`**\n` +
                                    `> ${emojis.star || ''} __Welcome to the community!__`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png' }) || client.user.displayAvatarURL())
                            )
                    );

                await targetMember.send({ components: [welcomeContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
            } catch (dmError) { }

            // Logs
            if (guildConfig.verifyLogChannelId) {
                const logsChannel = message.guild.channels.cache.get(guildConfig.verifyLogChannelId);
                if (logsChannel) {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const logContainer = new ContainerBuilder()
                        .setAccentColor(themeColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Female Member Verified__\n\n` +
                                        `> ${emojis.star || ''} **__Member:__ <@${targetMember.id}> (\`${targetMember.id}\`)**\n` +
                                        `> ${emojis.star || ''} **__Verified By:__ <@${message.author.id}> (\`${message.author.id}\`)**\n` +
                                        `> ${emojis.star || ''} **__Type:__ Girl**\n` +
                                        `> ${emojis.star || ''} **__Time:__ <t:${timestamp}:F>**`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
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
                                `## ${emojis.yes || ''} __Verification Complete__\n\n` +
                                `> ${emojis.star || ''} **__Successfully verified__ <@${targetMember.id}>**\n` +
                                `> ${emojis.star || ''} __Member and Female roles have been granted.__`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('[VerifyGirls] Error:', error);
            return message.reply("An error occurred during verification.");
        }
    }
};
