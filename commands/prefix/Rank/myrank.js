import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import RankSystemConfig           from '../../../models/rankSystemConfig.js';
import UserRankTime               from '../../../models/userRankTime.js';
import { buildRankCard }          from '../../../lib/rankCore.js';

export default {
    name:        'myrank',
    aliases:     ['rank', 'rankcard'],
    description: 'View your current rank and progress',
    category:    'Rank',
    usage:       '&myrank [@user]',

    async execute(message, args, client) {
        const target = (await resolveMember(message, args[0])) || message.member;
        const guildId = message.guild.id;

        const cfg = await RankSystemConfig.getForGuild(guildId);

        if (!cfg.enabled) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '##  Rank System Disabled\n' +
                            '> The rank system is not enabled in this server.\n' +
                            '> Ask an admin to use `/rank-toggle` to enable it.'
                        )
                    ),
                ],
            });
        }

        // Check required role
        if (cfg.rankRole) {
            const member = await message.guild.members.fetch(target.id).catch(() => null);
            if (member && !member.roles.cache.has(cfg.rankRole)) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '##  Missing Required Role\n' +
                                `> <@${target.id}> does not have the required role to participate in the rank system.`
                            )
                        ),
                    ],
                });
            }
        }

        const loading = await message.reply({ content: ' Building rank card...' });

        try {
            const member = await message.guild.members.fetch(target.id).catch(() => null);
            if (!member) {
                await loading.edit({ content: ' Could not find that member in this server.' });
                return;
            }

            const user = await UserRankTime.get(target.id, guildId);
            const buf  = await buildRankCard(member, user, cfg);

            await loading.edit({
                content: null,
                files: [new AttachmentBuilder(buf, { name: 'rank.png' })],
            });
        } catch (err) {
            console.error('[myrank] Error:', err.message);
            await loading.edit({
                content: null,
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '##  Error\n> Failed to generate rank card. Please try again.'
                        )
                    ),
                ],
            });
        }
    },
};
