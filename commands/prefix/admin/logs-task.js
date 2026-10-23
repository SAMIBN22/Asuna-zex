/**
 * &logs-task [@user]
 * Displays the staff task log for the server (or a specific member).
 * Shows the last 15 tasks, paginated with buttons.
 */
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import StaffTask from '../../../models/staffTask.js';
import { startColorCycle, CYCLE_COLORS } from '../../../utils/colorCycler.js';

const PER_PAGE = 8;

const div  = (large = false) => new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);

// ── Category badge colours ─────────────────────────────────────────────────────
const CATEGORY_ICON = {
    moderation: '',
    support:    '',
    general:    '',
    event:      '',
    setup:      '',
    warn:       '',
    ticket:     '',
    voice:      '',
};

function catIcon(cat = 'General') {
    return CATEGORY_ICON[cat.toLowerCase()] ?? '';
}

function fmtTime(date) {
    return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`;
}

// ── Build the panel container ─────────────────────────────────────────────────
async function buildPanel({ guild, client, tasks, total, page, totalPages, filterMember, accent, emojis }) {
    const star      = emojis?.star || '';
    const guildIcon = guild.iconURL({ extension: 'png', size: 128 }) ??
                      client.user.displayAvatarURL({ extension: 'png' });

    // resolve display names once
    const resolved = await Promise.all(tasks.map(async (t) => {
        const member = await guild.members.fetch(t.userId).catch(() => null);
        return {
            ...t,
            displayName: member?.displayName ?? member?.user?.username ?? `<@${t.userId}>`,
            avatarURL:   member?.user?.displayAvatarURL({ extension: 'png', size: 64 }) ?? guildIcon,
        };
    }));

    const headerTitle = filterMember
        ? `  Task Log — ${filterMember.displayName}`
        : `  Staff Task Log`;

    const headerSub = filterMember
        ? `Showing tasks logged by **${filterMember.displayName}** · Total: **${total}**`
        : `All staff tasks in **${guild.name}** · Total: **${total}**`;

    const container = new ContainerBuilder().setAccentColor(accent)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${star} | ${headerTitle}\n` +
                    `> ${headerSub}\n` +
                    `> Page **${page + 1}** of **${totalPages || 1}**`
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(
                    filterMember?.user?.displayAvatarURL({ extension: 'png', size: 128 }) ?? guildIcon
                ))
        )
        .addSeparatorComponents(div(true));

    if (!resolved.length) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `>  No tasks have been logged yet.\n` +
            `> Staff members can log tasks with **\`&task <description>\`**.`
        ));
        return container;
    }

    // Build task list as a single text block (avoids hitting the 40-component cap)
    const lines = resolved.map((t, i) => {
        const globalRank = page * PER_PAGE + i + 1;
        const icon = catIcon(t.category);
        const who  = filterMember ? '' : ` · **${t.displayName}**`;
        return (
            `**${globalRank}.** ${icon} \`${t.category}\`${who}\n` +
            `> ${t.description}\n` +
            `> -# ${fmtTime(t.createdAt)}`
        );
    });

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(lines.join('\n\n'))
    );

    container
        .addSeparatorComponents(div(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `-# ${star} Use \`&task <description>\` to log a new task · ${guild.name}`
        ));

    return container;
}

