import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits, ChannelType
} from 'discord.js';

export default {
    name: 'vcstatus',
    aliases: ['setstatus', 'voicestatus', 'vostatus', 'channelstatus'],
    description: 'Set or clear a status for a voice channel',
    category: 'Voice',
    usage: '&setstatus [status text] — leave blank to clear',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers) &&
            !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Permission Denied__\n` +
                                        `> ${emojis.star || ''} You need **Mute Members** or **Manage Channels** permission.`
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

        const vc = message.member.voice.channel;
        if (!vc) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Not in Voice__\n` +
                                `> ${emojis.star || ''} You must be in a voice channel to set its status.`
                            )
                        )
                ]
            });
        }

        if (vc.type !== ChannelType.GuildVoice && vc.type !== ChannelType.GuildStageVoice) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Invalid Channel__\n` +
                                `> ${emojis.star || ''} This command only works in regular voice channels.`
                            )
                        )
                ]
            });
        }

        const statusText = args.join(' ').trim().slice(0, 500);
        const isClearing = !statusText;

        try {
            // Discord API: set voice channel status
            await fetch(`https://discord.com/api/v10/channels/${vc.id}/voice-status`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bot ${client.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: statusText || null })
            });

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Voice Channel Status__`)
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${vc.name}\n` +
                                        `> ${emojis.star || ''} **Action:** ${isClearing ? 'Status Cleared ' : 'Status Updated '}\n` +
                                        `> ${emojis.star || ''} **Set by:** ${message.author.toString()}\n` +
                                        (isClearing ? '' : `> ${emojis.star || ''} **Status:** ${statusText}`)
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL())
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
                                `## ${emojis.info || ''} __Failed__\n` +
                                `> ${emojis.star || ''} Could not update voice channel status.\n` +
                                `> ${emojis.star || ''} Make sure the bot has the required permissions.`
                            )
                        )
                ]
            });
        }
    }
};
