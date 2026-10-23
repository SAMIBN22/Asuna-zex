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
        .setName('setupverif')
        .setDescription('Configure the verification system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option.setName('verificator')
                .setDescription('Role that can verify members')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('member')
                .setDescription('Role to assign after verification')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('unverified')
                .setDescription('Role to remove after verification')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('logs')
                .setDescription('Channel to log verification events')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('female')
                .setDescription('Optional female role')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('voice')
                .setDescription('Voice channel for verification')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Category for verification channels')
                .setRequired(false)),

    async execute(interaction, client) {
        await interaction.deferReply();
        const theme = await client.themeManager.getTheme(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({
                components: [createResponse(client, "error", "Permission Denied", "You don't have permission to use this command.", theme)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const verificatorRole = interaction.options.getRole('verificator');
        const memberRole = interaction.options.getRole('member');
        const femaleRole = interaction.options.getRole('female');
        const removedRole = interaction.options.getRole('unverified');
        const logsChannel = interaction.options.getChannel('logs');
        const voiceChannel = interaction.options.getChannel('voice');
        const category = interaction.options.getChannel('category');

        const updateData = {
            verificatorsRoleIds: [verificatorRole.id],
            verifiedRoleId: memberRole.id,
            unverifiedRoleId: removedRole.id,
            verifyLogChannelId: logsChannel.id
        };

        if (femaleRole) updateData.femaleRoleId = femaleRole.id;
        if (voiceChannel) updateData.verifyVoiceChannelId = voiceChannel.id;
        if (category) updateData.verifyCategoryId = category.id;

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            updateData,
            { upsert: true, new: true }
        );

        const successContent =
            `> ${theme.emojis.star} **Verificator Role:** ${verificatorRole}\n` +
            `> ${theme.emojis.star} **Member Role:** ${memberRole}\n` +
            `> ${theme.emojis.star} **Unverified Role:** ${removedRole}\n` +
            `> ${theme.emojis.star} **Logs Channel:** ${logsChannel}` +
            (femaleRole ? `\n> ${theme.emojis.star} **Female Role:** ${femaleRole}` : '') +
            (voiceChannel ? `\n> ${theme.emojis.star} **Voice Channel:** ${voiceChannel}` : '') +
            (category ? `\n> ${theme.emojis.star} **Category:** ${category}` : '');

        await interaction.editReply({
            components: [createResponse(client, "success", "GuildConfig System Configured", successContent, theme)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};