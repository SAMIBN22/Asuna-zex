import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import emojis from '../../emojis.js';

const VALID_TYPES = ['kick', 'ban', 'timeout'];

export default {
    name: 'setlimit',
    aliases: ['modlimit', 'actionlimit', 'daylimit'],
    description: 'Set daily server-wide limits for moderation actions',
    category: 'BotManage',
    usage: '&setlimit <kick|ban|timeout> <number>  |  &setlimit view',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Administrator** permission.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )],
                allowedMentions: { parse: [] }
            });
        }

        const config = await GuildConfig.findOne({ guildId: message.guild.id });

        // VIEW
        if (!args[0] || args[0].toLowerCase() === 'view') {
            const kick = config?.dailyKickLimit || 0;
            const ban = config?.dailyBanLimit || 0;
            const timeout = config?.dailyTimeoutLimit || 0;

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Daily Moderation Limits__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${message.guild.name}\n` +
                                `> ${emojis.star || ''} **Kick:** ${kick === 0 ? '`0` *(disabled)*' : `\`${kick} per day\``}\n` +
                                `> ${emojis.star || ''} **Ban:** ${ban === 0 ? '`0` *(disabled)*' : `\`${ban} per day\``}\n` +
                                `> ${emojis.star || ''} **Timeout:** ${timeout === 0 ? '`0` *(disabled)*' : `\`${timeout} per day\``}\n\n` +
                                `> ${emojis.star || ''} **Usage:** \`&setlimit <kick|ban|timeout> <0-1000>\`\n` +
                                `> ${emojis.star || ''} Set to \`0\` to disable. Range: \`0–1000\``
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const type = args[0].toLowerCase();
        const limit = parseInt(args[1]);

        if (!VALID_TYPES.includes(type)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Type__\n> ${emojis.star || ''} Valid types: \`kick\` \`ban\` \`timeout\``
                    ))]
            });
        }

        if (isNaN(limit) || limit < 0 || limit > 1000) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Number__\n> ${emojis.star || ''} Limit must be between \`0\` and \`1000\`. Set to \`0\` to disable.`
                    ))]
            });
        }

        const fieldMap = { kick: 'dailyKickLimit', ban: 'dailyBanLimit', timeout: 'dailyTimeoutLimit' };
        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { [fieldMap[type]]: limit },
            { upsert: true }
        );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Limit Updated__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${type.charAt(0).toUpperCase() + type.slice(1)} Limit\n` +
                            `> ${emojis.star || ''} **New Limit:** ${limit === 0 ? '`Disabled`' : `\`${limit} per day\``}\n` +
                            `> ${emojis.star || ''} **Set by:** ${message.author.toString()}\n` +
                            `> ${emojis.star || ''} **Status:** ${limit === 0 ? ' Disabled' : ' Active'}`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
