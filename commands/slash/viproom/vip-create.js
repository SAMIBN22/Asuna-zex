import {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} from 'discord.js';

function isOwnerOrDev(interaction, client) {
    return interaction.guild.ownerId === interaction.user.id ||
        client.config?.devIds?.includes(interaction.user.id);
}

export default {
    data: new SlashCommandBuilder()
        .setName('vip-create')
        .setDescription('Create a dedicated VIP voice + chat room for a member (Server Owner only)'),

    async execute(interaction, client) {
        if (!isOwnerOrDev(interaction, client)) {
            return interaction.reply({ content: '>  Only the server owner can use this command.', flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
            .setCustomId('vip_create_modal')
            .setTitle('Create VIP Room');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('vip_target_user')
                    .setLabel('Member ID or @mention')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('123456789012345678')
                    .setRequired(true)
                    .setMaxLength(32)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('vip_voice_name')
                    .setLabel('Voice Room Name')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("e.g. King's Lounge")
                    .setRequired(true)
                    .setMaxLength(90)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('vip_chat_name')
                    .setLabel('Chat Room Name')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("e.g. kings-lounge-chat")
                    .setRequired(true)
                    .setMaxLength(90)
            ),
        );

        return interaction.showModal(modal);
    }
};
