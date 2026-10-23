import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import RankSystemConfig        from '../../../models/rankSystemConfig.js';
import { getTimeInSeconds, formatTime } from '../../../lib/rankCore.js';

const div = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function card(client, theme, title, lines) {
    const avatar = client.user?.displayAvatarURL({ extension: 'png', size: 256 }) || '';
    return new ContainerBuilder().setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${theme.emojis?.title || ''} __${title}__`
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar))
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
}

export default {
    data: new SlashCommandBuilder()
        .setName('set-rank-time')
        .setDescription('Set the time required per rank level')
        .addIntegerOption(o =>
            o.setName('time').setDescription('Amount of time').setRequired(true).setMinValue(1)
        )
        .addStringOption(o =>
            o.setName('unit').setDescription('Time unit').setRequired(true)
                .addChoices(
                    { name: 'Seconds', value: 'second' },
                    { name: 'Minutes', value: 'minute' },
                    { name: 'Hours',   value: 'hour'   },
                    { name: 'Days',    value: 'day'    },
                )
        ),

    async execute(interaction, client) {
        const allowed =
            interaction.guild.ownerId === interaction.user.id ||
            (client.config.devIds || []).includes(interaction.user.id) ||
            interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!allowed) {
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: ' You need **Manage Server** permission.' });
        }

        const theme  = await client.themeManager.getTheme(interaction.guild.id);
        const star   = theme.emojis?.star || '';
        const time   = interaction.options.getInteger('time');
        const unit   = interaction.options.getString('unit');
        const unitLabel = { second: 'second(s)', minute: 'minute(s)', hour: 'hour(s)', day: 'day(s)' }[unit];

        const cfg = await RankSystemConfig.getForGuild(interaction.guild.id);
        cfg.timeAmount = time;
        cfg.timeUnit   = unit;
        await cfg.save();

        const seconds = getTimeInSeconds(time, unit);

        return interaction.reply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [card(client, theme, 'Rank Time Set', [
                `> ${star} **Time per level:** ${time} ${unitLabel}`,
                `> ${star} **Total seconds:** ${formatTime(seconds)}`,
            ])],
        });
    },
};
