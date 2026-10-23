import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import emojis from '../../emojis.js';

const VALID_ACTIONS = ['timeout', 'kick', 'ban', 'jail'];

export default {
    name: 'maxwarn',
    aliases: ['warnlimit', 'maxwarnings', 'setwarnlimit'],
    description: 'Configure the max warnings limit and auto-action',
    category: 'BotManage',
    usage: '&maxwarn <limit> <action: timeout|kick|ban|jail>  |  &maxwarn off  |  &maxwarn view',

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
            const limit = config?.maxWarnLimit || 0;
            const action = config?.maxWarnAction || 'kick';
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Max Warn Configuration__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${message.guild.name}\n` +
                                `> ${emojis.star || ''} **Status:** ${limit > 0 ? ' Enabled' : ' Disabled'}\n` +
                                `> ${emojis.star || ''} **Limit:** ${limit > 0 ? `\`${limit} warnings\`` : 'Not configured'}\n` +
                                `> ${emojis.star || ''} **Action:** \`${action}\`\n\n` +
                                `> ${emojis.star || ''} **Usage:** \`&maxwarn <limit> <action>\`\n` +
                                `> ${emojis.star || ''} **Actions:** \`timeout\` \`kick\` \`ban\` \`jail\`\n` +
                                `> ${emojis.star || ''} **Disable:** \`&maxwarn off\``
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        // OFF
        if (args[0].toLowerCase() === 'off') {
            await GuildConfig.findOneAndUpdate(
                { guildId: message.guild.id },
                { maxWarnLimit: 0, maxWarnAction: 'kick' },
                { upsert: true }
            );
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.yes || ''} __Max Warn Disabled__\n> ${emojis.star || ''} The max warnings system has been turned off.`
                    ))]
            });
        }

        // SET
        const limit = parseInt(args[0]);
        const action = args[1]?.toLowerCase();

        if (isNaN(limit) || limit < 1 || limit > 100) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Limit__\n> ${emojis.star || ''} Limit must be a number between \`1\` and \`100\`.`
                    ))]
            });
        }

        if (!action || !VALID_ACTIONS.includes(action)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Action__\n> ${emojis.star || ''} Valid actions: \`timeout\` \`kick\` \`ban\` \`jail\``
                    ))]
            });
        }

        await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { maxWarnLimit: limit, maxWarnAction: action },
            { upsert: true }
        );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Max Warn Configured__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${message.guild.name}\n` +
                            `> ${emojis.star || ''} **Limit:** \`${limit} warnings\`\n` +
                            `> ${emojis.star || ''} **Action:** \`${action}\`\n` +
                            `> ${emojis.star || ''} **Status:**  Enabled\n` +
                            `> ${emojis.star || ''} Members will receive **${action}** upon reaching **${limit}** warnings.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
