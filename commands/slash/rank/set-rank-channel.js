import {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import RankSystemConfig from '../../../models/rankSystemConfig.js';
import Profile          from '../../../models/profile.js';
import Warn             from '../../../models/warn.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const div  = (large = false) => new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);

function fmtVoice(secs) {
    secs = Math.max(0, Math.floor(secs || 0));
    if (!secs) return '—';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || !parts.length) parts.push(`${s}s`);
    return parts.join(' ');
}

function fmtNum(n) {
    return (n || 0).toLocaleString();
}

const MEDALS = ['', '', ''];
function medal(i) { return MEDALS[i] ?? `${i + 1}.`; }

// ── Leaderboard builder ───────────────────────────────────────────────────────
// Returns a sent Message (or throws). Builds & sends the panel to `channel`.

export async function sendRankLeaderboard(guild, channel, client) {
    const theme = await client.themeManager.getTheme(guild.id).catch(() => ({ color: 0x2b2d31 }));
    const accent = Number(theme.color) || 0x2b2d31;

    // Fetch top 7 by totalXp (Discord caps containers at 40 components;
    // each row with thumbnail costs ~4 components, so 7 rows = safe)
    const top = await Profile.find({ guildId: guild.id, totalXp: { $gt: 0 } })
        .sort({ totalXp: -1 })
        .limit(7)
        .lean();

    const guildIcon = guild.iconURL({ extension: 'png', size: 128 }) ?? client.user.displayAvatarURL({ extension: 'png' });

    // Header container
    const container = new ContainerBuilder().setAccentColor(accent)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  | Top Staff Leaderboard`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(guildIcon))
        )
        .addSeparatorComponents(div(true));

    if (!top.length) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> No activity has been recorded yet.\n> Members will appear here as they chat and join voice channels.`
            )
        );
        return channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // Fetch member info + warn counts in parallel
    const enriched = await Promise.all(top.map(async (p, i) => {
        const [member, warnCount] = await Promise.all([
            guild.members.fetch(p.userId).catch(() => null),
            Warn.countDocuments({ guildId: guild.id, userId: p.userId, active: true }).catch(() => 0),
        ]);

        const displayName = member?.displayName || member?.user?.username || `<@${p.userId}>`;
        const avatarURL   = member?.user?.displayAvatarURL({ extension: 'png', size: 128 })
                          ?? client.user.displayAvatarURL({ extension: 'png' });

        const voiceSecs   = p.voiceSeconds || (p.voiceMinutes || 0) * 60;
        const level       = p.level ?? 1;
        const xp          = p.xp ?? 0;
        const totalXp     = p.totalXp ?? 0;
        const required    = Profile.getRequiredXp ? Profile.getRequiredXp(level) : Math.floor(100 * Math.pow(1.5, level - 1));
        const toNext      = Math.max(0, required - xp);
        const rate        = required > 0 ? Math.round((xp / required) * 100) : 0;
        const msgs        = p.messageCount ?? 0;

        return { i, displayName, avatarURL, voiceSecs, level, totalXp, toNext, rate, warnCount, msgs };
    }));

    // Build a section per user
    for (const u of enriched) {
        const lines = [
            `**${medal(u.i)} ${u.displayName}**`,
            `> • **Score:** ${fmtNum(u.totalXp)} XP`,
            `> • **Total Voice:** ${fmtVoice(u.voiceSecs)}`,
            `> • **Messages:** ${fmtNum(u.msgs)}`,
            `> • **Rate:** ${u.rate}% to next level`,
            `> • **Warns:** ${u.warnCount}`,
            `> • **Points to Next Rank:** ${fmtNum(u.toNext)}`,
            `> • **Top Score:** ${fmtNum(u.totalXp)}`,
        ].join('\n');

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(u.avatarURL))
        );

        if (u.i < enriched.length - 1) {
            container.addSeparatorComponents(div(false));
        }
    }

    container.addSeparatorComponents(div(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-#  ${guild.name} · Top Staff Leaderboard · Updated just now`
            )
        );

    return channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
}

// ── Slash command ─────────────────────────────────────────────────────────────

export default {
    data: new SlashCommandBuilder()
        .setName('set-rank-channel')
        .setDescription('Set the rank-up notification channel and post the leaderboard there')
        .addChannelOption(o =>
            o.setName('channel')
                .setDescription('Channel for rank notifications and the leaderboard panel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const allowed =
            interaction.guild.ownerId === interaction.user.id ||
            (client.config?.devIds || []).includes(interaction.user.id) ||
            interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!allowed) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: ' You need **Manage Server** permission to use this command.',
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const theme   = await client.themeManager.getTheme(interaction.guild.id).catch(() => ({ color: 0x2b2d31, emojis: {} }));
        const accent  = Number(theme.color) || 0x2b2d31;
        const star    = theme.emojis?.star || '';
        const channel = interaction.options.getChannel('channel');

        // Save config
        const cfg = await RankSystemConfig.getForGuild(interaction.guild.id);
        cfg.rankChannel = channel.id;
        await cfg.save();

        // Send the leaderboard panel to the configured channel
        let posted = false;
        try {
            await sendRankLeaderboard(interaction.guild, channel, client);
            posted = true;
        } catch (err) {
            console.error('[set-rank-channel] Failed to post leaderboard:', err.message);
        }

        // Confirm to the admin (ephemeral)
        const confirmContainer = new ContainerBuilder().setAccentColor(accent)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${star} Rank Channel Configured\n\n` +
                        `> ${star} **Channel:** ${channel}\n` +
                        `> ${star} **Leaderboard posted:** ${posted ? ' Yes' : ' Failed — check bot permissions'}\n` +
                        `> ${star} Level-up notifications will be sent to ${channel}.`
                    ))
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(
                        interaction.guild.iconURL({ extension: 'png', size: 128 }) ||
                        client.user.displayAvatarURL({ extension: 'png' })
                    ))
            );

        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [confirmContainer],
        });
    },
};
