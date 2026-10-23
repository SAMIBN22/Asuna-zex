import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import { getLogs } from '../../../lib/modLog.js';
import emojis from '../../emojis.js';

export default {
    name: 'mutelog',
    aliases: ['mutelog'],
    description: 'View all mute-related actions taken on a user',
    usage: '&mutelog <@user|ID>',
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
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&mutelog <@user|ID>\`**`
                            )
                        )
                ]
            });
        }

        const target = await client.users.fetch(targetId).catch(() => null);
        const muteEntries = await getLogs(message.guild.id, targetId, 'mute');
        const unmuteEntries = await getLogs(message.guild.id, targetId, 'unmute');
        const entries = [...muteEntries, ...unmuteEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!entries.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `### ${emojis.yes || ''} __No Mute History__\n> ${emojis.star || ''} <@${targetId}> has no mute-related actions.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL((target || client.user).displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const lines = entries.slice(0, 10).map((e) => {
            const date = `<t:${Math.floor(new Date(e.date).getTime() / 1000)}:d>`;
            const icon = e.type === 'mute' ? '' : '';
            return `> ${emojis.star || icon} **\`${e.type}\`** — ${e.reason} · by <@${e.moderatorId}> · ${date}`;
        }).join('\n');

        const overflow = entries.length > 10 ? `\n> *...and ${entries.length - 10} more entries*` : '';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Mute Log__\n\n` +
                                    `> ${emojis.star || ''} **Member:** <@${targetId}>\n\n${lines}${overflow}`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL((target || client.user).displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
