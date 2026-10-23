import {
    SlashCommandBuilder,
    ChannelType,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

function isOwnerOrDev(interaction, client) {
    return interaction.guild.ownerId === interaction.user.id ||
        client.config?.devIds?.includes(interaction.user.id);
}

function buildPanel(theme, botAvatar, voiceCategory, chatCategory, joinChannel) {
    const container = new ContainerBuilder().setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##   VIP Room — Setup Preview\n\n` +
                        `A new **Join to Create** system has been prepared for VIP rooms.\n\n` +
                        `> **Voice Category:** ${voiceCategory}\n` +
                        `> **Chat Category:** ${chatCategory}\n` +
                        `> **Join to Create Channel:** ${joinChannel}\n\n` +
                        `-# Press **Save** to activate this setup, or **Cancel** to discard it.`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatar))
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vip_setup_save_${voiceCategory.id}_${chatCategory.id}_${joinChannel.id}`)
            .setLabel('Save').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`vip_setup_cancel_${voiceCategory.id}_${chatCategory.id}_${joinChannel.id}`)
            .setLabel('Cancel').setStyle(ButtonStyle.Danger),
    );

    return { container, row };
}

export default {
    data: new SlashCommandBuilder()
        .setName('vip-setup')
        .setDescription('Set up the VIP Room join-to-create system (Server Owner only)'),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const theme = await client.themeManager.getTheme(interaction.guild.id);

        if (!isOwnerOrDev(interaction, client)) {
            return interaction.editReply({ content: '>  Only the server owner can use this command.' });
        }

        const guild = interaction.guild;

        try {
            const voiceCategory = await guild.channels.create({
                name: ' VIP Voice Rooms',
                type: ChannelType.GuildCategory,
            });

            const chatCategory = await guild.channels.create({
                name: ' VIP Chat Rooms',
                type: ChannelType.GuildCategory,
            });

            const joinChannel = await guild.channels.create({
                name: ' Join to Create',
                type: ChannelType.GuildVoice,
                parent: voiceCategory.id,
            });

            const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });
            const { container, row } = buildPanel(theme, botAvatar, voiceCategory, chatCategory, joinChannel);

            await interaction.editReply({
                components: [container, row],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error('[vip-setup] Error:', err);
            await interaction.editReply({ content: '>  Failed to create the VIP Room setup. Check my permissions and try again.' });
        }
    }
};
