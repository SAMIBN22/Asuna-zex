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
import RankSystemConfig from '../../../models/rankSystemConfig.js';
import UserRankTime     from '../../../models/userRankTime.js';
import { getTimeInSeconds } from '../../../lib/rankCore.js';

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
        .setName('dirank-user')
        .setDescription('Decrease a user\'s rank level')
        .addUserOption(o =>
            o.setName('user').setDescription('Target user').setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName('levels').setDescription('Levels to remove').setRequired(true).setMinValue(1)
        ),

    async execute(interaction, client) {
        const allowed =
            interaction.guild.ownerId === interaction.user.id ||
            (client.config.devIds || []).includes(interaction.user.id) ||
            interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!allowed) {
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: ' You need **Manage Server** permission.' });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const theme  = await client.themeManager.getTheme(interaction.guild.id);
        const star   = theme.emojis?.star || '';
        const user   = interaction.options.getUser('user');
        const levels = interaction.options.getInteger('levels');
        const guildId = interaction.guild.id;

        const cfg        = await RankSystemConfig.getForGuild(guildId);
        const timePerLvl = getTimeInSeconds(cfg.timeAmount, cfg.timeUnit);
        const timeToRem  = levels * timePerLvl;

        const data     = await UserRankTime.get(user.id, guildId);
        const oldLevel = data.level;
        data.level     = Math.max(0, data.level - levels);
        data.totalTime = Math.max(0, data.totalTime - timeToRem);
        await data.save();

        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [card(client, theme, 'Rank Decreased', [
                `> ${star} **User:** <@${user.id}>`,
                `> ${star} **Levels removed:** ${levels}`,
                `> ${star} **Old level:** ${oldLevel}  →  **New level:** ${data.level}`,
            ])],
        });
    },
};
