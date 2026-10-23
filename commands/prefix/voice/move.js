import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits,
    PermissionsBitField
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import { logAction } from '../../../lib/modLog.js';

export default {
    name: 'move',
    description: 'Move a member to your current voice channel',
    usage: '+move <user_id/mention>',
    category: 'Voice',
    aliases: ['m', 'drag', 'vmove'],

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

        const targetMember = await resolveMember(message, args[0]);
const targetId = targetMember?.id;
        if (!targetMember) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Member Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that member.__**\n` +
                                `> ${emojis.star || ''} **__Please check the ID or mention.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const authorVoiceChannel = message.member.voice.channel;
        if (!authorVoiceChannel) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__You must be in a voice channel__**\n` +
                                `> ${emojis.star || ''} **__to move someone to it.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
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
                                `> ${emojis.star || ''} **__The member <@${targetId}> is not__**\n` +
                                `> ${emojis.star || ''} **__connected to a voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (targetMember.voice.channel.id === authorVoiceChannel.id) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Voice Error__\n\n` +
                                `> ${emojis.star || ''} **__The member <@${targetId}> is already__**\n` +
                                `> ${emojis.star || ''} **__in your voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!authorVoiceChannel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.Connect)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Channel Error__\n\n` +
                                `> ${emojis.star || ''} **__I do not have permission to__**\n` +
                                `> ${emojis.star || ''} **__connect to your voice channel.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await targetMember.voice.setChannel(authorVoiceChannel);
            await logAction(guildId, targetId, message.author.id, 'move', `Moved to ${authorVoiceChannel.name}`);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Move Success__\n\n` +
                                `> ${emojis.star || ''} **__Successfully moved <@${targetId}>__**\n` +
                                `> ${emojis.star || ''} **__To ${authorVoiceChannel.name}__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('[Move Command Error]:', error);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Move Error__\n\n` +
                                `> ${emojis.star || ''} **__Failed to move user:__**\n` +
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
