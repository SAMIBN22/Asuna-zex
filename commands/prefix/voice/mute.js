import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import { logAction } from '../../../lib/modLog.js';

export default {
    name: 'mute',
    aliases: ['vcmute', 'voicemute', 'servermute'],
    description: 'Server-mute a member in their voice channel',
    category: 'Voice',
    usage: '&mute <@user|ID> [reason]',

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
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&mute <@user|ID> [reason]\`**`
                            )
                        )
                ],
                allowedMentions: { parse: [] }
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

        if (target.voice.serverMute) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Already Muted__\n` +
                                        `> ${emojis.star || ''} **${target.displayName}** is already server-muted.\n` +
                                        `> ${emojis.star || ''} Use \`&unmute\` to unmute them.`
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
            await target.voice.setMute(true, reason);
            await logAction(message.guild.id, target.id, message.author.id, 'mute', reason);

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Voice Muted__`)
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${target.displayName}\n` +
                                        `> ${emojis.star || ''} **Action:** Server Muted \n` +
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
                                `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} Could not mute **${target.displayName}**: ${err.message}`
                            )
                        )
                ]
            });
        }
    }
};