// ── Command ───────────────────────────────────────────────────────────────────
export default {
    name:        'logs-task',
    aliases:     ['tasklog', 'tasklogs', 'logtasks', 'stafflogs'],
    description: 'View the staff task log. Use @mention to filter by member.',
    category:    'Admin',
    usage:       '&logs-task [@user]',

    async execute(message, args, client) {
        const theme  = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};
        const guild  = message.guild;
        const guildId = guild.id;

        // ── Permission: role must be higher than the bot's highest role ─────
        const botHighest    = guild.members.me.roles.highest.position;
        const memberHighest = message.member.roles.highest.position;
        const isOwner       = guild.ownerId === message.author.id;

        if (!isOwner && memberHighest <= botHighest) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFF4444)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##   Access Denied\n` +
                            `> This command is restricted to members whose role is **above the bot's role** in the server hierarchy.\n` +
                            `> Ask a server admin to grant you a higher role.`
                        )),
                ],
            });
        }

        // ── Resolve optional @user filter ─────────────────────────────────────
        // Accepts: @mention, raw user ID (17-20 digits), or display/username text
        let filterMember = null;
        let filterUserId = null;

        if (args[0]) {
            // Strip mention syntax → bare snowflake
            const raw = args[0].replace(/^<@!?(\d+)>$/, '$1');

            if (/^\d{17,20}$/.test(raw)) {
                // ID path — cache first, then API fetch
                filterMember =
                    guild.members.cache.get(raw) ||
                    await guild.members.fetch(raw).catch(() => null);
            } else {
                // Name search in cache (display name or username, case-insensitive)
                const name = args.join(' ').toLowerCase().trim();
                filterMember = guild.members.cache.find(m =>
                    m.displayName.toLowerCase().includes(name) ||
                    m.user.username.toLowerCase().includes(name)
                ) ?? null;
            }

            if (filterMember) filterUserId = filterMember.id;
        }

        // ── Initial fetch ─────────────────────────────────────────────────────
        const query    = filterUserId ? { guildId, userId: filterUserId } : { guildId };
        const total    = await StaffTask.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
        let page = 0;

        const fetchPage = (p) =>
            StaffTask.find(query)
                .sort({ createdAt: -1 })
                .skip(p * PER_PAGE)
                .limit(PER_PAGE)
                .lean();

        const firstTasks  = await fetchPage(0);
        const firstPanel  = await buildPanel({
            guild, client,
            tasks: firstTasks,
            total, page: 0, totalPages,
            filterMember, accent, emojis,
        });

        const buildButtons = (p) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lt_prev')
                .setLabel('  Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p === 0),
            new ButtonBuilder()
                .setCustomId('lt_page')
                .setLabel(`Page ${p + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('lt_next')
                .setLabel('Next  ')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('lt_today')
                .setLabel('  Today')
                .setStyle(ButtonStyle.Primary),
        );

        // Track current view state so the colour cycler rebuilds the right page
        const viewState = { tasks: firstTasks, total, page: 0, totalPages };

        const buildCurrent = async (color) => {
            const panel = await buildPanel({
                guild, client,
                tasks:      viewState.tasks,
                total:      viewState.total,
                page:       viewState.page,
                totalPages: viewState.totalPages,
                filterMember, accent: color, emojis,
            });
            return [panel, buildButtons(viewState.page)];
        };

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [firstPanel, buildButtons(0)],
            allowedMentions: { parse: [] },
        });

        const stopCycle = startColorCycle(sent, (color) => buildCurrent(color));

        // ── Collector ─────────────────────────────────────────────────────────
        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time:   10 * 60_000,
        });

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            if (interaction.customId === 'lt_prev') viewState.page = Math.max(0, viewState.page - 1);
            if (interaction.customId === 'lt_next') viewState.page = Math.min(viewState.totalPages - 1, viewState.page + 1);

            // "Today" filter: override to show only today's tasks
            if (interaction.customId === 'lt_today') {
                const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
                const todayQuery = { ...query, createdAt: { $gte: todayStart } };
                const todayTasks = await StaffTask.find(todayQuery).sort({ createdAt: -1 }).lean();
                viewState.tasks      = todayTasks.slice(0, PER_PAGE);
                viewState.total      = todayTasks.length;
                viewState.page       = 0;
                viewState.totalPages = Math.max(1, Math.ceil(todayTasks.length / PER_PAGE));
            } else {
                viewState.tasks = await fetchPage(viewState.page);
            }

            const panel = await buildPanel({
                guild, client,
                tasks:      viewState.tasks,
                total:      viewState.total,
                page:       viewState.page,
                totalPages: viewState.totalPages,
                filterMember, accent, emojis,
            });
            await sent.edit({ components: [panel, buildButtons(viewState.page)] });
        });

        collector.on('end', async () => {
            stopCycle();
            try {
                const panel = await buildPanel({
                    guild, client,
                    tasks:      viewState.tasks,
                    total:      viewState.total,
                    page:       viewState.page,
                    totalPages: viewState.totalPages,
                    filterMember, accent, emojis,
                });
                await sent.edit({ components: [panel] });
            } catch {}
        });
    },
};
