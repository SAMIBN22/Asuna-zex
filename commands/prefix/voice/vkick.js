import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'vkick',
    aliases: ['voicekick', 'vk', 'vckick', 'voicek', 'vcreject'],
    description: 'Kick a user from the voice channel',
    category: 'Voice',
    usage: '+vkick <user>',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Move Members permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Move Members permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}vkick <@user>\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}vkick ${message.author.id}\``
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
                                `# ${emojis.info || ''} __Member Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that member.__**\n` +
                                `> ${emojis.star || ''} **__They may not be in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (targetId === message.author.id) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Target Error__\n\n` +
                                `> ${emojis.star || ''} **__You cannot kick yourself__**\n` +
                                `> ${emojis.star || ''} **__from the voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!targetMember.voice.channel) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__This user <@${targetId}> is not__**\n` +
                                `> ${emojis.star || ''} **__connected to any voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
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
                                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                `> ${emojis.star || ''} **__I cannot kick this member because__**\n` +
                                `> ${emojis.star || ''} **__their role is higher or equal to mine.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await targetMember.voice.disconnect();
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Kick Success__\n\n` +
                                `> ${emojis.star || ''} **__Successfully kicked <@${targetId}>__**\n` +
                                `> ${emojis.star || ''} **__from the voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('[VKick Command Error]:', error);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Action Failed__\n\n` +
                                `> ${emojis.star || ''} **__Failed to kick user:__**\n` +
                                `> ${emojis.star || ''} **__${error.message}__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
