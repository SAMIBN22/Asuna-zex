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
import { getPanelBanner } from '../../../utils/panelBanner.js';

const createResponse = (client, type, header, content, theme, guild) => {
    return new ContainerBuilder()
        .setAccentColor(theme.color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                mediaGalleryItem => mediaGalleryItem
                    .setURL(getPanelBanner(guild, client, theme))
                    .setDescription('Warning System')
            )
        )
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis.title || ''} __${header}__\n` +
                        `${content}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                )
        );
};

export default {
    data: new SlashCommandBuilder()
        .setName('setupwarn')
        .setDescription('Configure the warn system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option.setName('first')
                .setDescription('Role to assign on first warning')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('second')
                .setDescription('Role to assign on second warning')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('last')
                .setDescription('Role to assign on last warning')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('warner')
                .setDescription('Role allowed to issue warnings')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('logs')
                .setDescription('Channel to log warning events')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply();
        const theme = await client.themeManager.getTheme(interaction.guild.id);
        const guild = interaction.guild;

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({
                components: [createResponse(client, "error", "Permission Denied", "You don't have permission to use this command.", theme, guild)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const firstRole = interaction.options.getRole('first');
        const secondRole = interaction.options.getRole('second');
        const lastRole = interaction.options.getRole('last');
        const warnerRole = interaction.options.getRole('warner');
        const logsChannel = interaction.options.getChannel('logs');

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            {
                firstWarnRoleId: firstRole.id,
                secondWarnRoleId: secondRole.id,
                lastWarnRoleId: lastRole.id,
                warnerRoleIds: [warnerRole.id],
                warnLogsChannelId: logsChannel.id
            },
            { upsert: true, new: true }
        );

        const successContent =
            `> ${theme.emojis.star} **__First Warning Role:__** ${firstRole}\n` +
            `> ${theme.emojis.star} **__Second Warning Role:__** ${secondRole}\n` +
            `> ${theme.emojis.star} **__Last Warning Role:__** ${lastRole}\n` +
            `> ${theme.emojis.star} **__Warner Role:__** ${warnerRole}\n` +
            `> ${theme.emojis.star} **__Logs Channel:__** ${logsChannel}`;

        await interaction.editReply({
            components: [createResponse(client, "success", "Warning System Configured", successContent, theme, guild)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
