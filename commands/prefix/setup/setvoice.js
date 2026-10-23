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

export default {
    name: 'setvoice',
    aliases: ['setvc'],
    description: 'Manage the voice channel for the bot to join on ready in this guild',
    usage: '&setvoice <#channel|off>',
    category: 'Setup',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            const config = await GuildConfig.findOne({ guildId: message.guild.id });
            const current = config?.botJoinVoiceChannelId ? `<#${config.botJoinVoiceChannelId}>` : '`Not set`';
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&setvoice <#channel|off>\`**\n> ${emojis.star || ''} **Current:** ${current}`
                            )
                        )
                ]
            });
        }

        if (args[0].toLowerCase() === 'off') {
            await GuildConfig.findOneAndUpdate(
                { guildId: message.guild.id },
                { $set: { botJoinVoiceChannelId: null } },
                { upsert: true, strict: false }
            );
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Disabled__\n> ${emojis.star || ''} The bot will no longer auto-join a voice channel on startup.`
                            )
                        )
                ]
            });
        }

        const channelId = args[0].replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Invalid Channel__\n> ${emojis.star || ''} Please provide a valid voice channel.`
                            )
                        )
                ]
            });
        }

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $set: { botJoinVoiceChannelId: channel.id } },
            { upsert: true, strict: false }
        );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Voice Channel Set__\n` +
                                    `> ${emojis.star || ''} **Channel:** ${channel}\n` +
                                    `> ${emojis.star || ''} The bot will join this channel automatically when it comes online.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ]
        });
    }
};
