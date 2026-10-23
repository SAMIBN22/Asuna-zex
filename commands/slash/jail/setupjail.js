import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    MessageFlags
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

const createResponse = (client, type, header, content, theme) => {
    const botAvatar = client.user?.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

    return new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title || ''} __${header}__\n` +
                        `${content}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(botAvatar)
                )
        );
};

export default {
    data: new SlashCommandBuilder()
        .setName('setupjail')
        .setDescription('Configure the jail system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option.setName('jailed')
                .setDescription('Role to assign when a user is jailed')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('hammer')
                .setDescription('Role allowed to use the jail command (hammer role)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('logs')
                .setDescription('Channel to log jail events')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply();
        const theme = await client.themeManager.getTheme(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({
                components: [createResponse(client, "error", "Permission Denied", "You don't have permission to use this command.", theme)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const jailedRole = interaction.options.getRole('jailed');
        const hammerRole = interaction.options.getRole('hammer');
        const logsChannel = interaction.options.getChannel('logs');

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            {
                jailRoleId: jailedRole.id,
                jailerRoleId: hammerRole.id,
                jailLogsChannelId: logsChannel.id
            },
            { upsert: true, new: true }
        );

        const successContent =
            `> ${theme.emojis.star} **Jailed Role:** ${jailedRole}\n` +
            `> ${theme.emojis.star} **Hammer Role:** ${hammerRole}\n` +
            `> ${theme.emojis.star} **Logs Channel:** ${logsChannel}`;

        await interaction.editReply({
            components: [createResponse(client, "success", "Jail System Configured", successContent, theme)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};