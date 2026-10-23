import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import RankSystemConfig from '../../../models/rankSystemConfig.js';
import UserRankTime     from '../../../models/userRankTime.js';
import { formatTime }   from '../../../lib/rankCore.js';

export default {
    name:        'topranks',
    aliases:     ['ranktop', 'rankboard', 'rankleaderboard'],
    description: 'Show the top users by level and activity time',
    category:    'Rank',
    usage:       '&topranks',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const cfg     = await RankSystemConfig.getForGuild(guildId);

        if (!cfg.enabled) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '##  Rank System Disabled\n' +
                            '> The rank system is not enabled in this server.'
                        )
                    ),
                ],
            });
        }

        const allUsers = await UserRankTime.find({ guildId }).lean();

        if (!allUsers.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '##  Top Ranks\n> No users have earned rank time yet.'
                        )
                    ),
                ],
            });
        }

        // Resolve usernames
        const resolveUsername = async (userId) => {
            try {
                const m = await message.guild.members.fetch(userId);
                return m.user.username;
            } catch {
                return `Unknown (${userId.slice(0, 6)}…)`;
            }
        };

        const medal = (i) => ['', '', ''][i] ?? `${i + 1}.`;

        const byLevel = [...allUsers].sort((a, b) =>
            b.level !== a.level ? b.level - a.level : b.totalTime - a.totalTime
        ).slice(0, 10);

        const byTime = [...allUsers].sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);

        const [levelList, timeList] = await Promise.all([
            Promise.all(byLevel.map(async (u, i) => {
                const name = await resolveUsername(u.userId);
                return `${medal(i)} **${name}** — Level ${u.level} (${formatTime(u.totalTime)})`;
            })),
            Promise.all(byTime.map(async (u, i) => {
                const name = await resolveUsername(u.userId);
                return `${medal(i)} **${name}** — ${formatTime(u.totalTime)} (Level ${u.level})`;
            })),
        ]);

        const buildEmbed = (mode = 'both') => {
            const embed = new EmbedBuilder()
                .setTitle(' Top Ranks Leaderboard')
                .setColor('#FFD700')
                .setFooter({ text: `Total tracked users: ${allUsers.length}` })
                .setTimestamp();

            if (mode === 'level' || mode === 'both') {
                embed.addFields({
                    name: ' Top 10 by Level',
                    value: levelList.join('\n') || 'No data',
                    inline: false,
                });
            }
            if (mode === 'time' || mode === 'both') {
                embed.addFields({
                    name: ' Top 10 by Time',
                    value: timeList.join('\n') || 'No data',
                    inline: false,
                });
            }
            return embed;
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tr_level').setLabel('By Level').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tr_time').setLabel('By Time').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tr_both').setLabel('Both').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tr_close').setLabel('Close').setStyle(ButtonStyle.Danger),
        );

        const msg = await message.channel.send({ embeds: [buildEmbed('both')], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && i.message.id === msg.id,
            time: 5 * 60_000,
        });

        collector.on('collect', async (i) => {
            try {
                await i.deferUpdate();
                if (i.customId === 'tr_close') {
                    await msg.edit({ components: [] });
                    return collector.stop();
                }
                const mode = i.customId.replace('tr_', '');
                await msg.edit({ embeds: [buildEmbed(mode)] });
            } catch {}
        });

        collector.on('end', async () => {
            try { await msg.edit({ components: [] }); } catch {}
        });
    },
};
