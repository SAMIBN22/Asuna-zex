import {
    SlashCommandBuilder,
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

// ── Constants ─────────────────────────────────────────────────────────────────
const COOLDOWN_MS   = 5_000;
const cooldowns     = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard-text')
        .setDescription('Shows the server Text Experience leaderboard'),

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const now = Date.now();
        const expiry = cooldowns.get(userId);
        if (expiry && now < expiry) {
            const left = Math.ceil((expiry - now) / 1000);
            return interaction.reply({ content: ` Please wait **${left}s** before using this command again.`, ephemeral: true });
        }
        cooldowns.set(userId, now + COOLDOWN_MS);

        const guild = interaction.guild;
        await interaction.deferReply();

        try {
            const allProfiles = await Profile.find({ guildId: guild.id, textTotalXp: { $gt: 0 } })
                .sort({ textTotalXp: -1 })
                .limit(200)
                .lean();

            if (allProfiles.length === 0) {
                return interaction.editReply({ content: ' No text activity has been recorded in this server yet.' });
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
            const sentMsg = await interaction.editReply({ files: [attachment], components: [buildRow(page)] });

            const collector = sentMsg.createMessageComponentCollector({ time: 10 * 60 * 1000 });

            collector.on('collect', async (btnInteraction) => {
                if (btnInteraction.customId === 'lbtext_mystats') {
                    const profile = await Profile.getProfile(btnInteraction.user.id, guild.id);
                    const rank = await Profile.getTextRank(btnInteraction.user.id, guild.id);
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

                    return btnInteraction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    });
                }

                if (btnInteraction.user.id !== interaction.user.id) {
                    return btnInteraction.reply({ content: ' Only the person who ran this command can change pages.', ephemeral: true });
                }

                if (btnInteraction.customId === 'lbtext_prev') page = Math.max(0, page - 1);
                if (btnInteraction.customId === 'lbtext_next') page = Math.min(totalPages - 1, page + 1);

                await btnInteraction.deferUpdate();
                const newAttachment = await renderPage(page);
                await sentMsg.edit({ files: [newAttachment], components: [buildRow(page)] });
            });

            collector.on('end', async () => {
                try {
                    await sentMsg.edit({ components: [] });
                } catch {}
            });
        } catch (err) {
            console.error('[LeaderboardText] Error:', err);
            await interaction.editReply({ content: ' Failed to build the leaderboard. Please try again.' });
        }
    },
};
