import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import Warn from '../../../models/warn.js';
import { clearLogs } from '../../../lib/modLog.js';
import emojis from '../../emojis.js';

export default {
    name: 'resetlogs',
    aliases: ['clearlogs', 'deletelogs', 'resetuserlogs', 'resetuserlog'],
    description: 'Reset all action logs for a user',
    usage: '&resetlogs <@user|ID>',
    category: 'BotManage',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&resetlogs <@user|ID>\`**`
                            )
                        )
                ]
            });
        }

        const modLogCount = await clearLogs(message.guild.id, targetId);
        const warnResult = await Warn.deleteMany({ guildId: message.guild.id, userId: targetId });

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Logs Reset__\n` +
                                    `> ${emojis.star || ''} **Member:** <@${targetId}>\n` +
                                    `> ${emojis.star || ''} **Action Logs Removed:** \`${modLogCount}\`\n` +
                                    `> ${emojis.star || ''} **Warnings Removed:** \`${warnResult.deletedCount || 0}\``
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
