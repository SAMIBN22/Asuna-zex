import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import { getLogs } from '../../../lib/modLog.js';
import { startColorCycle, CYCLE_COLORS } from '../../../utils/colorCycler.js';

export default {
    name: 'userlogs',
    aliases: ['logs'],
    description: 'View all actions taken on a user',
    usage: '&userlogs <@user|ID>',
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
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&userlogs <@user|ID>\`**`
                            )
                        )
                ]
            });
        }

        const target = await client.users.fetch(targetId).catch(() => null);
        const entries = await getLogs(message.guild.id, targetId);

        if (!entries.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `### ${emojis.yes || ''} __No Logged Actions__\n> ${emojis.star || ''} <@${targetId}> has no recorded actions.`
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
            return `> ${emojis.star || ''} **\`${e.type}\`** — ${e.reason} · by <@${e.moderatorId}> · ${date}`;
        }).join('\n');

        const overflow = entries.length > 10 ? `\n> *...and ${entries.length - 10} more entries*` : '';

        const avatarURL = (target || client.user).displayAvatarURL({ extension: 'png', size: 256 });
        const content   =
            `# ${emojis.title || ''} __Action Logs__\n\n` +
            `> ${emojis.star || ''} **Member:** <@${targetId}>\n` +
            `> ${emojis.star || ''} **Total Entries:** \`${entries.length}\`\n\n${lines}${overflow}`;

        const buildPanel = (color) => [
            new ContainerBuilder().setAccentColor(color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL))
                ),
        ];

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildPanel(CYCLE_COLORS[0]),
            allowedMentions: { parse: [] },
        });

        // Cycle colours for 60 seconds
        startColorCycle(sent, (color) => buildPanel(color), 60_000);

        return sent;
    }
};
