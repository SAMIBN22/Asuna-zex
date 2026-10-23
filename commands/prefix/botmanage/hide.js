import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits, OverwriteType
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'hide',
    aliases: ['hidechannel', 'hchannel', 'privatize'],
    description: 'Hide a channel from @everyone (or unhide it)',
    category: 'BotManage',
    usage: '&hide [#channel]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Manage Channels** permission.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )],
                allowedMentions: { parse: [] }
            });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const everyoneRole = message.guild.roles.everyone;
        const currentPerm = channel.permissionOverwrites.cache.get(everyoneRole.id);
        const isHidden = currentPerm?.deny.has(PermissionFlagsBits.ViewChannel);

        try {
            if (isHidden) {
                // Unhide
                await channel.permissionOverwrites.edit(everyoneRole, {
                    ViewChannel: null
                });
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accentColor)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Channel Unhidden__`))
                            .addSeparatorComponents(new SeparatorBuilder())
                            .addSectionComponents(new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${channel.name}\n` +
                                    `> ${emojis.star || ''} **Status:**  Visible to @everyone\n` +
                                    `> ${emojis.star || ''} **Action by:** ${message.author.toString()}`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                            )
                    ],
                    allowedMentions: { parse: [] }
                });
            } else {
                // Hide
                await channel.permissionOverwrites.edit(everyoneRole, {
                    ViewChannel: false
                });
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accentColor)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Channel Hidden__`))
                            .addSeparatorComponents(new SeparatorBuilder())
                            .addSectionComponents(new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${channel.name}\n` +
                                    `> ${emojis.star || ''} **Status:**  Hidden from @everyone\n` +
                                    `> ${emojis.star || ''} **Action by:** ${message.author.toString()}\n` +
                                    `> ${emojis.star || ''} **Tip:** Use \`&hide ${channel.toString()}\` again to unhide.`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                            )
                    ],
                    allowedMentions: { parse: [] }
                });
            }
        } catch (err) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} ${err.message}`
                    ))]
            });
        }
    }
};
