import { resolveUser } from '../../../lib/resolveUser.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { pendingProposals, buildMarriageContainer } from '../../../lib/marriage.js';

export default {
    name: 'marry',
    aliases: ['propose'],
    description: 'Propose marriage to another user',
    category: 'Marriage',
    usage: '&marry <user>',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const target = await resolveUser(message, args[0], client);
        if (!target) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', 'Please mention a valid user to propose to.\n> **Usage:** `&marry <user>`', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (target.id === message.author.id) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', 'You cannot propose to yourself.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (target.bot) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', 'You cannot propose to a bot.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const [authorMarriage, targetMarriage] = await Promise.all([
            Marriage.findByUser(guildId, message.author.id),
            Marriage.findByUser(guildId, target.id)
        ]);

        if (authorMarriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', 'You are already married. Use `&divorce` first if you wish to remarry.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (targetMarriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', `${target.username} is already married to someone else.`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const proposalKey = `${guildId}:${target.id}`;
        if (pendingProposals.has(proposalKey)) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', `${target.username} already has a pending marriage proposal.`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('marry_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('marry_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        const sent = await message.reply({
            content: `${target}`,
            components: [
                buildMarriageContainer(
                    theme,
                    'Marriage Proposal',
                    `>  ${message.author} has proposed marriage to ${target}!\n> Do you accept?\n> *This proposal expires in 60 seconds.*`,
                    message.author.displayAvatarURL({ extension: 'png' }),
                    client
                ),
                row
            ],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: [target.id] }
        });

        pendingProposals.set(proposalKey, { proposerId: message.author.id, targetId: target.id, guildId });

        const collector = sent.createMessageComponentCollector({ time: 60000, max: 1, filter: (i) => i.user.id === target.id });

        collector.on('collect', async (interaction) => {
            pendingProposals.delete(proposalKey);

            if (interaction.customId === 'marry_accept') {
                const [existingA, existingB] = await Promise.all([
                    Marriage.findByUser(guildId, message.author.id),
                    Marriage.findByUser(guildId, target.id)
                ]);

                if (existingA || existingB) {
                    return interaction.update({
                        components: [buildMarriageContainer(theme, 'Marriage Proposal', 'This proposal is no longer valid — one of you is already married.', null, client)]
                    });
                }

                await Marriage.create({ guildId, users: [message.author.id, target.id], marriedAt: new Date() });

                return interaction.update({
                    components: [buildMarriageContainer(
                        theme,
                        'Marriage Confirmed',
                        `>  Congratulations! ${message.author} and ${target} are now married!`,
                        message.author.displayAvatarURL({ extension: 'png' }),
                        client
                    )],
                    content: ''
                });
            }

            return interaction.update({
                components: [buildMarriageContainer(theme, 'Marriage Proposal', `>  ${target.username} has declined the proposal.`, null, client)],
                content: ''
            });
        });

        collector.on('end', (collected) => {
            pendingProposals.delete(proposalKey);
            if (collected.size === 0) {
                sent.edit({
                    components: [buildMarriageContainer(theme, 'Marriage Proposal', '>  The proposal has expired.', null, client)],
                    content: ''
                }).catch(() => {});
            }
        });
    }
};
