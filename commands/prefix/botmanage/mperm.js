import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'mperm',
    aliases: ['memberperm', 'channelperm', 'toggleperm'],
    description: 'Toggle a member or role\'s ViewChannel + SendMessages permission in a channel',
    category: 'BotManage',
    usage: '&mperm <@member|ID|@role|ID> [#channel|ID]',
    cooldown: 60,

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

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n` +
                        `> ${emojis.star || ''} **\`&mperm <@member|ID|@role|ID> [#channel|ID]\`**\n` +
                        `> ${emojis.star || ''} **Example:** \`&mperm @user #general\`\n` +
                        `> ${emojis.star || ''} If no channel is specified, the current channel is used.`
                    ))]
            });
        }

        // Resolve target (member or role)
        const targetRaw = args[0].replace(/[<@!&>]/g, '');
        let target = message.guild.members.cache.get(targetRaw) ||
            message.guild.roles.cache.get(targetRaw) ||
            message.mentions.members.first() ||
            message.mentions.roles.first() ||
            message.guild.roles.cache.find(r => r.name.toLowerCase() === args[0].toLowerCase());

        if (!target) {
            target = await message.guild.members.fetch(targetRaw).catch(() => null);
        }

        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Not Found__\n> ${emojis.star || ''} Could not find member or role: \`${args[0]}\``
                    ))]
            });
        }

        // Resolve channel
        const channelArg = args[1];
        let channel = message.mentions.channels.first() || message.channel;
        if (channelArg) {
            const chId = channelArg.replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(chId) || message.channel;
        }

        const isRole = target.constructor.name === 'Role' || target.hasOwnProperty('permissions');
        const resolvedTarget = isRole ? target : target;
        const currentOverwrite = channel.permissionOverwrites.cache.get(target.id || target.user?.id);
        const hasView = currentOverwrite?.allow.has(PermissionFlagsBits.ViewChannel);

        try {
            if (hasView) {
                // Remove permissions (deny)
                await channel.permissionOverwrites.edit(target, {
                    ViewChannel: false,
                    SendMessages: false
                });
            } else {
                // Grant permissions
                await channel.permissionOverwrites.edit(target, {
                    ViewChannel: true,
                    SendMessages: true
                });
            }

            const targetName = isRole ? `@${target.name}` : target.displayName || target.user?.username;
            const action = hasView ? ' Permissions Removed' : ' Permissions Granted';

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Permission Toggled__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${targetName}\n` +
                                `> ${emojis.star || ''} **Channel:** ${channel.toString()}\n` +
                                `> ${emojis.star || ''} **Action:** ${action}\n` +
                                `> ${emojis.star || ''} **Permissions:** View Channel + Send Messages\n` +
                                `> ${emojis.star || ''} **Set by:** ${message.author.toString()}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(
                                isRole
                                    ? (message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL())
                                    : target.user?.displayAvatarURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()
                            ))
                        )
                ],
                allowedMentions: { parse: [] }
            });
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
