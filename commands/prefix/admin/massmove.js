import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import { logAction } from '../../../lib/modLog.js';

export default {
    name: 'massmove',
    aliases: ['massmoveuser', 'massmove', 'mmove'],
    description: 'Mass Move A User from channel to another channel',
    usage: '&massmove <#fromChannel> <#toChannel>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const fromId = args[0]?.replace(/[<#>]/g, '');
        const toId = args[1]?.replace(/[<#>]/g, '');
        const fromChannel = message.guild.channels.cache.get(fromId);
        const toChannel = message.guild.channels.cache.get(toId);

        if (!fromChannel || !toChannel || fromChannel.type !== ChannelType.GuildVoice || toChannel.type !== ChannelType.GuildVoice) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&massmove <#fromChannel> <#toChannel>\`**\n> ${emojis.star || ''} Both channels must be voice channels.`
                            )
                        )
                ]
            });
        }

        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        const blacklist = new Set(config?.moveBlacklist || []);

        let moved = 0, skipped = 0;
        for (const [, member] of fromChannel.members) {
            if (blacklist.has(member.id)) {
                skipped++;
                continue;
            }
            await member.voice.setChannel(toChannel).then(() => moved++).catch(() => skipped++);
        }

        await logAction(message.guild.id, 'bulk', message.author.id, 'massmove', `${fromChannel.name} -> ${toChannel.name}`);

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Mass Move Complete__\n` +
                                    `> ${emojis.star || ''} **From:** ${fromChannel}\n` +
                                    `> ${emojis.star || ''} **To:** ${toChannel}\n` +
                                    `> ${emojis.star || ''} **Moved:** \`${moved}\`\n` +
                                    `> ${emojis.star || ''} **Skipped:** \`${skipped}\` (blacklisted or failed)`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
