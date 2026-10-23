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
    const c = new ContainerBuilder().setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${theme.emojis?.title || ''} __${title}__`
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar))
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    return c;
}

function isOwnerOrDev(interaction, client) {
    return (
        interaction.guild.ownerId === interaction.user.id ||
        (client.config.devIds || []).includes(interaction.user.id) ||
        interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    );
}

export default {
    data: new SlashCommandBuilder()
        .setName('rank-toggle')
        .setDescription('Enable or disable the rank system')
        .addStringOption(o =>
            o.setName('action')
                .setDescription('Enable or disable the rank system')
                .setRequired(true)
                .addChoices(
                    { name: ' Enable',  value: 'enable'  },
                    { name: ' Disable', value: 'disable' },
                )
        ),

    async execute(interaction, client) {
        if (!isOwnerOrDev(interaction, client)) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: ' You need **Manage Server** permission to use this command.',
            });
        }

        const theme  = await client.themeManager.getTheme(interaction.guild.id);
        const star   = theme.emojis?.star || '';
        const action = interaction.options.getString('action');
        const cfg    = await RankSystemConfig.getForGuild(interaction.guild.id);

        if (action === 'enable') {
            if (cfg.enabled) {
                return interaction.reply({
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                    components: [card(client, theme, 'Already Enabled', [
                        `> ${star} The rank system is **already enabled** in this server.`,
                    ])],
                });
            }
            cfg.enabled = true;
            await cfg.save();
            return interaction.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [card(client, theme, 'Rank System Enabled', [
                    `> ${star} The rank system is now **active**.`,
                    `> ${star} Users earn rank time by sending messages and joining voice channels.`,
                    `> ${star} Use \`/set-rank-time\` to configure time per level.`,
                ])],
            });
        }

        if (cfg.enabled === false) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [card(client, theme, 'Already Disabled', [
                    `> ${star} The rank system is **already disabled** in this server.`,
                ])],
            });
        }
        cfg.enabled = false;
        await cfg.save();
        return interaction.reply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [card(client, theme, 'Rank System Disabled', [
                `> ${star} The rank system is now **inactive**.`,
                `> ${star} Users will no longer earn rank time.`,
            ])],
        });
    },
};
