import {
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import Profile from '../../../models/profile.js';
import { buildTextLbCard, fetchEntries, fmtNum, ROWS_PER_PAGE } from '../../../lib/textLeaderboardCard.js';

const COOLDOWN_MS = 5_000;
const cooldowns   = new Map();

export default {
    name: 'lb',
    aliases: ['leaderboard-text', 'textlb', 'tlb'],
    description: 'Shows the server Text Experience leaderboard',
    category: 'General',
    usage: '&lb',
    noPrefix: true,

    async execute(message, args, client) {
        const userId = message.author.id;
        const now = Date.now();
        const expiry = cooldowns.get(userId);
        if (expiry && now < expiry) {
            const left = Math.ceil((expiry - now) / 1000);
            return message.reply(` Please wait **${left}s** before using this command again.`);
        }
        cooldowns.set(userId, now + COOLDOWN_MS);

        const guild = message.guild;
        const loading = await message.reply(' Building leaderboard…');

        try {
            const allProfiles = await Profile.find({ guildId: guild.id, textTotalXp: { $gt: 0 } })
                .sort({ textTotalXp: -1 })
                .limit(200)
                .lean();

            if (allProfiles.length === 0) {
                return loading.edit({ content: ' No text activity has been recorded in this server yet.' });
            }

            allProfiles.forEach((p, i) => { p._rank = i + 1; });

            const totalPages = Math.ceil(allProfiles.length / ROWS_PER_PAGE);
            let page = 0;

            const renderPage = async (p) => {
                const start = p * ROWS_PER_PAGE;
                const pageProfiles = allProfiles.slice(start, start + ROWS_PER_PAGE);
                const entries = await fetchEntries(guild, pageProfiles);
                const buffer = await buildTextLbCard({
                    guild,
                    entries,
                    page: p,
                    totalPages,
                    totalTracked: allProfiles.length,
                });
                return new AttachmentBuilder(buffer, { name: 'leaderboard-text.png' });
            };

            const buildRow = (p) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lbtext_prev')
                    .setLabel(' Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('lbtext_mystats')
                    .setLabel('My Text XP')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('lbtext_next')
                    .setLabel('Next ')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === totalPages - 1)
            );

            const attachment = await renderPage(page);
            await loading.edit({ content: null, files: [attachment], components: [buildRow(page)] });

            const sentMsg = await message.channel.messages.fetch(loading.id);
            const collector = sentMsg.createMessageComponentCollector({ time: 10 * 60 * 1000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'lbtext_mystats') {
                    const profile = await Profile.getProfile(interaction.user.id, guild.id);
                    const rank = await Profile.getTextRank(interaction.user.id, guild.id);
                    const required = Profile.getRequiredTrackXp(profile.textLevel || 1);

                    const lines = [
                        `#  __Your Text Stats__`,
                        ``,
                        `> **__Level:__** \`${profile.textLevel || 1}\``,
                        `> **__Server Rank:__** \`#${rank}\``,
                        `> **__Total Text XP:__** \`${fmtNum(profile.textTotalXp || 0)}\``,
                        `> **__Progress:__** \`${fmtNum(profile.textXp || 0)} / ${fmtNum(required)}\` toward next level`,
                    ];

                    const container = new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines.join('\n'))
                    );

                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    });
                }

                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: ' Only the person who ran this command can change pages.', ephemeral: true });
                }

                if (interaction.customId === 'lbtext_prev') page = Math.max(0, page - 1);
                if (interaction.customId === 'lbtext_next') page = Math.min(totalPages - 1, page + 1);

                await interaction.deferUpdate();
                const newAttachment = await renderPage(page);
                await sentMsg.edit({ files: [newAttachment], components: [buildRow(page)] });
            });

            collector.on('end', async () => {
                try {
                    await sentMsg.edit({ components: [] });
                } catch {}
            });
        } catch (err) {
            console.error('[Lb] Error:', err);
            await loading.edit({ content: ' Failed to build the leaderboard. Please try again.' });
        }
    },
};
