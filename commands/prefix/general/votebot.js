import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import config from '../../../config/config.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const VOTE_URL     = 'https://top.gg/bot/1513679894494711919?s=0f8f26ff9e605';
const COOLDOWN_MS  = 2 * 60 * 1000; // 2 minutes per user

// ─── Per-user cooldown map ────────────────────────────────────────────────────
const cooldowns = new Map();

function msToTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

export default {
    name: 'vote-bot',
    aliases: ['vote', 'votebot', 'upvote'],
    description: 'Vote for the bot on Top.gg and support its growth',
    category: 'General',
    usage: 'vote-bot',

    async execute(message, args, client) {
        const theme     = await client.themeManager.getTheme(message.guild.id);
        const accent    = client.themeManager.getRGBColor(theme.color);
        const star      = theme.emojis?.star  || '';
        const titleEmoji = config.helpEmojis?.title || theme.emojis?.title || '';

        // ── Cooldown check ────────────────────────────────────────────────────
        const now  = Date.now();
        const last = cooldowns.get(message.author.id);

        if (last && now - last < COOLDOWN_MS) {
            const remaining = msToTime(COOLDOWN_MS - (now - last));

            const cooldownContainer = new ContainerBuilder()
                .setAccentColor(accent)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `#  __Slow Down!__\n` +
                        `> ${star} You already voted recently.\n` +
                        `> ${star} Please wait **${remaining}** before using this command again.`
                    )
                );

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [cooldownContainer],
                allowedMentions: { parse: [] },
            });
        }

        // ── Set cooldown ──────────────────────────────────────────────────────
        cooldowns.set(message.author.id, now);

        // ── Build the vote panel ──────────────────────────────────────────────
        const botAvatar = client.user?.displayAvatarURL({ extension: 'png', size: 512 })
            || 'https://cdn.discordapp.com/embed/avatars/0.png';

        const voteContainer = new ContainerBuilder()
            .setAccentColor(accent)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${titleEmoji} __Vote for ${client.user.username}!__`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(botAvatar)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> ${star} **Support us** by casting your vote on **Top.gg**!\n` +
                    `> ${star} Voting helps the bot grow and reach more servers.\n` +
                    `> ${star} You can vote **once every 12 hours** on Top.gg.\n` +
                    `> ${star} Every vote is greatly appreciated — thank you! `
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Click the button below to open the voting page.`
                )
            );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Vote on Top.gg')
                .setEmoji({ name: 'efef', id: '1528077605688049664', animated: true })
                .setStyle(ButtonStyle.Link)
                .setURL(VOTE_URL)
        );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [voteContainer, actionRow],
            allowedMentions: { parse: [] },
        });
    },
};
