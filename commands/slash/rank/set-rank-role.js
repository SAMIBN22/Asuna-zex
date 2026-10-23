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
        .setName('set-rank-role')
        .setDescription('Set the role required to participate in the rank system')
        .addRoleOption(o =>
            o.setName('role')
                .setDescription('Role that enables rank tracking')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const allowed =
            interaction.guild.ownerId === interaction.user.id ||
            (client.config.devIds || []).includes(interaction.user.id) ||
            interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!allowed) {
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: ' You need **Manage Server** permission.' });
        }

        const theme = await client.themeManager.getTheme(interaction.guild.id);
        const star  = theme.emojis?.star || '';
        const role  = interaction.options.getRole('role');

        const cfg = await RankSystemConfig.getForGuild(interaction.guild.id);
        cfg.rankRole = role.id;
        cfg.enabled  = true;
        await cfg.save();

        return interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [card(client, theme, 'Rank Role Set', [
                `> ${star} **Role:** ${role}`,
                `> ${star} Members with this role will have their activity tracked.`,
                `> ${star} The rank system has been **enabled** automatically.`,
            ])],
        });
    },
};
