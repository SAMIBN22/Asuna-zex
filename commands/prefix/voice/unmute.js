import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import { logAction } from '../../../lib/modLog.js';

export default {
    name: 'unmute',
    aliases: ['vcunmute', 'voiceunmutex', 'serverunmute'],
    description: 'Remove server-mute from a member in voice',
    category: 'Voice',
    usage: '&unmute <@user|ID> [reason]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Permission Denied__\n` +
                                        `> ${emojis.star || ''} You need **Mute Members** permission.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&unmute <@user|ID> [reason]\`**`
                            )
                        )
                ]
            });
        }

        const query = args[0].replace(/[<@!>]/g, '');
        const target = message.guild.members.cache.get(query) ||
            message.guild.members.cache.find(m => m.user.username.toLowerCase() === args[0].toLowerCase());

        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} Could not find member: \`${args[0]}\``
                            )
                        )
                ]
            });
        }

        if (!target.voice.channel) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Not in Voice__\n` +
                                        `> ${emojis.star || ''} **${target.displayName}** is not in a voice channel.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        if (!target.voice.serverMute) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Not Muted__\n` +
                                        `> ${emojis.star || ''} **${target.displayName}** is not server-muted.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.voice.setMute(false, reason);
            await logAction(message.guild.id, target.id, message.author.id, 'unmute', reason);

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Voice Unmuted__`)
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${target.displayName}\n` +
                                        `> ${emojis.star || ''} **Action:** Server Unmuted \n` +
                                        `> ${emojis.star || ''} **Moderator:** ${message.author.toString()}\n` +
                                        `> ${emojis.star || ''} **Channel:** ${target.voice.channel.name}\n` +
                                        `> ${emojis.star || ''} **Reason:** ${reason}`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        } catch (err) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} Could not unmute **${target.displayName}**: ${err.message}`
                            )
                        )
                ]
            });
        }
    }
};
