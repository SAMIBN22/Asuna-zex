import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { buildMarriageContainer, getPartnerId } from '../../../lib/marriage.js';

export default {
    name: 'divorce',
    aliases: ['unmarry'],
    description: 'End your marriage',
    category: 'Marriage',
    usage: '&divorce',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const marriage = await Marriage.findByUser(guildId, message.author.id);
        if (!marriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Divorce', 'You are not currently married.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const partnerId = getPartnerId(marriage, message.author.id);
        const partner = await client.users.fetch(partnerId).catch(() => null);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('divorce_confirm').setLabel('Confirm Divorce').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('divorce_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );

        const sent = await message.reply({
            components: [
                buildMarriageContainer(
                    theme,
                    'Divorce Confirmation',
                    `>  Are you sure you want to divorce ${partner ? partner : 'your partner'}?\n> This will not remove any children records.\n> *This confirmation expires in 30 seconds.*`,
                    null,
                    client
                ),
                row
            ],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = sent.createMessageComponentCollector({ time: 30000, max: 1, filter: (i) => i.user.id === message.author.id });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'divorce_confirm') {
                await Marriage.deleteOne({ _id: marriage._id });
                return interaction.update({
                    components: [buildMarriageContainer(theme, 'Divorce Finalized', `>  ${message.author} and ${partner ? partner : 'their partner'} are no longer married.`, null, client)]
                });
            }
            return interaction.update({
                components: [buildMarriageContainer(theme, 'Divorce Cancelled', '> Your marriage remains intact.', null, client)]
            });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                sent.edit({
                    components: [buildMarriageContainer(theme, 'Divorce Confirmation', '>  Confirmation expired. Your marriage remains intact.', null, client)]
                }).catch(() => {});
            }
        });
    }
};
